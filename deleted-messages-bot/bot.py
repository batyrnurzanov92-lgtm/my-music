"""Telegram Business bot that keeps copies of private messages and
reports to the account owner when a message is edited or deleted.

How it works:
- Telegram sends `business_message` for every new message in chats the bot
  can see. We store its text (or caption) in SQLite.
- On `edited_business_message` we send "was -> now" and update the copy.
- On `deleted_business_messages` Telegram sends only message IDs, so we look
  the text up in our database and send the saved copy to the owner.
"""

import html
import logging
import os
import sqlite3
from datetime import datetime

from dotenv import load_dotenv
from telegram import Message, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    BusinessConnectionHandler,
    BusinessMessagesDeletedHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
DB_PATH = os.getenv("DB_PATH", "messages.db")
NOTIFY_EDITS = os.getenv("NOTIFY_EDITS", "1") == "1"
# Messages older than this are removed from the database (0 = keep forever).
KEEP_DAYS = int(os.getenv("KEEP_DAYS", "30"))

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO
)
# httpx logs every request (including the URL with the token) at INFO level.
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("bot")


# ---------- database ----------

def db_connect(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,          -- business_connection_id
            owner_chat_id INTEGER NOT NULL,
            owner_user_id INTEGER NOT NULL,
            is_enabled INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
            connection_id TEXT NOT NULL,
            chat_id INTEGER NOT NULL,
            message_id INTEGER NOT NULL,
            sender TEXT,
            sender_id INTEGER,
            text TEXT,
            kind TEXT,                    -- text / photo / voice / ...
            file_id TEXT,
            date INTEGER,
            PRIMARY KEY (connection_id, chat_id, message_id)
        );
        """
    )
    return conn


def save_connection(conn, conn_id: str, owner_chat_id: int, owner_user_id: int,
                    enabled: bool) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO connections VALUES (?, ?, ?, ?)",
        (conn_id, owner_chat_id, owner_user_id, int(enabled)),
    )
    conn.commit()


def get_owner(conn, conn_id: str):
    """Return (owner_chat_id, owner_user_id) or None if not connected."""
    return conn.execute(
        "SELECT owner_chat_id, owner_user_id FROM connections "
        "WHERE id = ? AND is_enabled = 1",
        (conn_id,),
    ).fetchone()


def describe(msg: Message):
    """Return (kind, text, file_id) for a message."""
    text = msg.text or msg.caption or ""
    for kind in ("photo", "video", "voice", "video_note", "audio",
                 "document", "sticker", "animation"):
        media = getattr(msg, kind)
        if media:
            if kind == "photo":
                media = media[-1]  # largest size
            return kind, text, media.file_id
    return "text", text, None


def sender_name(msg: Message) -> str:
    user = msg.from_user
    if not user:
        return "?"
    name = user.full_name
    return f"{name} (@{user.username})" if user.username else name


def save_message(conn, msg: Message) -> None:
    kind, text, file_id = describe(msg)
    conn.execute(
        "INSERT OR REPLACE INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            msg.business_connection_id,
            msg.chat_id,
            msg.message_id,
            sender_name(msg),
            msg.from_user.id if msg.from_user else None,
            text,
            kind,
            file_id,
            int(msg.date.timestamp()),
        ),
    )
    conn.commit()


def get_message(conn, conn_id: str, chat_id: int, message_id: int):
    return conn.execute(
        "SELECT sender, text, kind, file_id, date, sender_id FROM messages "
        "WHERE connection_id = ? AND chat_id = ? AND message_id = ?",
        (conn_id, chat_id, message_id),
    ).fetchone()


def cleanup_old(conn) -> None:
    if KEEP_DAYS > 0:
        limit = int(datetime.now().timestamp()) - KEEP_DAYS * 86400
        conn.execute("DELETE FROM messages WHERE date < ?", (limit,))
        conn.commit()


# ---------- handlers ----------

def fmt_time(ts: int) -> str:
    return datetime.fromtimestamp(ts).strftime("%d.%m.%Y %H:%M")


async def on_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Привет! Подключи меня: Настройки → Telegram для бизнеса → Чат-боты.\n"
        "После этого я буду присылать сюда копии удалённых и изменённых "
        "сообщений из твоих личных чатов."
    )


async def on_connection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    bc = update.business_connection
    db = context.bot_data["db"]
    save_connection(db, bc.id, bc.user_chat_id, bc.user.id, bc.is_enabled)
    log.info("Business connection %s enabled=%s", bc.id, bc.is_enabled)
    text = ("✅ Бот подключён. Буду сохранять новые сообщения."
            if bc.is_enabled else "⛔ Бот отключён от аккаунта.")
    try:
        await context.bot.send_message(bc.user_chat_id, text)
    except Exception as exc:  # owner may not have pressed /start yet
        log.warning("Cannot message owner: %s", exc)


async def on_business_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    save_message(context.bot_data["db"], update.business_message)


async def on_edited(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    msg = update.edited_business_message
    db = context.bot_data["db"]
    old = get_message(db, msg.business_connection_id, msg.chat_id, msg.message_id)
    save_message(db, msg)
    owner = get_owner(db, msg.business_connection_id)
    # Skip unknown messages and the owner's own edits.
    if not (NOTIFY_EDITS and owner and old) or old[5] == owner[1]:
        return
    _, new_text, _ = describe(msg)
    if old[1] == new_text:
        return
    await context.bot.send_message(
        owner[0],
        f"✏️ <b>Изменено</b>\n"
        f"От: {html.escape(old[0])}\n"
        f"Было: {html.escape(old[1] or '—')}\n"
        f"Стало: {html.escape(new_text or '—')}",
        parse_mode=ParseMode.HTML,
    )


async def on_deleted(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    deleted = update.deleted_business_messages
    db = context.bot_data["db"]
    owner = get_owner(db, deleted.business_connection_id)
    if not owner:
        return
    owner_chat, owner_user = owner
    for mid in deleted.message_ids:
        row = get_message(db, deleted.business_connection_id, deleted.chat.id, mid)
        if not row:
            continue  # message arrived before the bot was connected
        sender, text, kind, file_id, date, sender_id = row
        if sender_id == owner_user:
            continue  # the owner deleted their own message
        caption = (
            f"🗑 <b>Удалено</b>\n"
            f"От: {html.escape(sender)}\n"
            f"Когда отправлено: {fmt_time(date)}\n"
            + (f"Тип: {kind}\n" if kind != "text" else "")
            + f"Текст: {html.escape(text or '—')}"
        )
        await context.bot.send_message(owner_chat, caption, parse_mode=ParseMode.HTML)
        if file_id:
            await send_media_copy(context, owner_chat, kind, file_id)


async def send_media_copy(context, chat_id: int, kind: str, file_id: str) -> None:
    try:
        # e.g. kind "photo" -> context.bot.send_photo(chat_id, file_id)
        await getattr(context.bot, f"send_{kind}")(chat_id, file_id)
    except Exception as exc:  # e.g. self-destructing media cannot be re-sent
        log.warning("Cannot resend %s: %s", kind, exc)


def build_app(token: str) -> Application:
    app = Application.builder().token(token).build()
    db = db_connect()
    cleanup_old(db)
    app.bot_data["db"] = db
    app.add_handler(CommandHandler("start", on_start))
    app.add_handler(BusinessConnectionHandler(on_connection))
    app.add_handler(MessageHandler(filters.UpdateType.BUSINESS_MESSAGE, on_business_message))
    app.add_handler(MessageHandler(filters.UpdateType.EDITED_BUSINESS_MESSAGE, on_edited))
    app.add_handler(BusinessMessagesDeletedHandler(on_deleted))
    return app


def main() -> None:
    if not BOT_TOKEN or BOT_TOKEN == "PASTE_YOUR_TOKEN_HERE":
        raise SystemExit("Put your bot token into the .env file (BOT_TOKEN=...).")
    log.info("Bot is starting. Press Ctrl+C to stop.")
    build_app(BOT_TOKEN).run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
