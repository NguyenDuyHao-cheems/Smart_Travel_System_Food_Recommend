@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

if /i "%~1"=="backend" goto RUN_BACKEND
if /i "%~1"=="ai" goto RUN_AI
if /i "%~1"=="frontend" goto RUN_FRONTEND
if /i "%~1"=="openweb" goto WAIT_AND_OPEN_WEB
goto CONTROLLER_START

:RUN_BACKEND
title STS Core Backend - FastAPI - 8000
cd /d "%~dp0core_backend"
echo ==========================================================
echo  [BACKEND] Core Backend - http://localhost:8000/docs
echo ==========================================================
echo.
call :PREPARE_PYTHON "backend"
if errorlevel 1 goto SERVICE_FAILED
echo.
echo [OK] Dang khoi chay may chu FastAPI tren cong 8000...
echo.
"%PYTHON_EXE%" -m uvicorn app.main:app --port 8000 --reload
goto SERVICE_FINISHED

:RUN_AI
title STS AI Engine - FastAPI - 8001
cd /d "%~dp0ai_engine"
echo ==========================================================
echo  [AI ENGINE] AI Engine - http://localhost:8001/docs
echo ==========================================================
echo.
call :PREPARE_PYTHON "AI Engine"
if errorlevel 1 goto SERVICE_FAILED
echo.
echo [OK] Dang khoi chay may chu FastAPI tren cong 8001...
echo.
"%PYTHON_EXE%" -m uvicorn app.main:app --port 8001 --reload
goto SERVICE_FINISHED

:RUN_FRONTEND
title STS Frontend - Next.js - 3000
cd /d "%~dp0Frontend"
echo ==========================================================
echo  [FRONTEND] Frontend - http://localhost:3000
echo ==========================================================
echo.
node --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js trong PATH. Can Node.js ^>= 20.x.
    goto SERVICE_FAILED
)
echo [THONG BAO] Dang kiem tra dependency frontend va cai nhung goi con thieu...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [LOI] Kiem tra/cai dependency frontend that bai.
    goto SERVICE_FAILED
)
echo.
echo [OK] Dang khoi chay may chu phat trien Next.js...
echo.
call npm run dev
goto SERVICE_FINISHED

:PREPARE_PYTHON
set "PYTHON_EXE="
if exist "venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"
if not defined PYTHON_EXE (
    python --version >nul 2>&1
    if errorlevel 1 (
        echo [LOI] Khong tim thay Python trong PATH. Can Python ^>= 3.10 de tao venv.
        exit /b 1
    )
    echo [THONG BAO] Khong tim thay venv hoac .venv. Dang tao moi truong ao venv...
    python -m venv venv
    if errorlevel 1 (
        echo [LOI] Tao moi truong ao that bai.
        exit /b 1
    )
    set "PYTHON_EXE=%CD%\venv\Scripts\python.exe"
)
if not exist "!PYTHON_EXE!" (
    echo [LOI] Khong the su dung Python trong moi truong ao.
    exit /b 1
)
"!PYTHON_EXE!" -c "import sys; raise SystemExit(0 if not sys.prefix == sys.base_prefix else 1)" >nul 2>&1
if errorlevel 1 (
    echo [LOI] Interpreter da chon khong phai la moi truong ao Python hop le.
    exit /b 1
)
echo [THONG BAO] Su dung moi truong ao: !PYTHON_EXE!
echo [THONG BAO] Dang kiem tra requirement cho %~1 va cai nhung goi con thieu...
"!PYTHON_EXE!" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [LOI] Kiem tra/cai dependency cho %~1 that bai.
    if /i "%~1"=="AI Engine" if exist "install_deps_windows.bat" (
        echo Chay ai_engine\install_deps_windows.bat neu loi lien quan C++ Build Tools.
    )
    exit /b 1
)
exit /b 0

:SERVICE_FINISHED
set "SERVICE_EXIT_CODE=%errorlevel%"
echo.
if not "%SERVICE_EXIT_CODE%"=="0" (
    echo [LOI] Dich vu da dung voi ma loi %SERVICE_EXIT_CODE%.
) else (
    echo [THONG BAO] Dich vu da dung.
)
exit /b %SERVICE_EXIT_CODE%

:SERVICE_FAILED
echo.
echo [LOI] Dich vu khong the khoi dong. Xem log tai bang dieu khien.
exit /b 1

:CONTROLLER_START

