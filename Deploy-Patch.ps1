# ════════════════════════════════════════════════
# IOT2050 Patch Deployment Script (Low Perf Mode)
# ════════════════════════════════════════════════
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  🚀 IOT2050 Performance Patch Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Get IP Address (Defaulting to the one in your screenshot)
$iot_ip = Read-Host "Enter IOT2050 IP Address [Press Enter for 192.168.121.211]"
if ([string]::IsNullOrWhiteSpace($iot_ip)) { $iot_ip = "192.168.121.211" }

$iot_user = "root"

# Get Destination Path
$iot_path = Read-Host "Enter Destination Path on IOT2050 [Press Enter for /opt/pid-tuning-app/MITRPHOL-Backup]"
if ([string]::IsNullOrWhiteSpace($iot_path)) { $iot_path = "/opt/pid-tuning-app/MITRPHOL-Backup" }

Write-Host "`n[1/5] Deploying index.html..." -ForegroundColor Yellow
scp .\public\index.html ${iot_user}@${iot_ip}:${iot_path}/public/

Write-Host "[2/5] Deploying style.css..." -ForegroundColor Yellow
scp .\public\css\style.css ${iot_user}@${iot_ip}:${iot_path}/public/css/

Write-Host "[3/5] Deploying app.js..." -ForegroundColor Yellow
scp .\public\js\app.js ${iot_user}@${iot_ip}:${iot_path}/public/js/

Write-Host "[4/5] Deploying server.js (Backend)..." -ForegroundColor Yellow
scp .\server.js ${iot_user}@${iot_ip}:${iot_path}/

Write-Host "[5/5] Deploying s7client.js (Backend)..." -ForegroundColor Yellow
scp .\src\s7client.js ${iot_user}@${iot_ip}:${iot_path}/src/

Write-Host "`n✅ Patch deployed successfully!" -ForegroundColor Green
Write-Host "👉 Please restart the Node server on IOT2050 (e.g. pm2 restart server or systemctl restart pid-app)" -ForegroundColor Cyan
Write-Host "👉 Then press F5 or refresh the browser on the IOT2050 screen." -ForegroundColor Cyan
Write-Host ""
Pause
