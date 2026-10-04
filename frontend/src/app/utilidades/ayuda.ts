import { ConsultaFrecuente } from '../modelos/asistente';
import { ModuloMenu } from '../modelos/inicio';

// Correo de contacto de la página de ayuda. Es una dirección ficticia de demostración: se cambia solo aquí.
export const CORREO_CONTACTO_AYUDA = 'contactoayuda@trainet.com';

// Una línea descriptiva por módulo (clave del registro de módulos del backend). Sin descripción, solo el nombre.
export const DESCRIPCIONES_MODULOS: Readonly<Record<string, string>> = {
  inicio: 'Resumen de lo que necesita tu atención.',
  dashboard: 'Indicadores y gráficos de la gestión.',
  triny: 'Asistente virtual para resolver dudas.',
  administrador: 'Panel, bitácora y configuración del sistema.',
  inventario: 'Biblioteca de contenidos de formación.',
  usuarios: 'Gestión de usuarios y empleados.',
  compras: 'Solicitudes de compra y catálogo de artículos.',
  reportes: 'Informes de gestión y archivos importados.',
  capacitacion: 'Cursos, capacitaciones, inscripciones y materiales.',
  documentos: 'Biblioteca de documentos de la organización.',
  soporte: 'Reporta problemas y sigue tus tickets.',
  recursos: 'Solicita recursos y consulta tus pedidos.',
  proveedores: 'Directorio de proveedores, acuerdos y necesidades.',
  ajustes: 'Apariencia y cierre de sesión.'
};

/** Texto en minúsculas y sin tildes, para comparar sin importar acentos ni mayúsculas. */
export function normalizarBusqueda(texto: string): string {
  return texto.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Preguntas cuya pregunta o respuesta contienen el texto buscado. Sin texto devuelve todas. */
export function filtrarPreguntas(preguntas: readonly ConsultaFrecuente[], texto: string): ConsultaFrecuente[] {
  const buscado = normalizarBusqueda(texto);
  if (!buscado) {
    return [...preguntas];
  }
  return preguntas.filter(p => normalizarBusqueda(`${p.pregunta} ${p.respuesta}`).includes(buscado));
}

export interface ModuloGuia {
  clave: string;
  titulo: string;
  ruta: string;
  icono: string;
  descripcion: string | null;
}

/** Guía de módulos del usuario: los que entrega el backend para su rol (sin la propia ayuda), con su descripción. */
export function guiaDeModulos(modulos: readonly ModuloMenu[]): ModuloGuia[] {
  return modulos
    .filter(modulo => modulo.clave !== 'ayuda')
    .map(modulo => ({
      clave: modulo.clave,
      titulo: modulo.titulo,
      ruta: modulo.ruta,
      icono: modulo.icono,
      descripcion: DESCRIPCIONES_MODULOS[modulo.clave] ?? null
    }));
}
