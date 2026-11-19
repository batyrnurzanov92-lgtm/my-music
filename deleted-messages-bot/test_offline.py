"""Offline check: feeds fake Telegram updates to the handlers (no network)."""
import asyncio
import os
import tempfile
from types import SimpleNamespace

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
import bot  # noqa: E402
from telegram import Update  # noqa: E402

OWNER, FRIEND, CONN = 111, 222, "conn-1"
sent = []


class FakeBot:
    async def send_message(self, chat_id, text, **kw):
        sent.append((chat_id, text))

    async def send_photo(self, chat_id, file_id, **kw):
        sent.append((chat_id, f"[photo {file_id}]"))


def upd(data):
    return Update.de_json({"update_id": 1, **data}, None)


def msg(mid, user_id, name, text=None, photo=False):
    m = {"message_id": mid, "date": 1763500000, "business_connection_id": CONN,
         "chat": {"id": FRIEND, "type": "private"},
         "from": {"id": user_id, "is_bot": False, "first_name": name}}
    if photo:
        m["photo"] = [{"file_id": "PHOTO1", "file_unique_id": "u", "width": 1, "height": 1}]
        m["caption"] = text
    else:
        m["text"] = text
    return m


async def main():
    ctx = SimpleNamespace(bot=FakeBot(), bot_data={"db": bot.db_connect()})
    owner = {"id": OWNER, "is_bot": False, "first_name": "Me"}
    await bot.on_connection(upd({"business_connection": {
        "id": CONN, "user": owner, "user_chat_id": OWNER, "date": 1, "is_enabled": True}}), ctx)
    await bot.on_business_message(upd({"business_message": msg(1, FRIEND, "Anna", "secret")}), ctx)
    await bot.on_business_message(upd({"business_message": msg(2, FRIEND, "Anna", "pic", photo=True)}), ctx)
    await bot.on_business_message(upd({"business_message": msg(3, OWNER, "Me", "mine")}), ctx)
    await bot.on_edited(upd({"edited_business_message": msg(1, FRIEND, "Anna", "secret v2")}), ctx)
    await bot.on_deleted(upd({"deleted_business_messages": {
        "business_connection_id": CONN, "chat": {"id": FRIEND, "type": "private"},
        "message_ids": [1, 2, 3, 99]}}), ctx)
    for chat, text in sent:
        print(chat, "|", text.replace("\n", " / "))
    texts = " ".join(t for _, t in sent)
    assert "Было: secret" in texts and "Стало: secret v2" in texts
    assert "Текст: secret v2" in texts and "[photo PHOTO1]" in texts
    assert "mine" not in texts, "owner's own messages must be ignored"
    assert all(c == OWNER for c, _ in sent)
    print("OK: all checks passed")


asyncio.run(main())
