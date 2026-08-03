Add-Type -AssemblyName System.Drawing

function New-CookieIcon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $cookie = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(216, 155, 95))
  $edge   = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(169, 110, 47), [Math]::Max(1, [int]($size * 0.05)))
  $chip   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(92, 58, 30))
  $cx = $size * 0.5; $cy = $size * 0.5; $r = $size * 0.42
  $g.FillEllipse($cookie, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $g.DrawEllipse($edge, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $chips = @(@(0.38, 0.38, 0.10), @(0.62, 0.33, 0.09), @(0.52, 0.55, 0.11), @(0.35, 0.62, 0.09), @(0.65, 0.63, 0.10))
  foreach ($c in $chips) {
    $cr = $size * $c[2]
    $g.FillEllipse($chip, $size * $c[0] - $cr, $size * $c[1] - $cr, 2 * $cr, 2 * $cr)
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $cookie.Dispose(); $edge.Dispose(); $chip.Dispose(); $bmp.Dispose()
}

New-CookieIcon 16  "icons\icon16.png"
New-CookieIcon 32  "icons\icon32.png"
New-CookieIcon 48  "icons\icon48.png"
New-CookieIcon 128 "icons\icon128.png"
Write-Output "icons generated"
