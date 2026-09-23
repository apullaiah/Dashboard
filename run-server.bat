@echo off
title Chittoor Resurvey Monitoring
echo ===================================================
echo CHITTOOR DISTRICT - AP RESURVEY MONITORING SYSTEM
echo ===================================================

set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Adobe\Adobe Photoshop 2023\node.exe" (
        set NODE_CMD="C:\Program Files\Adobe\Adobe Photoshop 2023\node.exe"
    ) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
        set NODE_CMD="%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    )
)

echo.
echo [1/2] Syncing DLR data from Google Spreadsheets...
%NODE_CMD% scripts\extract_direct_dlr.js
echo DLR sync complete.

echo.
echo [2/2] Syncing GT progress from Google Spreadsheets...
%NODE_CMD% scripts\sync_gt_from_sheets.js
echo GT sync complete.

echo.
echo Starting server on http://localhost:4173 ...
%NODE_CMD% server.js
pause
