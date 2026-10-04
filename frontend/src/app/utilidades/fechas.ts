export function tiempoRelativo(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) {
    return '';
  }

  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) {
    return 'hace un momento';
  }

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) {
    return `hace ${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `hace ${horas} h`;
  }

  const dias = Math.floor(horas / 24);
  if (dias <= 7) {
    return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}
