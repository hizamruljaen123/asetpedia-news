# load-env.ps1 - Load environment variables from .env.local file
# Usage: .\load-env.ps1

param(
    [string]$EnvFile = ".env.local"
)

Write-Host "Loading environment variables from $EnvFile..." -ForegroundColor Green

if (-not (Test-Path $EnvFile)) {
    Write-Host "Environment file '$EnvFile' not found!" -ForegroundColor Red
    Write-Host "Please create it by copying from .env.example:" -ForegroundColor Yellow
    Write-Host "  Copy-Item .env.example $EnvFile" -ForegroundColor Yellow
    exit 1
}

# Read and set environment variables
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    
    # Skip empty lines and comments
    if ($line -eq "" -or $line.StartsWith("#")) {
        return
    }
    
    # Parse KEY=VALUE format
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes if present
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or 
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        
        # Set environment variable
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
        Write-Host "  $key = $value" -ForegroundColor Cyan
    }
}

Write-Host "Environment variables loaded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run your development commands:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "  npm run db:push" -ForegroundColor White
Write-Host "  npm run db:generate" -ForegroundColor White