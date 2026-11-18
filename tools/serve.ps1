# Local test server for "My Music" (Windows PowerShell 5.1, no extra installs).
# Usage: right-click > "Run with PowerShell", or:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1
# Then open http://localhost:8765 in Edge or Chrome. Close this window to stop the server.
param(
    [int]$Port = 8765,
    [switch]$NoBrowser
)

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host "Port $Port is busy - the server is probably already running."
    if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }
    exit
}

Write-Host "My Music is running at http://localhost:$Port/  (close this window to stop)"
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

$types = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'
    '.webmanifest' = 'application/manifest+json'; '.json' = 'application/json'
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $resp = $ctx.Response
    try {
        $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
        if ($rel -eq '') { $rel = 'index.html' }
        $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
        # Only serve files inside the app folder
        if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
            $bytes = [IO.File]::ReadAllBytes($file)
            $ext = [IO.Path]::GetExtension($file).ToLower()
            $resp.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
            $resp.Headers.Add('Cache-Control', 'no-cache')
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $resp.StatusCode = 404
        }
    } catch {
        $resp.StatusCode = 500
    } finally {
        $resp.Close()
    }
}
