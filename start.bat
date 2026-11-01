@echo off
echo =============================================
echo  Geminuel — Iniciando servidor Python
echo =============================================
echo.
echo Instalando/verificando dependencias...
pip install -r requirements.txt -q
echo.
echo Iniciando servidor en http://localhost:8000
echo Presiona Ctrl+C para detener.
echo.
python server.py
pause
