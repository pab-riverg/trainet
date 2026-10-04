# Única fuente de verdad de los roles del módulo de Compras Internas. El frontend los
# replicará en frontend/src/app/modelos/permisos-compras.ts y deben mantenerse iguales.
ROLES_SOLICITUD_COMPRAS = ('empleado', 'supervisor')
ROLES_GESTION_COMPRAS = ('administrador', 'encargado_administrativo')
ROLES_APROBACION_COMPRAS = ('administrador', 'directivo')
# Solo el administrador ajusta el presupuesto disponible del módulo.
ROLES_PRESUPUESTO_COMPRAS = ('administrador',)
ROLES_VISTA_COMPRAS = ('empleado', 'supervisor', 'administrador', 'encargado_administrativo', 'directivo')
# Roles que ven todas las solicitudes (el resto solo las suyas) y consultan proveedores sugeridos.
ROLES_VER_TODAS_SOLICITUDES = ('administrador', 'directivo', 'encargado_administrativo')
