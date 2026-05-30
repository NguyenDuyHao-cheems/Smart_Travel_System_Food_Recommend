@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo  Smart Travel System - Windows Dependency Installer
echo ==========================================================

:: 1. Check Python virtual environment
set "PIP_CMD=pip"
set "PYTHON_CMD=python"
if exist "venv\Scripts\pip.exe" (
    echo [OK] Found virtual environment. Using venv's pip.
    set "PIP_CMD=venv\Scripts\pip.exe"
    set "PYTHON_CMD=venv\Scripts\python.exe"
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
:: 4. Select a PyTorch build compatible with the available NVIDIA driver.
:: CUDA wheels bundle their runtime; a local CUDA Toolkit installation is not required.
set "TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu"
set "TORCH_TARGET=CPU"
set "CUDA_VERSION="
set "CUDA_MAJOR=0"
set "CUDA_MINOR=0"

where nvidia-smi >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=9" %%c in ('nvidia-smi ^| findstr /C:"CUDA Version"') do set "CUDA_VERSION=%%c"
    for /f "tokens=1,2 delims=." %%m in ("!CUDA_VERSION!") do (
        set "CUDA_MAJOR=%%m"
        set "CUDA_MINOR=%%n"
    )
    if !CUDA_MAJOR! EQU 11 if !CUDA_MINOR! GEQ 8 (
        set "TORCH_INDEX_URL=https://download.pytorch.org/whl/cu118"
        set "TORCH_TARGET=NVIDIA GPU (CUDA 11.8 wheel)"
    )
    if !CUDA_MAJOR! EQU 12 if !CUDA_MINOR! LSS 6 (
        set "TORCH_INDEX_URL=https://download.pytorch.org/whl/cu118"
        set "TORCH_TARGET=NVIDIA GPU (CUDA 11.8 wheel for pre-12.6 driver)"
    )
    if !CUDA_MAJOR! EQU 12 if !CUDA_MINOR! GEQ 6 (
        set "TORCH_INDEX_URL=https://download.pytorch.org/whl/cu126"
        set "TORCH_TARGET=NVIDIA GPU (CUDA 12.6 wheel)"
    )
    if !CUDA_MAJOR! GEQ 13 (
        set "TORCH_INDEX_URL=https://download.pytorch.org/whl/cu126"
        set "TORCH_TARGET=NVIDIA GPU (CUDA 12.6 wheel compatible with CUDA 13 driver)"
    )
)

echo [INFO] PyTorch target: !TORCH_TARGET!
if defined CUDA_VERSION echo [INFO] NVIDIA driver reports CUDA capability: !CUDA_VERSION!
if "!TORCH_TARGET!"=="CPU" echo [INFO] No supported NVIDIA CUDA runtime detected. AI Engine will run on CPU.

echo [INFO] Installing the selected PyTorch build...
"%PIP_CMD%" install torch --index-url "!TORCH_INDEX_URL!"
if %ERRORLEVEL% neq 0 goto INSTALL_FAILED

echo [INFO] Running pip install for remaining dependencies...
"%PIP_CMD%" install -r requirements.txt
if %ERRORLEVEL% neq 0 goto INSTALL_FAILED

echo [OK] Installation completed successfully!
"%PYTHON_CMD%" -c "import torch; print('[INFO] Torch CUDA available:', torch.cuda.is_available()); print('[INFO] Inference device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
goto END

:INSTALL_FAILED
echo [ERROR] Installation failed.
echo Tip: Try running in Docker (docker compose up --build -d) or WSL to avoid Windows C++ compilation issues.

:END
pause
