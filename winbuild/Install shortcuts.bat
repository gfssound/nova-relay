@echo off
rem Nova Relay: add Start menu and desktop shortcuts for this folder's "Nova Relay.exe".
rem Optional: you can also just double-click "Nova Relay.exe". Run this again after moving the folder.
setlocal
set "APPDIR=%~dp0Nova Relay"
if not exist "%APPDIR%\Nova Relay.exe" (
  echo Couldn't find "Nova Relay.exe" next to this file. Unzip the whole download first.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = New-Object -ComObject WScript.Shell;" ^
  "foreach ($dir in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {" ^
  "  $l = $s.CreateShortcut((Join-Path $dir 'Nova Relay.lnk'));" ^
  "  $l.TargetPath = '%APPDIR%\Nova Relay.exe'; $l.WorkingDirectory = '%APPDIR%';" ^
  "  $l.IconLocation = '%APPDIR%\nova-remote.ico'; $l.Description = 'Nova Relay'; $l.Save() }"
if errorlevel 1 (
  echo Couldn't create the shortcuts. You can still double-click "Nova Relay.exe".
) else (
  echo Done: Nova Relay is in the Start menu and on the desktop.
)
pause
