@echo off
echo =============================================
echo  Geminuel — Iniciando servidor Python
echo =============================================
echo.

if exist .venv\Scripts\python.exe (
    echo Usando entorno virtual .venv...
    echo Iniciando servidor en http://localhost:8000
    echo Presiona Ctrl+C para detener.
    echo.
    .venv\Scripts\python.exe server.py
    pause
    exit /b
)

where uv >nul 2>nul
if %errorlevel% equ 0 (
    echo Usando uv para iniciar el servidor...
    echo Iniciando servidor en http://localhost:8000
    uv run server.py
    pause
    exit /b
)

echo Instalando/verificando dependencias...
pip install -r requirements.txt -q
echo.
echo Iniciando servidor en http://localhost:8000
echo Presiona Ctrl+C para detener.
echo.
python server.py
pause