title Smart Travel System - Service Control
set "START_DELAY_SECONDS=5"
set "PID_DIR=%TEMP%\smart_travel_system_runner"
if not exist "%PID_DIR%" md "%PID_DIR%" >nul 2>&1
goto MENU

:PRINT
powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::WriteLine([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('%~1')))"
exit /b

:PROMPT
powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::Write([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('%~1')))"
exit /b

:SHOW_SERVICE
call :IS_SERVICE_RUNNING %~2
if "!SERVICE_RUNNING!"=="1" (
    echo   [X] %~3 - RUNNING
) else (
    echo   [ ] %~3 - STOPPED
)
exit /b

:IS_SERVICE_RUNNING
set "SERVICE_RUNNING=0"
set "SERVICE_PID="
if not exist "%PID_DIR%\%~1.pid" exit /b
set /p "SERVICE_PID="<"%PID_DIR%\%~1.pid"
if not defined SERVICE_PID exit /b
powershell -NoProfile -Command "if (Get-Process -Id !SERVICE_PID! -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    set "SERVICE_RUNNING=1"
) else (
    del /q "%PID_DIR%\%~1.pid" >nul 2>&1
    set "SERVICE_PID="
)
exit /b

:MENU
cls
echo =====================================================================
call :PRINT "ICAgICAgICAgICAgICAgICBI4buGIFRI4buQTkcgU01BUlQgVFJBVkVM"
echo =====================================================================
echo.
call :PRINT "VFLhuqBORyBUSMOBSQ=="
call :SHOW_SERVICE 1 backend "Core Backend"
call :SHOW_SERVICE 2 ai "AI Engine"
call :SHOW_SERVICE 3 frontend "Frontend"
echo.
call :PRINT "xJBJ4buAVSBLSEnhu4JOCiAgMSAgQuG6rXQvdOG6r3QgQmFja2VuZAogIDIgIELhuq10L3Thuq90IEFJCiAgMyAgQuG6rXQvdOG6r3QgRnJvbnRlbmQKICA0ICBC4bqtdCB04bqldCBj4bqjCiAgNSAgVOG6r3QgdOG6pXQgY+G6owogIDAgIFThuq90IHThuqV0IGPhuqMgdsOgIHRob8OhdA=="
echo.
call :PROMPT "TOG7sWEgY2jhu41uOiA="
choice /C 123450 /N
set "MENU_CHOICE=%errorlevel%"

if "%MENU_CHOICE%"=="1" call :TOGGLE_SERVICE 8000 "Core Backend" backend
if "%MENU_CHOICE%"=="2" call :TOGGLE_SERVICE 8001 "AI Engine" ai
if "%MENU_CHOICE%"=="3" call :TOGGLE_SERVICE 3000 "Frontend" frontend
if "%MENU_CHOICE%"=="4" call :START_ALL
if "%MENU_CHOICE%"=="5" call :STOP_ALL
if "%MENU_CHOICE%"=="6" goto EXIT_MENU
goto MENU

:TOGGLE_SERVICE
call :IS_SERVICE_RUNNING %~3
if "!SERVICE_RUNNING!"=="1" (
    call :STOP_SERVICE %~3
) else (
    call :START_SERVICE %~1 "%~2" %~3
)
exit /b

:START_ALL
echo.
call :PRINT "S2jhu59pIMSR4buZbmcgbOG6p24gbMaw4bujdDogQ29yZSBCYWNrZW5kIC0+IEFJIEVuZ2luZSAtPiBGcm9udGVuZC4="
call :START_IF_STOPPED 8000 "Core Backend" backend
call :DELAY_BEFORE_NEXT "AI Engine"
call :START_IF_STOPPED 8001 "AI Engine" ai
call :DELAY_BEFORE_NEXT "Frontend"
call :START_IF_STOPPED 3000 "Frontend" frontend
call :START_WEB_WATCHER
echo.
call :PRINT "W09LXSDEkMOjIGfhu61pIGzhu4duaCBi4bqtdCBk4buLY2ggduG7pS4="
timeout /t 1 /nobreak >nul
exit /b

:START_IF_STOPPED
call :IS_SERVICE_RUNNING %~3
if "!SERVICE_RUNNING!"=="1" exit /b 0
call :START_SERVICE %~1 "%~2" %~3
exit /b

