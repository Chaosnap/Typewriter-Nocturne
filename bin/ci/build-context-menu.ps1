# [nocturne] Builds the Windows 11 context menu entry "Open TypeNoc here" (GitHub Actions only).
#
# Output in dist/context-menu/, shipped as resources/context-menu/ by electron-builder:
#   TypeNocContextMenu.dll   the IExplorerCommand handler (build/win/context-menu/OpenHere.cpp)
#   AppxManifest.xml, Assets  the sparse package, for registering it in place (Developer Mode)
#   TypeNocContextMenu.msix  the same package signed, only when a certificate is configured
#
# The certificate is the Windows code-signing certificate already used for the installer
# (WIN_CSC_LINK, a base64 .pfx, and WIN_CSC_KEY_PASSWORD). The package's publisher is taken from
# its subject, as Windows requires. Without one, no .msix is made: Windows will not install an
# unsigned sparse package.
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$source = Join-Path $root 'build\win\context-menu'
$out = Join-Path $root 'dist\context-menu'
$stage = Join-Path $root 'dist\context-menu-package'
Remove-Item -Recurse -Force $out, $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $out, (Join-Path $out 'Assets') | Out-Null

# 1. The DLL, compiled with the runner's Visual Studio C++ tools.
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw 'Visual Studio C++ tools not found' }
$vcvars = Join-Path $vs 'VC\Auxiliary\Build\vcvars64.bat'
$dll = Join-Path $out 'TypeNocContextMenu.dll'
$objects = Join-Path $root 'dist\context-menu-obj'
New-Item -ItemType Directory -Force -Path $objects | Out-Null
$compile = "call `"$vcvars`" >nul && cl /nologo /std:c++17 /EHsc /O2 /W4 /LD /DUNICODE /D_UNICODE " +
  "/Fo`"$objects\\`" `"$source\OpenHere.cpp`" /Fe:`"$dll`" " +
  "/link /DEF:`"$source\OpenHere.def`" shell32.lib shlwapi.lib ole32.lib runtimeobject.lib"
cmd /c $compile
if ($LASTEXITCODE -ne 0) { throw "Compiling the context menu handler failed ($LASTEXITCODE)" }

# 2. The package's logos, from the app icon rendered earlier in the build.
Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Image]::FromFile((Join-Path $root 'build\icon.png'))
foreach ($logo in @(@('Square44x44Logo.png', 44), @('Square150x150Logo.png', 150), @('StoreLogo.png', 50))) {
  $bitmap = New-Object System.Drawing.Bitmap $logo[1], $logo[1]
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($icon, 0, 0, $logo[1], $logo[1])
  $bitmap.Save((Join-Path $out "Assets\$($logo[0])"), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}
$icon.Dispose()

# 3. The manifest: a four-part version, and the certificate's subject as publisher if there is one.
$version = (Get-Content (Join-Path $root 'app\package.json') -Raw | ConvertFrom-Json).version
$numbers = ($version -split '[-+]')[0].Split('.') | ForEach-Object { [int]$_ }
$packageVersion = ($numbers + @(0, 0, 0, 0))[0..3] -join '.'
$publisher = 'CN=Typewriter Nocturne'
$pfx = $null
if ($env:WIN_CSC_LINK) {
  $pfx = Join-Path $env:RUNNER_TEMP 'context-menu-signing.pfx'
  [IO.File]::WriteAllBytes($pfx, [Convert]::FromBase64String($env:WIN_CSC_LINK))
  $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $pfx, $env:WIN_CSC_KEY_PASSWORD
  $publisher = $certificate.Subject
}
$manifest = Get-Content (Join-Path $source 'AppxManifest.xml') -Raw
$manifest = $manifest.Replace('__VERSION__', $packageVersion)
$manifest = $manifest.Replace('__PUBLISHER__', [Security.SecurityElement]::Escape($publisher))
Set-Content -Path (Join-Path $out 'AppxManifest.xml') -Value $manifest -Encoding utf8

# 4. The signed package, when there is a certificate to sign it with.
if ($pfx) {
  $kit = Get-ChildItem (Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin\*\x64\makeappx.exe') |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $kit) { throw 'MakeAppx.exe not found' }
  $tools = Split-Path $kit.FullName
  New-Item -ItemType Directory -Force -Path $stage | Out-Null
  Copy-Item (Join-Path $out 'AppxManifest.xml'), (Join-Path $out 'Assets') -Destination $stage -Recurse
  $msix = Join-Path $out 'TypeNocContextMenu.msix'
  & (Join-Path $tools 'makeappx.exe') pack /d $stage /p $msix /nv /o
  if ($LASTEXITCODE -ne 0) { throw "Packing the context menu package failed ($LASTEXITCODE)" }
  & (Join-Path $tools 'signtool.exe') sign /fd SHA256 /f $pfx /p $env:WIN_CSC_KEY_PASSWORD $msix
  if ($LASTEXITCODE -ne 0) { throw "Signing the context menu package failed ($LASTEXITCODE)" }
  Remove-Item -Force $pfx
  Write-Output "Signed context menu package for $publisher"
} else {
  Write-Output 'No signing certificate: the context menu package can be registered in Developer Mode only.'
}
Get-ChildItem -Recurse $out | ForEach-Object { Write-Output $_.FullName }
