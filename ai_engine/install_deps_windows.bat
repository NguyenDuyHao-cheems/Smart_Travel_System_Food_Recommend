@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo  Smart Travel System - Windows Dependency Installer
echo ==========================================================

:: 1. Check Python virtual environment
set "PIP_CMD=pip"
if exist "venv\Scripts\pip.exe" (
    echo [OK] Found virtual environment. Using venv's pip.
    set "PIP_CMD=venv\Scripts\pip.exe"
) else (
    echo [INFO] No virtual environment (venv) found in current directory. Using system pip.
)

:: 2. Find Visual Studio installation path
set "VS_PATH="
for /f "usebackq tokens=*" %%i in (`where vswhere 2^>nul`) do (
    for /f "usebackq tokens=*" %%j in (`vswhere -latest -property installationPath`) do (
        set "VS_PATH=%%j"
    )
)

if "%VS_PATH%"=="" (
    :: Try default locations if vswhere is not in PATH
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community" (
        set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community"
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional" (
        set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Professional"
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise" (
        set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Enterprise"
    ) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community" (
        set "VS_PATH=C:\Program Files (x86)\Microsoft Visual Studio\2019\Community"
    )
)

if "%VS_PATH%"=="" (
    echo [WARNING] Visual Studio C++ Build Tools not detected automatically.
    echo If pip install fails, please install C++ build tools from:
    echo https://visualstudio.microsoft.com/visual-cpp-build-tools/
    goto RUN_PIP
)

set "VCVARS=%VS_PATH%\VC\Auxiliary\Build\vcvarsall.bat"
if not exist "%VCVARS%" (
    echo [WARNING] vcvarsall.bat not found at %VCVARS%
    goto RUN_PIP
)

echo [OK] Found Visual Studio build tools at: %VS_PATH%
echo [INFO] Initializing MSVC build environment...
call "%VCVARS%" x86_amd64 >nul 2>&1

:: 3. Locate Windows SDK paths to resolve io.h and rc.exe issues
set "SDK_DIR=C:\Program Files (x86)\Windows Kits\10"
if exist "%SDK_DIR%" (
    echo [INFO] Locating Windows SDK...
    :: Find the latest SDK version folder
    set "LATEST_SDK="
    for /f "delims=" %%a in ('dir "%SDK_DIR%\Include" /ad /b /o-n 2^>nul') do (
        if "%%a" neq "wdf" if "%%a" neq "winrt" (
            set "LATEST_SDK=%%a"
            goto FOUND_SDK
        )
    )
    :FOUND_SDK
    if not "!LATEST_SDK!"=="" (
        echo [OK] Using Windows SDK version: !LATEST_SDK!
        set "INCLUDE=%INCLUDE%;%SDK_DIR%\Include\!LATEST_SDK!\ucrt;%SDK_DIR%\Include\!LATEST_SDK!\shared;%SDK_DIR%\Include\!LATEST_SDK!\um"
        set "LIB=%LIB%;%SDK_DIR%\Lib\!LATEST_SDK!\ucrt\x64;%SDK_DIR%\Lib\!LATEST_SDK!\um\x64"
        set "PATH=%PATH%;%SDK_DIR%\bin\!LATEST_SDK!\x64"
    )
)

:RUN_PIP
echo [INFO] Running pip install...
"%PIP_CMD%" install -r requirements.txt

if %ERRORLEVEL% equ 0 (
    echo [OK] Installation completed successfully!
) else (
    echo [ERROR] Installation failed.
    echo Tip: Try running in Docker (docker compose up --build -d) or WSL to avoid Windows C++ compilation issues.
)
pause
