export function guardarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

// Último segmento de la URL de un archivo, decodificado.
export function nombreDeArchivo(url: string): string {
  const ultimo = url.split('?')[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(ultimo);
  } catch {
    return ultimo;
  }
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
