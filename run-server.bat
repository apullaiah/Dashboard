@echo off
title Chittoor Resurvey Monitoring
echo ===================================================
echo CHITTOOR DISTRICT - AP RESURVEY MONITORING SYSTEM
echo ===================================================
echo Starting server on http://localhost:4173 ...

set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
        set NODE_CMD="%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    )
)

%NODE_CMD% server.js
pause
