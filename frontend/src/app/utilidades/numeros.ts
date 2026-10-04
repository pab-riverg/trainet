// Formatos numéricos compartidos (teléfonos, cédula, NIT y dinero). Funciones puras y límites en un solo lugar.
// Los límites deben mantenerse iguales a backend/trainet_backend/validadores.py

export const PREFIJO_TELEFONO_MIN = 1;
export const PREFIJO_TELEFONO_MAX = 3;
export const NUMERO_TELEFONO_MIN = 7;
export const NUMERO_TELEFONO_MAX = 12;
export const PREFIJO_POR_DEFECTO = '57';
export const CEDULA_MIN = 6;
export const CEDULA_MAX = 10;
export const NIT_MIN = 7;
export const NIT_MAX = 10;
// Dinero: pesos enteros, hasta 12 dígitos.
export const DINERO_MAX_DIGITOS = 12;

export interface TelefonoPartes {
  prefijo: string;
  numero: string;
}

export function soloDigitos(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\D+/g, '');
}

// Agrupa los dígitos de a tres con punto ("1234567" -> "1.234.567"), conservando ceros a la izquierda.
export function formatearMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// --- Teléfono: cadena canónica "+<prefijo> <número>" ---

const PATRON_CANONICO = new RegExp(
  `^\\+(\\d{${PREFIJO_TELEFONO_MIN},${PREFIJO_TELEFONO_MAX}}) (\\d{${NUMERO_TELEFONO_MIN},${NUMERO_TELEFONO_MAX}})$`
);

export function esTelefonoCanonico(valor: string | null | undefined): boolean {
  return PATRON_CANONICO.test((valor ?? '').trim());
}

export function componerTelefono(prefijo: string, numero: string): string {
  return `+${prefijo} ${numero}`;
}

/**
 * Descompone la cadena guardada en prefijo y número. Tolera datos antiguos:
 * "+57 3001234567" (canónico), "3001234567" o "300 123-4567" (sin "+": prefijo 57),
 * "+573001234567" (sin espacio: mejor esfuerzo, prefijo de 2 dígitos si el resto cabe).
 */
export function parsearTelefono(valor: string | null | undefined): TelefonoPartes {
  const texto = (valor ?? '').trim();
  if (!texto) {
    return { prefijo: PREFIJO_POR_DEFECTO, numero: '' };
  }
  const canonico = PATRON_CANONICO.exec(texto);
  if (canonico) {
    return { prefijo: canonico[1], numero: canonico[2] };
  }
  const digitos = soloDigitos(texto);
  if (texto.startsWith('+')) {
    const conEspacio = /^\+(\d{1,3})\s+(.*)$/.exec(texto);
    if (conEspacio) {
      return { prefijo: conEspacio[1], numero: soloDigitos(conEspacio[2]) };
    }
    for (const largo of [2, 3, 1]) {
      const resto = digitos.slice(largo);
      if (resto.length >= NUMERO_TELEFONO_MIN && resto.length <= NUMERO_TELEFONO_MAX) {
        return { prefijo: digitos.slice(0, largo), numero: resto };
      }
    }
  }
  return { prefijo: PREFIJO_POR_DEFECTO, numero: digitos };
}

// Cadena canónica de lo que se pueda interpretar; '' si no hay ningún dígito de número.
export function normalizarTelefono(valor: string | null | undefined): string {
  const { prefijo, numero } = parsearTelefono(valor);
  return numero ? componerTelefono(prefijo, numero) : '';
}

// "+57 300 123 4567" (3-3-resto) o "+57 123 4567" cuando son 7 dígitos. Si no se puede interpretar, el texto original.
export function formatearTelefono(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim();
  if (!texto) {
    return '—';
  }
  // Los datos antiguos que se pueden interpretar ("3001234567") se muestran ya con el formato nuevo.
  const canonico = PATRON_CANONICO.exec(texto) ?? PATRON_CANONICO.exec(normalizarTelefono(texto));
  if (!canonico) {
    return texto;
  }
  const [, prefijo, numero] = canonico;
  const agrupado = numero.length === 7
    ? `${numero.slice(0, 3)} ${numero.slice(3)}`
    : [numero.slice(0, 3), numero.slice(3, 6), numero.slice(6)].filter(Boolean).join(' ');
  return `+${prefijo} ${agrupado}`;
}

// --- Cédula y NIT ---

function soloDigitosEnRango(valor: string | null | undefined, min: number, max: number): string | null {
  const texto = (valor ?? '').trim();
  return /^\d+$/.test(texto) && texto.length >= min && texto.length <= max ? texto : null;
}

// "1.234.567.890". Si no se puede interpretar, el texto original.
export function formatearCedula(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim();
  if (!texto) {
    return '—';
  }
  const digitos = soloDigitosEnRango(texto, CEDULA_MIN, CEDULA_MAX);
  return digitos ? formatearMiles(digitos) : texto;
}

// "900.123.456-7": los dígitos antes del último con puntos de miles, guion y el dígito de verificación.
export function formatearNit(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim();
  if (!texto) {
    return '—';
  }
  const digitos = soloDigitosEnRango(texto, NIT_MIN, NIT_MAX);
  return digitos ? `${formatearMiles(digitos.slice(0, -1))}-${digitos.slice(-1)}` : texto;
}

// Valor para editar: solo dígitos ("900.123.456-7" -> "9001234567"), sin formato.
export function nitParaEditar(valor: string | null | undefined): string {
  return soloDigitos(valor);
}

// --- Dinero ---

// Entero que representan los dígitos de un texto, o null si no hay (sin ceros a la izquierda).
export function digitosADinero(digitos: string): number | null {
  const limpio = digitos.replace(/^0+(?=\d)/, '');
  return limpio === '' ? null : Number(limpio);
}
