import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

/** Misma clave que ya usaba Ajustes ('true' / 'false'). */
export const CLAVE_MODO_OSCURO = 'trainet_modo_oscuro';

/**
 * Modo oscuro de la aplicación con sesión. La preferencia es solo del usuario (por defecto claro, no sigue al
 * sistema operativo). Los atributos de tema solo están en <html> mientras el shell autenticado está montado
 * (`activar()` / `desactivar()`), así la landing, el login y las pantallas públicas nunca se oscurecen.
 */
@Injectable({ providedIn: 'root' })
export class Tema {

  private documento = inject(DOCUMENT);

  readonly modoOscuro = signal(this.leerPreferencia());
  private shellActivo = signal(false);

  constructor() {
    effect(() => this.aplicar(this.modoOscuro() && this.shellActivo()));
  }

  /** Lee la preferencia guardada; sin almacenamiento disponible el tema es claro. */
  leerPreferencia(): boolean {
    try {
      return localStorage.getItem(CLAVE_MODO_OSCURO) === 'true';
    } catch {
      return false;
    }
  }

  establecer(oscuro: boolean): void {
    this.modoOscuro.set(oscuro);
    try {
      localStorage.setItem(CLAVE_MODO_OSCURO, String(oscuro));
    } catch {
      // Sin almacenamiento: el cambio dura solo mientras la página siga abierta.
    }
  }

  alternar(): void {
    this.establecer(!this.modoOscuro());
  }

  /** El shell autenticado se montó: se relee la preferencia y se aplica el tema. */
  activar(): void {
    this.modoOscuro.set(this.leerPreferencia());
    this.shellActivo.set(true);
    this.aplicar(this.modoOscuro());
  }

  /** El shell se destruyó (cierre de sesión, pantalla pública): se quita el tema de inmediato. */
  desactivar(): void {
    this.shellActivo.set(false);
    this.aplicar(false);
  }

  private aplicar(oscuro: boolean): void {
    const raiz = this.documento.documentElement;
    if (oscuro) {
      raiz.setAttribute('data-theme', 'dark');
      raiz.setAttribute('data-bs-theme', 'dark');
    } else {
      raiz.removeAttribute('data-theme');
      raiz.removeAttribute('data-bs-theme');
    }
  }

}
