@echo off
chcp 65001 >nul
rem Прави пряк път "sword and MAGE" на работния плот, който пуска играта.
set "HERE=%~dp0"
set "VBS=%TEMP%\sm_shortcut.vbs"

> "%VBS%" echo Set oWS = WScript.CreateObject("WScript.Shell")
>> "%VBS%" echo sDesktop = oWS.SpecialFolders("Desktop")
>> "%VBS%" echo Set oLink = oWS.CreateShortcut(sDesktop ^& "\sword and MAGE.lnk")
>> "%VBS%" echo oLink.TargetPath = "%HERE%ИГРАЙ.bat"
>> "%VBS%" echo oLink.WorkingDirectory = "%HERE%"
>> "%VBS%" echo oLink.IconLocation = "%HERE%docs\icon-512.png"
>> "%VBS%" echo oLink.Description = "sword and MAGE"
>> "%VBS%" echo oLink.WindowStyle = 7
>> "%VBS%" echo oLink.Save

cscript //nologo "%VBS%"
del "%VBS%" >nul 2>&1
echo Готово: прекият път "sword and MAGE" е на работния плот.
pause
