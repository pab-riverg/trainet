import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, OnInit, afterNextRender, effect, inject, output, signal,
  viewChild, viewChildren
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteService } from '../../../servicios/asistente';
import {
  CategoriaAsistente, ConsultaFrecuente, RespuestaAsistente, ResultadoConsulta, SugerenciaAsistente
} from '../../../modelos/asistente';
import { MAX_TEXTO_PREGUNTA } from '../../../utilidades/asistente';
import { guardarBlob } from '../../../utilidades/archivos';
import { mensajeError } from '../../../utilidades/errores';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';

type EstadoValoracion = 'pendiente' | 'enviando' | 'util' | 'no_util';

interface MensajeChat {
  id: number;
  rol: 'bot' | 'usuario';
  texto: string;
  error?: boolean;
  // Archivo de la respuesta, descargable desde el propio mensaje.
  archivo?: { consultaId: number; nombre: string };
  // Pregunta "¿Te sirvió?" asociada a la consulta guardada en el historial.
  valoracion?: { historialId: number; estado: EstadoValoracion; errorValorar?: string };
  sugerencias?: SugerenciaAsistente[];
  // Ofrece reportar a Soporte Técnico y volver al menú (no se encontró respuesta).
  sinRespuesta?: boolean;
}

@Component({
  selector: 'app-chat-triny',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EstadoBadge],
  host: { '(document:click)': 'alHacerClickEnDocumento($event)' },
  templateUrl: './chat-triny.html',
  styleUrl: './chat-triny.css',
})
export class ChatTriny implements OnInit {

  private asistente = inject(AsistenteService);
  private router = inject(Router);
  private injector = inject(Injector);

  // Se emite al navegar a Soporte para que un contenedor (por ejemplo el lanzador flotante) pueda cerrarse.
  reportado = output<void>();

  private contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');
  private campoTexto = viewChild<ElementRef<HTMLTextAreaElement>>('campoTexto');
  private botonTemas = viewChild<ElementRef<HTMLButtonElement>>('botonTemas');
  private raizEntrada = viewChild<ElementRef<HTMLElement>>('raizEntrada');
  private itemsTema = viewChildren<ElementRef<HTMLButtonElement>>('itemTema');

  // Menú "+" con los temas (se abre hacia arriba; fixed para no recortarse).
  menuTemasAbierto = signal(false);
  posicionMenuTemas = signal({ bottom: 0, left: 0 });

  readonly maxTexto = MAX_TEXTO_PREGUNTA;

  mensajes = signal<MensajeChat[]>([]);
  escribiendo = signal(false);

  categorias = signal<CategoriaAsistente[]>([]);
  cargandoMenu = signal(false);
  errorMenu = signal<string | null>(null);

  categoriaActiva = signal<CategoriaAsistente | null>(null);
  preguntasCategoria = signal<ConsultaFrecuente[]>([]);
  cargandoPreguntas = signal(false);

  // Última pregunta del usuario (escrita o elegida): es la que se precarga al reportar a Soporte.
  private ultimaPregunta = signal('');
  private siguienteId = 0;

