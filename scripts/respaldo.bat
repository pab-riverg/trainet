@echo off
rem ============================================================
rem  TRAINET - Respaldo: base de datos (.sql), media (.zip) y .env
rem  Uso: scripts\respaldo.bat
rem  Las credenciales se leen de backend\.env (nunca se imprimen).
rem ============================================================
setlocal EnableExtensions

rem ===== Configuracion (cambia DESTINO a la carpeta sincronizada con Google Drive) =====
set "DESTINO=C:\Backups\trainet"
set "MYSQLBIN=C:\xampp\mysql\bin"
set "CONSERVAR=7"
rem ====================================================================================

for %%i in ("%~dp0..") do set "RAIZ=%%~fi"
set "ENVFILE=%RAIZ%\backend\.env"
set "MEDIA=%RAIZ%\backend\media"

if not exist "%ENVFILE%" (
  echo [ERROR] No se encuentra %ENVFILE%
  exit /b 1
)
if not exist "%MYSQLBIN%\mysqldump.exe" (
  echo [ERROR] No se encuentra %MYSQLBIN%\mysqldump.exe
  exit /b 1
)

rem --- Leer las variables DB_* de .env ---
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
if not defined DB_NAME (
  echo [ERROR] DB_NAME no esta definido en backend\.env
  exit /b 1
)
if not defined DB_USER (
  echo [ERROR] DB_USER no esta definido en backend\.env
  exit /b 1
)
if not defined DB_HOST set "DB_HOST=127.0.0.1"
if not defined DB_PORT set "DB_PORT=3306"
rem La contrasena se pasa por variable de entorno para que no aparezca en la linea de comandos.
set "MYSQL_PWD=%DB_PASSWORD%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set "SELLO=%%i"
set "FECHA=%SELLO:~0,10%"
set "CARPETA=%DESTINO%\%SELLO%"

echo [1/6] Creando carpeta de respaldo: %CARPETA%
mkdir "%CARPETA%" 2>nul
if not exist "%CARPETA%" (
  echo [ERROR] No se pudo crear %CARPETA%
  exit /b 1
)

echo [2/6] Exportando la base de datos "%DB_NAME%"...
"%MYSQLBIN%\mysqldump.exe" --single-transaction --routines --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" --result-file="%CARPETA%\trainet_%SELLO%.sql" "%DB_NAME%"
if errorlevel 1 (
  echo [ERROR] Fallo mysqldump. Revisa que MySQL este encendido y las credenciales de backend\.env.
  del "%CARPETA%\trainet_%SELLO%.sql" 2>nul
  exit /b 1
)
echo       OK: trainet_%SELLO%.sql

echo [3/6] Comprimiendo backend\media...
if not exist "%MEDIA%" (
  echo [AVISO] No existe backend\media; se omite este paso.
) else (
  powershell -NoProfile -Command "Compress-Archive -Path '%MEDIA%\*' -DestinationPath '%CARPETA%\media_%SELLO%.zip' -Force"
  if errorlevel 1 (
    echo [ERROR] Fallo la compresion de media.
    exit /b 1
  )
  echo       OK: media_%SELLO%.zip
)

echo [4/6] Copiando backend\.env (contiene secretos: guarda el respaldo solo en una carpeta privada)...
copy /y "%ENVFILE%" "%CARPETA%\env_%FECHA%.txt" >nul
if errorlevel 1 (
  echo [ERROR] No se pudo copiar el .env
  exit /b 1
)
echo       OK: env_%FECHA%.txt

echo [5/6] Conservando solo los ultimos %CONSERVAR% respaldos...
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%DESTINO%' -Directory | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{4}$' } | Sort-Object Name -Descending | Select-Object -Skip %CONSERVAR% | ForEach-Object { Write-Host ('       Borrado: ' + $_.Name); Remove-Item -LiteralPath $_.FullName -Recurse -Force }"
if errorlevel 1 (
  echo [ERROR] Fallo la limpieza de respaldos antiguos.
  exit /b 1
)

echo [6/6] Respaldo terminado correctamente en %CARPETA%
set "MYSQL_PWD="
exit /b 0
