# Generate TabBar icons (81x81 PNG) for kewei miniprogram
# Usage: powershell -ExecutionPolicy Bypass -File gen-tabbar-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\src\static\tabbar'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$outDir = (Resolve-Path $outDir).Path

$gray = [System.Drawing.Color]::FromArgb(153, 153, 153)
$blue = [System.Drawing.Color]::FromArgb(22, 117, 255)

function P($x, $y) { New-Object System.Drawing.PointF([single]$x, [single]$y) }

function Draw-Kind($g, $pen, $kind) {
    switch ($kind) {
        'home' {
            # roof
            $g.DrawLines($pen, [System.Drawing.PointF[]]@((P 10 36), (P 40 10), (P 70 36)))
            # body
            $g.DrawLines($pen, [System.Drawing.PointF[]]@((P 18 38), (P 18 68), (P 62 68), (P 62 38)))
            # door
            $g.DrawLines($pen, [System.Drawing.PointF[]]@((P 34 68), (P 34 52), (P 47 52), (P 47 68)))
        }
        'reports' {
            $null = $g.DrawRectangle($pen, 18, 10, 44, 60)
            $g.DrawLine($pen, (P 27 28), (P 53 28))
            $g.DrawLine($pen, (P 27 41), (P 53 41))
            $g.DrawLine($pen, (P 27 54), (P 44 54))
        }
        'upload' {
            # open tray
            $g.DrawLines($pen, [System.Drawing.PointF[]]@((P 12 48), (P 12 68), (P 68 68), (P 68 48)))
            # arrow up
            $g.DrawLine($pen, (P 40 58), (P 40 14))
            $g.DrawLines($pen, [System.Drawing.PointF[]]@((P 26 28), (P 40 14), (P 54 28)))
        }
        'mine' {
            # head
            $null = $g.DrawEllipse($pen, 28, 8, 24, 24)
            # shoulders (upper half arc)
            $g.DrawArc($pen, 12, 46, 56, 52, 180, 180)
        }
    }
}

function New-Icon($name, $kind, $color) {
    $bmp = New-Object System.Drawing.Bitmap(81, 81)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $pen = New-Object System.Drawing.Pen($color, 5)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    Draw-Kind $g $pen $kind
    $path = Join-Path $outDir "$name.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $pen.Dispose(); $bmp.Dispose()
    Write-Output "saved: $path"
}

New-Icon 'home'     'home'     $gray
New-Icon 'home-active' 'home'  $blue
New-Icon 'reports'  'reports'  $gray
New-Icon 'reports-active' 'reports' $blue
New-Icon 'upload'   'upload'   $gray
New-Icon 'upload-active' 'upload' $blue
New-Icon 'mine'     'mine'     $gray
New-Icon 'mine-active' 'mine'  $blue

Write-Output 'DONE'
