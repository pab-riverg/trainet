# TRAINET

Plataforma web de gestión interna y formación para pequeñas y medianas empresas. Reúne en un solo lugar la capacitación del personal, la gestión documental, el soporte técnico, las compras internas, los pedidos de recursos, los proveedores, los reportes y un asistente virtual (Triny). Cada persona ve solo los módulos que su rol permite.

## Tecnologías

| Parte | Tecnología |
| --- | --- |
| Frontend | Angular 21 (componentes standalone, signals, OnPush), Bootstrap 5 y Bootstrap Icons |
| Backend | Django 4.2 + Django REST Framework, autenticación JWT (`djangorestframework-simplejwt`), `django-cors-headers` |
| Base de datos | MySQL (con XAMPP), conector `mysqlclient` |
| Documentos | `openpyxl` (Excel), `python-docx` (Word), `reportlab` (PDF) |
| Pruebas | Vitest vía `ng test` (frontend) y el ejecutor de pruebas de Django (backend) |

## Estructura

```
trainet/
├── backend/            API REST en Django
│   ├── trainet_backend/   Configuración (settings, urls)
│   ├── usuarios/  administracion/  inicio/  dashboard/  busqueda/  notificaciones/
│   ├── capacitacion/  documentos/  soporte/  inventario/  recursos/
│   ├── proveedores/  compras/  reportes/  asistente/
│   ├── requirements.txt
│   └── .env              Variables de entorno (no se versiona)
└── frontend/           Aplicación Angular
    ├── src/app/
    │   ├── estructura/     Shell autenticado: menú lateral, barra superior, barra inferior móvil, buscador
    │   ├── modulos/        Una carpeta por módulo (login, inicio, compras-internas, soporte…)
    │   ├── compartidos/    Componentes reutilizables (paginador, badges, gráfico de barras…)
    │   ├── servicios/  modelos/  utilidades/  guards/  interceptores/
    └── public/             Estilos globales (css/styles.css) e imágenes
```

## Requisitos

- XAMPP con MySQL en ejecución.
- Python 3 y un entorno virtual (`backend/venv`).
- Node.js y Angular CLI (`npm install -g @angular/cli`).

## Puesta en marcha

### 1. Base de datos

Crea una base de datos vacía en MySQL (por ejemplo desde phpMyAdmin) y anota su nombre.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
```

Copia `backend/.env.example` a `backend/.env` y completa los valores (el `.env` no se versiona). Variables:

```
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
SECRET_KEY=
DEBUG=True
TRAINET_SEED_PASSWORD=   # contraseña de los usuarios de prueba (solo para seed_trainet)
```

Después:

```bash
python manage.py migrate
python manage.py seed_trainet     # requiere TRAINET_SEED_PASSWORD en .env (o --password); datos base: sistema, módulos, catálogos y un usuario de prueba por rol
python manage.py runserver        # API en http://127.0.0.1:8000/api/
```

`seed_trainet` es idempotente: se puede volver a ejecutar sin duplicar datos.

### 3. Frontend

```bash
cd frontend
npm install
ng serve                          # http://localhost:4200
```

La URL de la API está en `frontend/src/environments/environment.ts` (por defecto `http://127.0.0.1:8000/api`). El backend permite CORS desde `http://localhost:4200`.

## Usuarios de prueba

`seed_trainet` crea un usuario por cada rol, con el correo `<rol>@trainet.com` (por ejemplo `administrador@trainet.com`). Todos se crean con la contraseña que definas en `TRAINET_SEED_PASSWORD` (en `backend/.env`) o pases con `--password`; sin ella el comando se detiene antes de escribir datos. La contraseña solo se asigna al crear cada usuario: los que ya existen no se modifican, aunque cambies la variable. Úsala solo en desarrollo.

Roles: administrador, directivo, supervisor, empleado, recursos_humanos, encargado_formacion, encargado_documental, capacitador, tecnico_soporte, encargado_administrativo y proveedor_contenido.

## Módulos

Inicio, Dashboard, Triny AI (asistente virtual y su entrenamiento), Administrador (panel, configuración y bitácora), Inventario de contenido, Usuarios, Compras internas, Reportes, Capacitación, Documentos, Soporte técnico, Pedido de recursos, Proveedores, Ajustes, Ayuda y Perfil. El menú de cada rol lo declara el backend (`backend/inicio/modulos.py`).

## Pruebas

```bash
cd backend && python manage.py test
cd frontend && ng test
```

## Notas

- Comandos de mantenimiento disponibles: `normalizar_formatos`, `normalizar_estados_tickets`, `asignar_rutas_notificaciones` y `crear_perfiles_faltantes` (`python manage.py <comando>`).
- En desarrollo el correo de recuperación de contraseña se escribe en la consola del servidor (`EmailBackend` de consola).
- Los archivos subidos se guardan en `backend/media/`.
- El modo oscuro y el diseño responsive (móvil, tablet, escritorio) están integrados en el frontend.

## Respaldo y restauración

**Qué se respalda:** la base de datos MySQL (`.sql`), la carpeta `backend/media/` (`.zip`) y el archivo `backend/.env` (copiado como `env_AAAA-MM-DD.txt`).

> `.env` contiene secretos (clave de Django y credenciales de la base). Guarda los respaldos solo en una carpeta privada. Los respaldos no se suben a GitHub (`*.sql`, `*.zip` y `backups/` están en `.gitignore`).

**Hacer un respaldo:** con MySQL de XAMPP encendido, ejecuta `scripts\respaldo.bat`. Lee las credenciales de `backend\.env`, crea una carpeta `AAAA-MM-DD_HHMM` dentro de `DESTINO` (por defecto `C:\Backups\trainet`; cámbiala al inicio del script, por ejemplo a la carpeta sincronizada con Google Drive) y conserva solo los últimos 7 respaldos.

**Programarlo a diario (Programador de tareas de Windows):**
1. Abre "Programador de tareas" → "Crear tarea básica".
2. Nombre: `Respaldo TRAINET`; desencadenador: Diariamente, a la hora que prefieras (con el equipo encendido y MySQL en marcha).
3. Acción: "Iniciar un programa" → programa: `C:\xampp\htdocs\proyecto\trainet\scripts\respaldo.bat`.
4. Finaliza y, en las propiedades de la tarea, marca "Ejecutar tanto si el usuario inició sesión como si no" si quieres que corra sin sesión abierta.

**Restaurar en un equipo nuevo:**
1. Clona el repositorio e instala XAMPP (MySQL encendido).
2. Crea el entorno virtual e instala dependencias: `cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt`.
3. Copia `env_AAAA-MM-DD.txt` como `backend\.env`.
4. Restaura la base: `scripts\restaurar.bat ruta\trainet_AAAA-MM-DD_HHMM.sql` (crea la base si no existe; si ya existe pide confirmación antes de sobrescribirla). Opcionalmente, pasa un segundo argumento con otro nombre de base.
5. Descomprime `media_AAAA-MM-DD_HHMM.zip` dentro de `backend\media\`.
6. Instala el frontend: `cd frontend && npm install`.
