@echo off
rem ============================================================
rem  TRAINET - Restaurar la base de datos desde un respaldo .sql
rem  Uso: scripts\restaurar.bat ruta\al\respaldo.sql [nombre_de_base]
rem  Sin nombre de base se usa DB_NAME de backend\.env.
rem  Crea la base si no existe; pide confirmacion antes de sobrescribir una existente.
rem ============================================================
setlocal EnableExtensions

set "MYSQLBIN=C:\xampp\mysql\bin"

for %%i in ("%~dp0..") do set "RAIZ=%%~fi"
set "ENVFILE=%RAIZ%\backend\.env"
set "SQL=%~1"

if "%SQL%"=="" (
  echo Uso: scripts\restaurar.bat ruta\al\respaldo.sql [nombre_de_base]
  exit /b 1
)
if not exist "%SQL%" (
  echo [ERROR] No se encuentra el archivo %SQL%
  exit /b 1
)
if not exist "%MYSQLBIN%\mysql.exe" (
  echo [ERROR] No se encuentra %MYSQLBIN%\mysql.exe
  exit /b 1
)
if not exist "%ENVFILE%" (
  echo [ERROR] No se encuentra %ENVFILE%
  exit /b 1
)

set "DB_NAME="
set "DB_USER="
set "DB_PASSWORD="
set "DB_HOST="
set "DB_PORT="
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ENVFILE%") do (
  if /i "%%a"=="DB_NAME" set "DB_NAME=%%b"
  if /i "%%a"=="DB_USER" set "DB_USER=%%b"
  if /i "%%a"=="DB_PASSWORD" set "DB_PASSWORD=%%b"
  if /i "%%a"=="DB_HOST" set "DB_HOST=%%b"
  if /i "%%a"=="DB_PORT" set "DB_PORT=%%b"
)
if not "%~2"=="" set "DB_NAME=%~2"
if not defined DB_NAME (
  echo [ERROR] No hay nombre de base: defina DB_NAME en backend\.env o pase el nombre como segundo argumento.
  exit /b 1
)
if not defined DB_USER (
  echo [ERROR] DB_USER no esta definido en backend\.env
  exit /b 1
)
if not defined DB_HOST set "DB_HOST=127.0.0.1"
if not defined DB_PORT set "DB_PORT=3306"
set "MYSQL_PWD=%DB_PASSWORD%"

set "EXISTE="
set "LISTA=%TEMP%\trainet_bases.txt"
"%MYSQLBIN%\mysql.exe" -N -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -e "SHOW DATABASES" > "%LISTA%"
if errorlevel 1 (
  echo [ERROR] No se pudo conectar a MySQL. Revisa que este encendido y las credenciales.
  exit /b 1
)
findstr /x /i /c:"%DB_NAME%" "%LISTA%" >nul && set "EXISTE=1"
del "%LISTA%" 2>nul

if not defined EXISTE goto :crear
echo La base "%DB_NAME%" ya existe y SE SOBRESCRIBIRA con el contenido de:
echo   %SQL%
choice /c SN /n /m "Continuar? (S = si, N = no): "
if errorlevel 2 (
  echo Operacion cancelada. No se cambio nada.
  exit /b 2
)
goto :importar

:crear
echo [1/2] Creando la base "%DB_NAME%"...
"%MYSQLBIN%\mysql.exe" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -e "CREATE DATABASE `%DB_NAME%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
if errorlevel 1 (
  echo [ERROR] No se pudo crear la base.
  exit /b 1
)

:importar
echo [2/2] Importando %SQL% en "%DB_NAME%"...
"%MYSQLBIN%\mysql.exe" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" "%DB_NAME%" < "%SQL%"
if errorlevel 1 (
  echo [ERROR] Fallo la importacion.
  exit /b 1
)

echo Restauracion terminada correctamente en la base "%DB_NAME%".
echo Recuerda descomprimir media_*.zip en backend\media y copiar env_*.txt como backend\.env si es un equipo nuevo.
set "MYSQL_PWD="
exit /b 0
