Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Carlos\.gemini\antigravity\brain\827904ab-57f9-44d3-9c4b-68350d4b7ce1\.user_uploaded\media_1793991181543_c2ebe8a8.png"
$destPath = Join-Path $PSScriptRoot "app-icon-white.png"
$publicPath = Join-Path $PSScriptRoot "public\app-icon.png"

if (-not (Test-Path $srcPath)) {
    Write-Error "No se encontro la imagen origen en: $srcPath"
    exit 1
}

$size = 1024
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Margen y curvatura de esquinas (estilo squircle moderno de Windows 11 / macOS)
$margin = 48
$rectSize = $size - ($margin * 2)
$radius = 190

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc($margin, $margin, $radius * 2, $radius * 2, 180, 90)
$path.AddArc($margin + $rectSize - ($radius * 2), $margin, $radius * 2, $radius * 2, 270, 90)
$path.AddArc($margin + $rectSize - ($radius * 2), $margin + $rectSize - ($radius * 2), $radius * 2, $radius * 2, 0, 90)
$path.AddArc($margin, $margin + $rectSize - ($radius * 2), $radius * 2, $radius * 2, 90, 90)
$path.CloseFigure()

# Relleno blanco con un toque degradado muy sutil para dar volumen
$bgRect = New-Object System.Drawing.Rectangle($margin, $margin, $rectSize, $rectSize)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bgRect,
    [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(255, 246, 248, 252),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillPath($brush, $path)

# Borde sutil gris azulado (slate-200) para delimitar contra fondos blancos
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 226, 232, 240), 10)
$g.DrawPath($pen, $path)

# Cargar y dibujar el logotipo EP original centrado con proporciones perfectas
$logo = [System.Drawing.Image]::FromFile($srcPath)
$logoMargin = 140
$logoWidth = $size - ($logoMargin * 2)
$logoHeight = $size - ($logoMargin * 2)

$g.DrawImage($logo, $logoMargin, $logoMargin, $logoWidth, $logoHeight)

# Guardar en raíz y en public/
$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
if (Test-Path (Join-Path $PSScriptRoot "public")) {
    $bmp.Save($publicPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

$g.Dispose()
$bmp.Dispose()
$logo.Dispose()

Write-Host "Icono generado con exito en: $destPath"
Write-Host "Generando iconos de Tauri con tauri icon..."
