# push.ps1 - 本机专用推送脚本（绕开 git-remote-https 崩溃）
#
# 背景（2026-09-25 定位）：
#   本机 Windows 上 git-remote-https.exe 在「派生凭据助手子进程」时稳定崩溃
#   （Windows 应用日志：异常代码 0xc0000005，固定偏移；退出码 128 且 stdout/stderr 全空）。
#   已验证与 Git 版本无关（2.48.1 / 2.55.0.3 表现一致）、与代理无关、
#   与用哪个助手无关（GCM / gh 助手都一样），且在 WorkBuddy 沙箱外同样复现。
#   而不需要认证的 fetch / ls-remote 从不派生子进程，因此一直正常。
#
# 绕行原理：
#   把凭据内联进 URL，并显式清空 credential helper 列表，
#   使 git-remote-https 全程不派生任何子进程 => 不崩溃。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts\push.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\push.ps1 main v1.0.0
#
# 注意：token 会出现在本进程命令行参数中（仅本机同一用户可见），不写入任何文件。

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Refs
)

$ErrorActionPreference = "Stop"

$repo   = Split-Path -Parent $PSScriptRoot
$host_  = "github.com"
$slug   = "datouzhenbei/personal-survival-dashboard"
$proxy  = "http://127.0.0.1:7897"

# GitHub 直连会 unexpected EOF，必须走本机 Clash Verge 混合端口
$env:HTTP_PROXY  = $proxy
$env:HTTPS_PROXY = $proxy
$env:ALL_PROXY   = $proxy
$env:GIT_TERMINAL_PROMPT = "0"

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$tok = (& $gh auth token 2>$null | Select-Object -First 1)
if (-not $tok) {
    Write-Error "无法获取 GitHub token，请先执行：gh auth login"
    exit 1
}

if (-not $Refs -or $Refs.Count -eq 0) {
    $branch = (& git -C $repo rev-parse --abbrev-ref HEAD).Trim()
    $Refs = @("$branch")
}

$url = "https://x-access-token:$tok@$host_/$slug.git"

Write-Host "push -> $slug  refs: $($Refs -join ', ')"

& git -C $repo `
    -c credential.helper= `
    -c "credential.https://github.com.helper=" `
    push $url @Refs

exit $LASTEXITCODE
