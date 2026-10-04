import { CATALOGO_ROLES } from '../modelos/roles';

// Contenido de la landing pública. Se edita solo aquí: el HTML del home únicamente lo recorre.

export const TITULO_PAGINA_HOME = 'TRAINET — Plataforma LMS para PYMEs';

/** Fragmento (id de sección) al que apunta cada enlace ancla. */
export type AnclaHome = 'funciones' | 'roles' | 'triny' | 'sobre-trainet';

export const ANCLAS_HOME: readonly { id: AnclaHome; texto: string }[] = [
  { id: 'funciones', texto: 'Funciones' },
  { id: 'roles', texto: 'Roles' },
  { id: 'triny', texto: 'Triny AI' },
  { id: 'sobre-trainet', texto: 'Sobre Trainet' }
];

/** Misma clave de sesión que usa el authGuard. */
const CLAVE_TOKEN = 'trainet_token';

/** True si el navegador ya tiene una sesión iniciada (mismo criterio que authGuard). */
export function haySesionActiva(): boolean {
  try {
    return !!localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return false;
  }
}

// --- Capturas del producto ---

export type CapturaId = 'dashboard' | 'capacitacion' | 'triny' | 'usuarios';

export interface CapturaProducto {
  id: CapturaId;
  /** Nombre de la pestaña y del marcador de posición. */
  etiqueta: string;
  /** Clase de Bootstrap Icons del marcador de posición. */
  icono: string;
  /** Imagen en frontend/public (proporción ≈ 16:9). */
  ruta: string;
  alt: string;
}

/** Única fuente de las rutas de las capturas: se añaden después como .webp en public/img/home. */
export const CAPTURAS_PRODUCTO: readonly CapturaProducto[] = [
  {
    id: 'dashboard', etiqueta: 'Dashboard', icono: 'bi-speedometer2',
    ruta: '/img/home/dashboard.webp', alt: 'Captura del Dashboard de TRAINET con los indicadores de la gestión'
  },
  {
    id: 'capacitacion', etiqueta: 'Capacitación', icono: 'bi-mortarboard',
    ruta: '/img/home/capacitacion.webp', alt: 'Captura del módulo de Capacitación de TRAINET'
  },
  {
    id: 'triny', etiqueta: 'Triny', icono: 'bi-robot',
    ruta: '/img/home/triny.webp', alt: 'Captura de una conversación con Triny, el asistente virtual de TRAINET'
  },
  {
    id: 'usuarios', etiqueta: 'Usuarios', icono: 'bi-people',
    ruta: '/img/home/usuarios.webp', alt: 'Captura del módulo de Usuarios de TRAINET'
  }
];

export function capturaPorId(id: CapturaId): CapturaProducto {
  return CAPTURAS_PRODUCTO.find(captura => captura.id === id) ?? CAPTURAS_PRODUCTO[0];
}

// --- Contenido por sección ---

export interface TarjetaHome {
  titulo: string;
  descripcion: string;
  /** Clase de Bootstrap Icons. */
  icono: string;
}

export const FUNCIONES_PRINCIPALES: readonly TarjetaHome[] = [
  {
    titulo: 'Capacitación del personal', icono: 'bi-mortarboard',
    descripcion: 'Cursos digitales, capacitaciones programadas y seguimiento de la participación de cada empleado.'
  },
  {
    titulo: 'Asistente virtual con IA', icono: 'bi-robot',
    descripcion: 'Triny responde las dudas frecuentes con la información que tu empresa le enseña.'
  },
  {
    titulo: 'Gestión documental', icono: 'bi-folder2-open',
    descripcion: 'Documentos corporativos organizados por tipo y categoría, con control de versiones.'
  }
];

export const FUNCIONES: readonly TarjetaHome[] = [
  {
    titulo: 'Formación', icono: 'bi-mortarboard',
    descripcion: 'Crea cursos, programa capacitaciones, inscribe empleados, registra asistencia y evidencias, e incrusta videos por enlace. Consulta el historial y el progreso de cada persona.'
  },
  {
    titulo: 'Contenido y documentos', icono: 'bi-journal-text',
    descripcion: 'Inventario de contenido educativo y biblioteca de documentos institucionales, organizados por categoría, con control de versiones.'
  },
  {
    titulo: 'Asistente virtual Triny', icono: 'bi-robot',
    descripcion: 'Responde preguntas frecuentes con la base de conocimiento de tu empresa y registra las que no sabe para que puedas mejorarlo.'
  },
  {
    titulo: 'Operación diaria', icono: 'bi-box-seam',
    descripcion: 'Pedidos de recursos, soporte técnico con tickets, compras internas con cotizaciones y directorio de proveedores, todo con seguimiento por estado.'
  },
  {
    titulo: 'Reportes y análisis', icono: 'bi-bar-chart-line',
    descripcion: 'Informes de la operación y exportación en PDF, Excel y Word.'
  },
  {
    titulo: 'Usuarios y control de acceso', icono: 'bi-shield-lock',
    descripcion: 'Cuentas, roles y permisos, notificaciones con acceso directo y bitácora de actividad.'
  }
];

export interface RolHome {
  /** Código del catálogo de roles del sistema (de ahí sale el nombre mostrado). */
  codigo: string;
  descripcion: string;
}

export const ROLES_HOME: readonly RolHome[] = [
  { codigo: 'administrador', descripcion: 'Gestiona usuarios, permisos y la configuración del sistema.' },
  { codigo: 'directivo', descripcion: 'Consulta reportes ejecutivos para decisiones estratégicas.' },
  { codigo: 'supervisor', descripcion: 'Da seguimiento a su equipo y aprueba solicitudes.' },
  { codigo: 'empleado', descripcion: 'Accede a capacitaciones, documentos y al asistente virtual.' },
  { codigo: 'recursos_humanos', descripcion: 'Gestiona empleados, asigna capacitaciones y registra la participación.' },
  { codigo: 'encargado_formacion', descripcion: 'Diseña y coordina los contenidos de capacitación.' },
  { codigo: 'encargado_documental', descripcion: 'Administra y organiza los documentos institucionales.' },
  { codigo: 'capacitador', descripcion: 'Crea y actualiza contenidos formativos.' },
  { codigo: 'tecnico_soporte', descripcion: 'Atiende incidentes técnicos.' },
  { codigo: 'encargado_administrativo', descripcion: 'Apoya la gestión documental y los pedidos internos.' },
  { codigo: 'proveedor_contenido', descripcion: 'Ofrece cursos o materiales externos contratados por la empresa.' }
];

/** Códigos de ROLES_HOME que no existen en el catálogo central (debe ser vacío; lo verifica el spec). */
export function rolesSinCatalogo(): string[] {
  return ROLES_HOME.filter(rol => !CATALOGO_ROLES.some(opcion => opcion.codigo === rol.codigo)).map(rol => rol.codigo);
}

export interface PuntoTriny {
  texto: string;
  icono: string;
}

export const PUNTOS_TRINY: readonly PuntoTriny[] = [
  { texto: 'Responde al instante las preguntas frecuentes', icono: 'bi-lightning-charge' },
  { texto: 'Se entrena con las respuestas de tu empresa', icono: 'bi-journal-check' },
  { texto: 'Aprende de las preguntas que aún no sabe contestar', icono: 'bi-lightbulb' }
];
