@echo off
setlocal
color 2F
echo Arrange My Files AI - Connect the Live Website to Local Ollama
echo.
echo Allows ONLY https://arrangemyfilesai.detleng.com; preserves existing origins.
echo Restarts Ollama to apply the setting. A running inference may be interrupted.
echo Does not read files, change the firewall, or expose Ollama to the internet.
echo.
choice /C YN /N /M "Apply and restart Ollama? [Y/N] "
if errorlevel 2 exit /b 0
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; try { $current=[Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS','User'); $origins=@($current -split ',') + 'https://arrangemyfilesai.detleng.com'; $updated=($origins | Where-Object { $_.Trim() } | Select-Object -Unique) -join ','; [Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS',$updated,'User'); $env:OLLAMA_ORIGINS=$updated; Write-Host 'Exact website origin saved.'; $app=Get-Process -Name 'ollama app' -ErrorAction SilentlyContinue | Select-Object -First 1; $cli=Get-Process -Name 'ollama' -ErrorAction SilentlyContinue | Select-Object -First 1; if($app){$launch=$app.Path; Stop-Process -Id $app.Id; Get-Process -Name 'ollama' -ErrorAction SilentlyContinue | Stop-Process; Start-Process -FilePath $launch -WindowStyle Hidden} elseif($cli){$launch=$cli.Path; Get-Process -Name 'ollama' -ErrorAction SilentlyContinue | Stop-Process; Start-Process -FilePath $launch -ArgumentList 'serve' -WindowStyle Hidden} else {Write-Host 'Open Ollama from Windows Start, then retry Check local AI.'}; $ok=$false; for($i=0;$i -lt 10;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:11434/api/tags' -Headers @{Origin='https://arrangemyfilesai.detleng.com'} -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break}}catch{};Start-Sleep -Milliseconds 500}; if($ok){Write-Host 'PASS: local Ollama accepts the website origin.'}else{Write-Host 'Not yet verified. Quit Ollama from the tray, reopen it, and retry.'}; Write-Host 'Now return to the live website and click Check local AI. Allow browser Local Network Access if asked.' } catch { Write-Host 'Setup did not complete:' $_.Exception.Message; exit 1 }"
echo.
pause
