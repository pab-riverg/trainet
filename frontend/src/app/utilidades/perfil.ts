/** Iniciales (hasta dos) de un nombre para el avatar; 'US' si no hay nombre. */
export function inicialesDe(nombre: string | null | undefined): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  const iniciales = (palabras[0]?.charAt(0) ?? '') + (palabras.length > 1 ? palabras[1].charAt(0) : '');
  return iniciales.toUpperCase() || 'US';
}
