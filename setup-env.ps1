# MessageAI Development Environment Setup
# Run this script before starting development if environment variables are not set

Write-Host "Setting up MessageAI development environment..." -ForegroundColor Green

# Set JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Write-Host "✅ JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Cyan

# Set ANDROID_HOME
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Write-Host "✅ $env:ANDROID_HOME="C:\Users\murad\AppData\Local\Android\Sdk"; $env:Path += ";$env:ANDROID_HOME\platform-tools"; echo "Fixed ANDROID_HOME: $env:ANDROID_HOME"; npx expo run:android set to: $env:ANDROID_HOME" -ForegroundColor Cyan

# Add to PATH
$env:Path += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"
Write-Host "✅ Added Java and Android tools to PATH" -ForegroundColor Cyan

Write-Host ""
Write-Host "Environment ready! You can now run:" -ForegroundColor Green
Write-Host "  npm run android          (First build)" -ForegroundColor Yellow
Write-Host "  npx expo start --dev-client (Daily development)" -ForegroundColor Yellow



