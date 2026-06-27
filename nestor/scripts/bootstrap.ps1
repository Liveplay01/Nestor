#Requires -Version 5.1
<#
  Nestor Bootstrap Installer
  ──────────────────────────
  Distribute this single file (compiled to EXE) instead of a versioned
  installer. It always pulls the latest release from GitHub so it never
  becomes stale.

  Compile to EXE:
    Install-Module -Name ps2exe -Scope CurrentUser -Force
    Invoke-PS2EXE .\scripts\bootstrap.ps1 .\Nestor-Install.exe `
      -noConsole `
      -iconFile .\resources\icon.ico `
      -title "Nestor" -company "Nestor" `
      -product "Nestor Installer" -version "1.0.0.0"
  Note: NO -requireAdmin here. The bootstrap only downloads and launches the
  NSIS installer — the NSIS installer itself requests elevation via its own
  UAC manifest. Running the bootstrap as admin is unnecessary and violates
  the principle of least privilege.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── Configuration ─────────────────────────────────────────────────────────────
$GITHUB_OWNER  = "Liveplay01"   # TODO: replace with your GitHub username/org
$GITHUB_REPO   = "Nestor"
$APP_NAME      = "Nestor"

# NSIS writes the uninstall key here after install
$UNINSTALL_KEY = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Nestor_is1"

# ── UI helpers ────────────────────────────────────────────────────────────────
function New-BootstrapForm {
  $f = New-Object System.Windows.Forms.Form
  $f.Text            = "$APP_NAME"
  $f.ClientSize      = New-Object System.Drawing.Size(420, 130)
  $f.StartPosition   = "CenterScreen"
  $f.FormBorderStyle = "FixedSingle"
  $f.MaximizeBox     = $false
  $f.MinimizeBox     = $false
  $f.BackColor       = [System.Drawing.Color]::White
  $f.Font            = New-Object System.Drawing.Font("Segoe UI", 9)

  $title = New-Object System.Windows.Forms.Label
  $title.Text      = $APP_NAME
  $title.Font      = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
  $title.Location  = New-Object System.Drawing.Point(20, 18)
  $title.AutoSize  = $true
  $f.Controls.Add($title)

  $status = New-Object System.Windows.Forms.Label
  $status.Text      = "Verbindung wird hergestellt..."
  $status.Location  = New-Object System.Drawing.Point(20, 48)
  $status.Size      = New-Object System.Drawing.Size(380, 18)
  $status.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
  $f.Controls.Add($status)

  $bar = New-Object System.Windows.Forms.ProgressBar
  $bar.Location = New-Object System.Drawing.Point(20, 76)
  $bar.Size     = New-Object System.Drawing.Size(380, 16)
  $bar.Style    = "Marquee"
  $f.Controls.Add($bar)

  return @{ Form = $f; Status = $status; Bar = $bar }
}

function Show-Error([string]$msg) {
  [System.Windows.Forms.MessageBox]::Show(
    $msg,
    $APP_NAME,
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

# ── Check if already installed ────────────────────────────────────────────────
$isInstalled  = Test-Path $UNINSTALL_KEY
$installProps = if ($isInstalled) { Get-ItemProperty $UNINSTALL_KEY -ErrorAction SilentlyContinue } else { $null }
$installDir   = if ($installProps) { $installProps.InstallLocation } else { $null }
$exePath      = if ($installDir)   { Join-Path $installDir "$APP_NAME.exe" } else { $null }

if ($isInstalled -and $exePath -and (Test-Path $exePath)) {
  # App is already installed and up-to-date (electron-updater handles in-app
  # updates automatically). Just launch it.
  Start-Process $exePath
  exit 0
}

# ── Download and install latest release ───────────────────────────────────────
$ui = New-BootstrapForm
$ui.Form.Show()
$ui.Form.Refresh()

try {
  # 1. Fetch release metadata from GitHub API
  $apiUrl  = "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/latest"
  $headers = @{ "User-Agent" = "Nestor-Bootstrap/1.0"; "Accept" = "application/vnd.github+json" }

  $ui.Status.Text = "Neueste Version wird ermittelt..."
  $ui.Form.Refresh()

  $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -ErrorAction Stop
  $version = $release.tag_name
  $asset   = $release.assets |
               Where-Object { $_.name -match '(?i)setup.*\.exe$|.*installer.*\.exe$|^Nestor.*\.exe$' } |
               Select-Object -First 1

  if (-not $asset) {
    $ui.Form.Hide()
    Show-Error "Kein Installer in Release $version gefunden.`nBitte wende dich an den Support."
    exit 1
  }

  # 2. Download installer to temp folder
  $tmpPath = Join-Path $env:TEMP "$($asset.name)"
  $ui.Status.Text = "$APP_NAME $version wird heruntergeladen..."
  $ui.Form.Refresh()

  $wc = New-Object System.Net.WebClient
  $wc.DownloadFile($asset.browser_download_url, $tmpPath)

  # 3. Launch installer
  $ui.Status.Text = "Installation wird gestartet..."
  $ui.Form.Refresh()
  $ui.Form.Hide()

  Start-Process -FilePath $tmpPath -Wait

  Remove-Item $tmpPath -ErrorAction SilentlyContinue

} catch {
  $ui.Form.Hide()
  Show-Error "Installation fehlgeschlagen:`n`n$_"
  exit 1
}

$ui.Form.Dispose()
exit 0
