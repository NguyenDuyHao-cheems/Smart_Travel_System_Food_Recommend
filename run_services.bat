@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

if /i "%~1"=="backend" goto RUN_BACKEND
if /i "%~1"=="ai" goto RUN_AI
if /i "%~1"=="frontend" goto RUN_FRONTEND

title Smart Travel System - Service Menu
set "START_DELAY_SECONDS=5"
set "PID_DIR=%TEMP%\smart_travel_runner_%RANDOM%_%RANDOM%"
md "%PID_DIR%" >nul 2>&1

:MENU
cls
echo =====================================================================
echo             SMART TRAVEL SYSTEM - SERVICE MENU
echo =====================================================================
echo.
echo Moi service se mo trong mot terminal RIENG, HIEN THI tren man hinh.
echo Terminal menu nay luon mo de ban co the khoi dong hoac dung service.
echo.
echo Kiem tra/cai dependency con thieu khi khoi dong: BAT BUOC
echo Thoi gian gian cach khi khoi dong tat ca: %START_DELAY_SECONDS% giay
echo.
echo  [1] Khoi dong Core Backend     ^(http://localhost:8000/docs^)
echo  [2] Khoi dong AI Engine        ^(http://localhost:8001/docs^)
echo  [3] Khoi dong Frontend         ^(http://localhost:3000^)
echo  [4] Khoi dong tat ca service
echo  [5] Tat toan bo service do menu nay mo
echo  [0] Tat toan bo va thoat
echo.
set "MENU_CHOICE="
set /p "MENU_CHOICE=Nhap lua chon: "

if "%MENU_CHOICE%"=="1" call :START_BACKEND
if "%MENU_CHOICE%"=="2" call :START_AI
if "%MENU_CHOICE%"=="3" call :START_FRONTEND
if "%MENU_CHOICE%"=="4" call :START_ALL
if "%MENU_CHOICE%"=="5" call :STOP_ALL
if "%MENU_CHOICE%"=="0" goto EXIT_MENU

if not "%MENU_CHOICE%"=="1" if not "%MENU_CHOICE%"=="2" if not "%MENU_CHOICE%"=="3" if not "%MENU_CHOICE%"=="4" if not "%MENU_CHOICE%"=="5" if not "%MENU_CHOICE%"=="0" (
    echo.
    echo [LOI] Lua chon khong hop le.
    call :WAIT_FOR_MENU
)
goto MENU

:START_BACKEND
call :CHECK_PORT 8000 "Core Backend"
if "!PORT_IN_USE!"=="1" (
    echo.
    echo [CANH BAO] Core Backend khong duoc mo: cong 8000 dang duoc su dung.
    call :WAIT_FOR_MENU
    exit /b
)
echo.
echo [BACKEND] Dang mo terminal Core Backend...
call :OPEN_TERMINAL backend
call :WAIT_FOR_MENU
exit /b

:START_AI
call :CHECK_PORT 8001 "AI Engine"
if "!PORT_IN_USE!"=="1" (
    echo.
    echo [CANH BAO] AI Engine khong duoc mo: cong 8001 dang duoc su dung.
    call :WAIT_FOR_MENU
    exit /b
)
echo.
echo [AI ENGINE] Dang mo terminal AI Engine...
call :OPEN_TERMINAL ai
call :WAIT_FOR_MENU
exit /b

:START_FRONTEND
call :CHECK_PORT 3000 "Frontend"
if "!PORT_IN_USE!"=="1" (
    echo.
    echo [CANH BAO] Frontend khong duoc mo: cong 3000 dang duoc su dung.
    call :WAIT_FOR_MENU
    exit /b
)
echo.
echo [FRONTEND] Dang mo terminal Frontend...
call :OPEN_TERMINAL frontend
call :WAIT_FOR_MENU
exit /b

:START_ALL
echo.
echo Khoi dong cach nhau %START_DELAY_SECONDS% giay: Core Backend -^> AI Engine -^> Frontend.
call :START_SERVICE 8000 "Core Backend" backend
if errorlevel 1 goto START_ALL_FAILED
call :DELAY_BEFORE_NEXT "AI Engine"
call :START_SERVICE 8001 "AI Engine" ai
if errorlevel 1 goto START_ALL_FAILED
call :DELAY_BEFORE_NEXT "Frontend"
call :START_SERVICE 3000 "Frontend" frontend
if errorlevel 1 goto START_ALL_FAILED
echo.
echo [OK] Da mo terminal cho tat ca service. Xem log tren tung terminal de kiem tra trang thai.
call :WAIT_FOR_MENU
exit /b

:START_ALL_FAILED
echo.
echo [LOI] Khong the hoan thanh viec mo terminal service. Kiem tra terminal dang hien thi.
echo       Dung lua chon [5] neu can tat cac service da khoi dong.
call :WAIT_FOR_MENU
exit /b

:START_SERVICE
call :CHECK_PORT %~1 "%~2"
if "!PORT_IN_USE!"=="0" (
    echo [%~2] Dang mo terminal...
    call :OPEN_TERMINAL %~3
    if errorlevel 1 exit /b 1
) else (
    echo [CANH BAO] %~2 khong duoc mo: cong %~1 dang duoc su dung.
    exit /b 1
)
exit /b 0

:DELAY_BEFORE_NEXT
echo [CHO] Doi %START_DELAY_SECONDS% giay truoc khi mo %~1...
timeout /t %START_DELAY_SECONDS% /nobreak >nul
exit /b 0

:OPEN_TERMINAL
powershell -NoProfile -Command "$process = Start-Process -FilePath '%~f0' -ArgumentList '%~1' -WindowStyle Normal -PassThru; Set-Content -LiteralPath '%PID_DIR%\%~1.pid' -Value $process.Id"
if errorlevel 1 (
    echo [LOI] Khong the mo terminal cho %~1.
    exit /b 1
)
exit /b 0

:CHECK_PORT
set "PORT_IN_USE=0"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr /R /C:":%~1 .*LISTENING"') do set "PORT_IN_USE=1"
exit /b

:STOP_ALL
echo.
echo Dang dung cac terminal service va cay tien trinh cua chung...
call :STOP_SERVICE backend
call :STOP_SERVICE ai
call :STOP_SERVICE frontend
echo [OK] Da gui lenh dung cho Core Backend, AI Engine va Frontend do menu mo.
call :WAIT_FOR_MENU
exit /b

:STOP_SERVICE
if not exist "%PID_DIR%\%~1.pid" exit /b
set "SERVICE_PID="
set /p "SERVICE_PID="<"%PID_DIR%\%~1.pid"
if defined SERVICE_PID taskkill /PID !SERVICE_PID! /T /F >nul 2>&1
del /q "%PID_DIR%\%~1.pid" >nul 2>&1
exit /b

:WAIT_FOR_MENU
echo.
pause
exit /b

:EXIT_MENU
echo.
echo Dang tat toan bo service truoc khi thoat...
call :STOP_SERVICE backend
call :STOP_SERVICE ai
call :STOP_SERVICE frontend
rd "%PID_DIR%" >nul 2>&1
echo [OK] Da tat cac terminal service do menu mo.
exit /b

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
    echo [LOI] Khong tim thay Node.js trong PATH. Can Node.js >= 20.x.
    goto SERVICE_FAILED
)
echo [THONG BAO] Dang kiem tra dependency frontend va cai nhung goi con thieu...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [LOI] Kiem tra/cai dependency frontend that bai.
    goto SERVICE_FAILED
)
echo.
echo [OK] Dang khoi chay Next.js development server...
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
        echo [LOI] Khong tim thay Python trong PATH. Can Python >= 3.10 de tao venv.
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
echo.
if errorlevel 1 (
    echo [LOI] Service da dung voi ma loi %errorlevel%.
) else (
    echo [THONG BAO] Service da dung.
)

:SERVICE_FAILED
echo.
echo Terminal nay duoc giu mo de ban xem log. Dong cua so hoac dung tu menu chinh.
pause
exit /b
