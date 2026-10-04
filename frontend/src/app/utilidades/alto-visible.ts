/**
 * Mantiene la variable CSS --alto-visible en <html> igual al alto del viewport visual. En iOS Safari el teclado no
 * redimensiona ni `100dvh` ni el meta `interactive-widget`, así que la página del chat usa esta variable para que su campo
 * de texto quede encima del teclado. Devuelve la función que quita el listener y la variable (llamarla al salir del chat).
 * Sin `visualViewport` no hace nada.
 */
export function seguirAltoVisible(documento: Document): () => void {
  const visor = documento.defaultView?.visualViewport;
  if (!visor) {
    return () => undefined;
  }

  const raiz = documento.documentElement;
  const aplicar = () => raiz.style.setProperty('--alto-visible', `${visor.height}px`);
  aplicar();
  visor.addEventListener('resize', aplicar);

  return () => {
    visor.removeEventListener('resize', aplicar);
    raiz.style.removeProperty('--alto-visible');
  };
}