:START_SERVICE
call :CHECK_PORT %~1 "%~2"
if "!PORT_IN_USE!"=="0" (
    call :PRINT "xJBhbmcga2jhu59pIGNo4bqheSBk4buLY2ggduG7pSDhuqluLi4u"
    call :OPEN_HIDDEN %~3
    if errorlevel 1 exit /b 1
) else (
    call :PRINT "W0PhuqJOSCBCw4FPXSBLaMO0bmcgdGjhu4MgYuG6rXQgZOG7i2NoIHbhu6U6IGPhu5VuZyDEkWFuZyDEkcaw4bujYyBz4butIGThu6VuZy4="
    timeout /t 2 /nobreak >nul
    exit /b 1
)
exit /b 0

:DELAY_BEFORE_NEXT
call :PRINT "W0NI4bucXSDEkOG7o2kgdHLGsOG7m2Mga2hpIG3hu58gZOG7i2NoIHbhu6UgdGnhur9wIHRoZW8uLi4="
timeout /t %START_DELAY_SECONDS% /nobreak >nul
exit /b 0

:START_WEB_WATCHER
call :STOP_SERVICE openweb
powershell -NoProfile -Command "$process = Start-Process -FilePath '%~f0' -ArgumentList 'openweb' -WindowStyle Hidden -PassThru; Set-Content -LiteralPath '%PID_DIR%\openweb.pid' -Value $process.Id"
exit /b 0

:OPEN_HIDDEN
del /q "%PID_DIR%\%~1.out.log" "%PID_DIR%\%~1.err.log" >nul 2>&1
powershell -NoProfile -Command "$process = Start-Process -FilePath '%~f0' -ArgumentList '%~1' -WindowStyle Hidden -RedirectStandardOutput '%PID_DIR%\%~1.out.log' -RedirectStandardError '%PID_DIR%\%~1.err.log' -PassThru; Set-Content -LiteralPath '%PID_DIR%\%~1.pid' -Value $process.Id"
if errorlevel 1 (
    echo [LOI] Khong the khoi chay an %~1.
    exit /b 1
)
exit /b 0

:CHECK_PORT
set "PORT_IN_USE=0"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr /R /C:":%~1 .*LISTENING"') do set "PORT_IN_USE=1"
exit /b

:STOP_ALL
echo.
call :PRINT "xJBhbmcgZOG7q25nIGPDoWMgZOG7i2NoIHbhu6UgY2jhuqF5IOG6qW4gdsOgIGPDonkgdGnhur9uIHRyw6xuaCBj4bunYSBjaMO6bmcuLi4="
call :STOP_SERVICE backend
call :STOP_SERVICE ai
call :STOP_SERVICE frontend
call :STOP_SERVICE openweb
call :PRINT "W09LXSDEkMOjIGfhu61pIGzhu4duaCBk4burbmcgQ29yZSBCYWNrZW5kLCBBSSBFbmdpbmUgdsOgIEZyb250ZW5kLg=="
timeout /t 1 /nobreak >nul
exit /b

:STOP_SERVICE
if not exist "%PID_DIR%\%~1.pid" exit /b
set "SERVICE_PID="
set /p "SERVICE_PID="<"%PID_DIR%\%~1.pid"
if defined SERVICE_PID taskkill /PID !SERVICE_PID! /T /F >nul 2>&1
del /q "%PID_DIR%\%~1.pid" >nul 2>&1
exit /b

:EXIT_MENU
echo.
call :PRINT "xJBhbmcgdOG6r3QgdG/DoG4gYuG7mSBk4buLY2ggduG7pSB0csaw4bubYyBraGkgdGhvw6F0Li4u"
call :STOP_SERVICE backend
call :STOP_SERVICE ai
call :STOP_SERVICE frontend
call :STOP_SERVICE openweb
call :PRINT "W09LXSDEkMOjIHThuq90IGPDoWMgZOG7i2NoIHbhu6UgZG8gYuG6o25nIMSRaeG7gXUga2hp4buDbiBt4bufLg=="
exit /b

:WAIT_AND_OPEN_WEB
powershell -NoProfile -Command "$deadline = (Get-Date).AddSeconds(120); $uris = @('http://127.0.0.1:8000/docs', 'http://127.0.0.1:8001/docs', 'http://127.0.0.1:3000'); do { $ready = $true; foreach ($uri in $uris) { try { $null = Invoke-WebRequest -Uri $uri -TimeoutSec 2 -UseBasicParsing } catch { $ready = $false; break } }; if ($ready) { Start-Process 'http://localhost:3000'; exit 0 }; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"
exit /b
