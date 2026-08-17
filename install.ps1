# header-clock 一键安装脚本（Windows PowerShell）
# 用法: .\install.ps1 [-DshHome <路径>] [-Profile <名称>]
# 默认: DshHome=$HOME\.dsh  Profile=web
param(
  [string]$DshHome = "$HOME\.dsh",
  [string]$Profile = "web"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DshHome)) {
  Write-Host "错误: 未找到 DSH 目录 $DshHome" -ForegroundColor Red
  exit 1
}
$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path $profileDir)) {
  Write-Host "错误: 未找到 profile 目录 $profileDir" -ForegroundColor Red
  exit 1
}

$target = Join-Path $profileDir "node_modules\header-clock"
Write-Host "1/3 复制插件到 $target"
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $PSScriptRoot "static\*") $target -Force -Recurse

$patch = Join-Path $profileDir "cordis.patch.yml"
if (-not (Test-Path $patch)) {
  Write-Host "错误: 未找到 $patch（请确认 profile 名正确）" -ForegroundColor Red
  exit 1
}
$content = Get-Content $patch -Raw
if ($content -match 'header-clock') {
  Write-Host "2/3 cordis.patch.yml 已包含 header-clock，跳过" -ForegroundColor Yellow
} else {
  $entry = "`n# header-clock (DSH 头部时钟插件) - 临时禁用: 将 disabled 改为 true 并重启 DSH`n- insert:`n    - id: header-clock`n      name: header-clock`n      disabled: false`n"
  Add-Content -Path $patch -Value $entry
  Write-Host "2/3 已写入 cordis.patch.yml" -ForegroundColor Green
}

Write-Host "3/3 验证:"
& node (Join-Path $PSScriptRoot "test\smoke.test.js")
if ($LASTEXITCODE -ne 0) {
  Write-Host "注意: 冒烟测试未通过（可能未安装 Node.js 或环境问题），不影响插件安装" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "安装完成！请重启 DSH 服务（不是刷新浏览器），时钟即随页面自动显示。"
Write-Host "卸载: 删除 $target 目录，并从 $patch 中移除 header-clock 条目。"