  chatForm = new FormGroup({
    texto: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(MAX_TEXTO_PREGUNTA)] })
  });

  constructor() {
    // Foco inicial en el campo de texto, salvo que el usuario ya esté escribiendo en otro campo.
    afterNextRender(() => {
      const activo = document.activeElement;
      const enCampo = activo instanceof HTMLElement
        && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activo.tagName) || activo.isContentEditable);
      if (!enCampo) {
        this.campoTexto()?.nativeElement.focus();
      }
    }, { injector: this.injector });

    // Auto-scroll al último mensaje.
    effect(() => {
      this.mensajes();
      this.escribiendo();
      setTimeout(() => {
        const el = this.contenedor()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  // --- Menú ---

  cargarCategorias(): void {
    this.cargandoMenu.set(true);
    this.errorMenu.set(null);

    this.asistente.listarCategorias().subscribe({
      next: categorias => {
        this.categorias.set(categorias.filter(categoria => categoria.total_consultas > 0));
        this.cargandoMenu.set(false);
      },
      error: error => {
        this.errorMenu.set(mensajeError(error, 'No se pudo cargar el menú del asistente.'));
        this.cargandoMenu.set(false);
      }
    });
  }

  elegirCategoria(categoria: CategoriaAsistente): void {
    this.categoriaActiva.set(categoria);
    this.preguntasCategoria.set([]);
    this.cargandoPreguntas.set(true);
    this.errorMenu.set(null);

    // activa=true: el administrador también recibe solo las preguntas que el asistente puede responder.
    this.asistente.listarConsultas({ categoria: categoria.id, activa: true }).subscribe({
      next: consultas => {
        this.preguntasCategoria.set(consultas);
        this.cargandoPreguntas.set(false);
      },
      error: error => {
        this.errorMenu.set(mensajeError(error, 'No se pudieron cargar las preguntas de esta categoría.'));
        this.cargandoPreguntas.set(false);
      }
    });
  }

  volverACategorias(): void {
    this.categoriaActiva.set(null);
    this.preguntasCategoria.set([]);
    this.errorMenu.set(null);
  }

  volverAlMenu(): void {
    this.volverACategorias();
    this.agregar({ rol: 'bot', texto: 'Aquí tienes el menú de nuevo. ¿Sobre qué quieres saber?' });
  }

  // --- Conversación ---

  elegirPregunta(consulta: { id: number; pregunta: string }): void {
    if (this.escribiendo()) {
      return;
    }
    this.ultimaPregunta.set(consulta.pregunta);
    this.agregar({ rol: 'usuario', texto: consulta.pregunta });
    this.escribiendo.set(true);

    this.asistente.seleccionar(consulta.id).subscribe({
      next: resultado => this.mostrarResultado(resultado),
      error: error => this.mostrarError(mensajeError(error, 'No se pudo obtener la respuesta.'))
    });
  }

  enviar(): void {
    const texto = this.chatForm.controls.texto.value.trim();
    if (!texto || this.chatForm.invalid || this.escribiendo()) {
      return;
    }

    this.ultimaPregunta.set(texto);
    this.agregar({ rol: 'usuario', texto });
    this.chatForm.reset({ texto: '' });
    this.ajustarAltura();
    this.escribiendo.set(true);
    this.chatForm.controls.texto.disable();

    this.asistente.preguntar(texto).subscribe({
      next: resultado => this.mostrarResultado(resultado),
      error: error => this.mostrarError(mensajeError(error, 'No se pudo enviar tu pregunta.'))
    });
  }

  private mostrarResultado(resultado: ResultadoConsulta): void {
    this.terminarEscritura();

    if (resultado.resuelta && resultado.respuesta) {
      this.mostrarRespuesta(resultado.respuesta, resultado.historial_id);
      return;
    }

    if (resultado.sugerencias.length > 0) {
      this.agregar({ rol: 'bot', texto: 'No estoy segura de haberte entendido. ¿Quisiste decir…?', sugerencias: resultado.sugerencias });
      return;
    }

    this.agregar({
      rol: 'bot',
      texto: 'No encontré una respuesta a tu pregunta. Puedes reportarla a Soporte Técnico o volver al menú.',
      sinRespuesta: true
    });
  }

  private mostrarRespuesta(respuesta: RespuestaAsistente, historialId: number): void {
    this.agregar({
      rol: 'bot',
      texto: respuesta.respuesta,
      archivo: respuesta.archivo_nombre ? { consultaId: respuesta.id, nombre: respuesta.archivo_nombre } : undefined,
      valoracion: { historialId, estado: 'pendiente' }
    });
  }

  private mostrarError(texto: string): void {
    this.terminarEscritura();
    this.agregar({ rol: 'bot', texto, error: true });
  }

  private terminarEscritura(): void {
    this.escribiendo.set(false);
    this.chatForm.controls.texto.enable();
    // Devuelve el foco al campo salvo que el usuario ya esté en otro control.
    setTimeout(() => {
      const activo = document.activeElement;
      if (!activo || activo === document.body) {
        this.campoTexto()?.nativeElement.focus();
      }
    });
  }

  // --- Campo de texto ---

  // Enter envía; Shift+Enter inserta un salto de línea.
  alPulsarEnter(evento: Event): void {
    if (!(evento instanceof KeyboardEvent) || evento.shiftKey || evento.isComposing) {
      return;
    }
    evento.preventDefault();
    this.enviar();
  }

  // El campo crece con el contenido (el CSS limita el alto a unas cinco líneas).
  ajustarAltura(): void {
    const campo = this.campoTexto()?.nativeElement;
    if (campo) {
      campo.style.height = 'auto';
      campo.style.height = `${campo.scrollHeight}px`;
    }
  }

  // --- Menú "+" de temas ---

  alternarMenuTemas(): void {
    if (this.menuTemasAbierto()) {
      this.cerrarMenuTemas(false);
      return;
    }
    const caja = this.botonTemas()?.nativeElement.getBoundingClientRect();
    if (caja) {
      this.posicionMenuTemas.set({ bottom: window.innerHeight - caja.top + 6, left: caja.left });
    }
    this.menuTemasAbierto.set(true);
    queueMicrotask(() => this.itemsTema()[0]?.nativeElement.focus());
  }

  cerrarMenuTemas(devolverFoco: boolean): void {
    this.menuTemasAbierto.set(false);
    if (devolverFoco) {
      this.botonTemas()?.nativeElement.focus();
    }
  }

  // Elegir un tema ejecuta el mismo handler de siempre (elegirCategoria).
  elegirTema(categoria: CategoriaAsistente): void {
    this.cerrarMenuTemas(true);
    this.elegirCategoria(categoria);
  }

  alHacerClickEnDocumento(evento: Event): void {
    if (this.menuTemasAbierto() && !this.raizEntrada()?.nativeElement.contains(evento.target as Node)) {
      this.cerrarMenuTemas(false);
    }
  }

  alTeclearEnBotonTemas(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (!this.menuTemasAbierto()) {
        this.alternarMenuTemas();
      }
    } else if (evento.key === 'Escape' && this.menuTemasAbierto()) {
      this.cerrarMenuTemas(true);
    }
  }

  alTeclearEnMenuTemas(evento: KeyboardEvent): void {
    const lista = this.itemsTema().map(item => item.nativeElement);
    const actual = lista.indexOf(document.activeElement as HTMLButtonElement);
    let destino: number | null = null;
    switch (evento.key) {
      case 'ArrowDown': destino = (actual + 1) % lista.length; break;
      case 'ArrowUp': destino = (actual - 1 + lista.length) % lista.length; break;
      case 'Home': destino = 0; break;
      case 'End': destino = lista.length - 1; break;
      case 'Escape':
        evento.preventDefault();
        this.cerrarMenuTemas(true);
        return;
      case 'Tab':
        this.cerrarMenuTemas(false);
        return;
    }
    if (destino !== null && lista.length > 0) {
      evento.preventDefault();
      lista[destino].focus();
    }
  }

  // --- Acciones dentro de los mensajes ---

  descargar(archivo: { consultaId: number; nombre: string }): void {
    this.asistente.descargarArchivo(archivo.consultaId).subscribe({
      next: blob => guardarBlob(blob, archivo.nombre),
      error: error => this.agregar({
        rol: 'bot', texto: mensajeError(error, 'No se pudo descargar el archivo.'), error: true
      })
    });
  }

  valorar(mensaje: MensajeChat, util: boolean): void {
    const valoracion = mensaje.valoracion;
    if (!valoracion || valoracion.estado !== 'pendiente') {
      return;
    }
    this.actualizar(mensaje.id, { valoracion: { ...valoracion, estado: 'enviando' } });

    this.asistente.valorar(valoracion.historialId, util).subscribe({
      next: () => {
        this.actualizar(mensaje.id, { valoracion: { ...valoracion, estado: util ? 'util' : 'no_util' } });
        this.agregar({
          rol: 'bot',
          texto: util
            ? '¡Me alegra haberte ayudado! Si necesitas algo más, aquí estaré.'
            : 'Lamento que no te haya servido. Puedes reportarlo a Soporte Técnico o volver al menú.'
        });
      },
      error: error => this.actualizar(mensaje.id, {
        valoracion: { ...valoracion, estado: 'pendiente', errorValorar: mensajeError(error, 'No se pudo guardar tu valoración.') }
      })
    });
  }

  reportarASoporte(): void {
    const descripcion = this.ultimaPregunta().slice(0, 255);
    this.reportado.emit();
    this.router.navigate(['/soporte'], { queryParams: descripcion ? { descripcion } : {} });
  }

  // --- Utilidades de estado ---

  private agregar(mensaje: Omit<MensajeChat, 'id'>): number {
    const id = ++this.siguienteId;
    this.mensajes.update(lista => [...lista, { ...mensaje, id }]);
    return id;
  }

  private actualizar(id: number, cambios: Partial<MensajeChat>): void {
    this.mensajes.update(lista => lista.map(m => (m.id === id ? { ...m, ...cambios } : m)));
  }

}
