export interface SegmentoTexto {
  texto: string;
  // True en los fragmentos que coinciden con la búsqueda (se pintan con <mark>).
  coincide: boolean;
}

// Una letra sin su tilde ("Á" -> "a"), carácter por carácter para conservar las posiciones del texto original.
function sinTilde(caracter: string): string {
  const base = caracter.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return base.length === 1 ? base : caracter.toLowerCase();
}

/**
 * Divide `texto` en fragmentos marcando las coincidencias con `busqueda`, sin distinguir mayúsculas ni tildes.
 * Devuelve segmentos de texto plano: la plantilla los pinta con interpolación y <mark>, nunca con HTML crudo.
 */
export function segmentosResaltados(texto: string, busqueda: string): SegmentoTexto[] {
  const aguja = Array.from(busqueda.trim()).map(sinTilde).join('');
  if (!aguja) {
    return [{ texto, coincide: false }];
  }
  const caracteres = Array.from(texto);
  const pajar = caracteres.map(sinTilde).join('');
  // Con alguna letra rara el largo cambiaría y las posiciones dejarían de coincidir: no se resalta.
  if (pajar.length !== caracteres.length) {
    return [{ texto, coincide: false }];
  }

  const segmentos: SegmentoTexto[] = [];
  let desde = 0;
  let posicion = pajar.indexOf(aguja);
  while (posicion !== -1) {
    if (posicion > desde) {
      segmentos.push({ texto: caracteres.slice(desde, posicion).join(''), coincide: false });
    }
    segmentos.push({ texto: caracteres.slice(posicion, posicion + aguja.length).join(''), coincide: true });
    desde = posicion + aguja.length;
    posicion = pajar.indexOf(aguja, desde);
  }
  if (desde < caracteres.length) {
    segmentos.push({ texto: caracteres.slice(desde).join(''), coincide: false });
  }
  return segmentos;
}
