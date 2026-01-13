# Antigravity Subs Generator - ZXP Build Script
# This script creates a signed ZXP package for Adobe Premiere Pro extension

$ErrorActionPreference = "Stop"

# Configuration
$ExtensionName = "Antigravity-Subs-Generator"
$Version = "1.0.0"
$BundleId = "com.antigravity.subs.generator"
$CertPassword = "antigravity2026"
$CertName = "antigravity-cert"

# Paths
$RootDir = $PSScriptRoot
$ToolsDir = Join-Path $RootDir ".zxptools"
$CertPath = Join-Path $ToolsDir "$CertName.p12"
$DistDir = Join-Path $RootDir "dist"
$TempDir = Join-Path $RootDir "temp_zxp"
$OutputZXP = Join-Path $DistDir "$ExtensionName-v$Version.zxp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building ZXP Package for $ExtensionName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create directories
if (-not (Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Path $ToolsDir | Out-Null
    Write-Host "Created .zxptools directory" -ForegroundColor Green
}

if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
    Write-Host "Created dist directory" -ForegroundColor Green
}

# Generate self-signed certificate if it doesn't exist
if (-not (Test-Path $CertPath)) {
    Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
    
    try {
        $zxpSignPath = "C:\Users\Adnan\AppData\Roaming\npm\node_modules\zxp-sign-cmd\index.js"
        $certArgs = @(
            "-selfSignedCert",
            "TR",
            "Istanbul",
            "Dedeoglu Medya",
            "Antigravity",
            $CertPassword,
            $CertPath
        )
        
        & node $zxpSignPath $certArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Certificate created successfully" -ForegroundColor Green
        } else {
            throw "Certificate creation failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Host "Failed to create certificate: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Using existing certificate" -ForegroundColor Green
}

# Clean up temp directory if it exists
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $TempDir | Out-Null
Write-Host "Created temporary build directory" -ForegroundColor Green

# Copy files to temp directory, excluding files in .zxpignore
Write-Host "Copying extension files..." -ForegroundColor Yellow

$excludePatterns = @()
if (Test-Path ".zxpignore") {
    $excludePatterns = Get-Content ".zxpignore" | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' }
}

function Should-Exclude {
    param($Path, $RootPath)
    
    $relativePath = $Path.Replace($RootPath, "").TrimStart("\", "/")
    
    foreach ($pattern in $excludePatterns) {
        $pattern = $pattern.Trim()
        
        # Exact match or directory match
        if ($relativePath -eq $pattern -or $relativePath.StartsWith("$pattern\") -or $relativePath.StartsWith("$pattern/")) {
            return $true
        }
        
        # Wildcard match
        if ($relativePath -like $pattern) {
            return $true
        }
    }
    
    return $false
}

# Copy all items
Get-ChildItem -Path $RootDir -Recurse | ForEach-Object {
    if ($_.FullName -eq $TempDir -or $_.FullName.StartsWith($TempDir)) {
        return
    }
    
    if (Should-Exclude -Path $_.FullName -RootPath $RootDir) {
        return
    }
    
    $relativePath = $_.FullName.Substring($RootDir.Length + 1)
    $targetPath = Join-Path $TempDir $relativePath
    
    if ($_.PSIsContainer) {
        if (-not (Test-Path $targetPath)) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        }
    } else {
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination $targetPath -Force
    }
}

Write-Host "Files copied to temp directory" -ForegroundColor Green

# Sign the ZXP
Write-Host "Signing ZXP package..." -ForegroundColor Yellow

try {
    $zxpSignPath = "C:\Users\Adnan\AppData\Roaming\npm\node_modules\zxp-sign-cmd\index.js"
    $signArgs = @(
        "-sign",
        $TempDir,
        $OutputZXP,
        $CertPath,
        $CertPassword
    )
    
    & node $zxpSignPath $signArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ZXP package signed successfully" -ForegroundColor Green
    } else {
        throw "ZXP signing failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "Failed to sign ZXP: $_" -ForegroundColor Red
    exit 1
}

# Clean up temp directory
Remove-Item -Path $TempDir -Recurse -Force
Write-Host "Cleaned up temporary files" -ForegroundColor Green

# Get file size
$fileSize = [math]::Round((Get-Item $OutputZXP).Length / 1KB, 2)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $OutputZXP" -ForegroundColor Cyan
Write-Host "Size: $fileSize KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install ZXP Installer from: https://aescripts.com/learn/zxp-installer/" -ForegroundColor White
Write-Host "2. Drag and drop the ZXP file to ZXP Installer" -ForegroundColor White
Write-Host "3. Open Adobe Premiere Pro and find extension under Window > Extensions" -ForegroundColor White
Write-Host ""
