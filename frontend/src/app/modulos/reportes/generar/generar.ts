import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportesService } from '../../../servicios/reportes';
import { TipoReporte } from '../../../modelos/reportes';
import {
  RangoFechas, descripcionInforme, errorDeRango, esteMes, ICONO_INFORME, mesAnterior, ultimos30Dias
} from '../../../utilidades/reportes';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { mensajeError } from '../../../utilidades/errores';

@Component({
  selector: 'app-generar-informe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './generar.html',
  styleUrl: './generar.css',
})
export class GenerarInforme implements OnInit {

  private reportes = inject(ReportesService);

  // Emite el id del informe recién generado para abrir su detalle.
  generado = output<number>();

  mensajeControl = mensajeControl;
  descripcionInforme = descripcionInforme;
  iconoInforme = ICONO_INFORME;

  tipos = signal<TipoReporte[]>([]);
  cargandoTipos = signal(false);
  errorTipos = signal<string | null>(null);

  informeForm = new FormGroup({
    tipo: new FormControl<string | null>(null, { validators: [Validators.required] }),
    desde: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hasta: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  // Mensaje de rango inválido (desde > hasta o más de 366 días), mostrado bajo el campo correspondiente.
  errorRango = signal<{ campo: 'desde' | 'hasta'; mensaje: string } | null>(null);
  generando = signal(false);
  errorGenerar = signal<string | null>(null);

  // Solo los tipos de sistema con clave tienen generador; el consolidado se genera desde Archivos.
  tiposGenerables = computed(() =>
    this.tipos().filter(tipo => tipo.origen === 'sistema' && tipo.clave !== null && tipo.clave !== 'consolidado' && tipo.requiere_fechas)
  );

  constructor() {
    this.aplicarRango(ultimos30Dias());
  }

  ngOnInit(): void {
    this.cargandoTipos.set(true);
    this.reportes.listarTipos('sistema').subscribe({
      next: tipos => {
        this.tipos.set(tipos);
        this.cargandoTipos.set(false);
      },
      error: error => {
        this.errorTipos.set(mensajeError(error, 'No se pudieron cargar los tipos de informe.'));
        this.cargandoTipos.set(false);
      }
    });
  }

  elegirTipo(clave: string): void {
    this.informeForm.controls.tipo.setValue(clave);
    this.informeForm.controls.tipo.markAsTouched();
  }

  atajo(rango: 'ultimos30' | 'esteMes' | 'mesAnterior'): void {
    const mapa = { ultimos30: ultimos30Dias, esteMes, mesAnterior };
    this.aplicarRango(mapa[rango]());
  }

  private aplicarRango(rango: RangoFechas): void {
    this.informeForm.patchValue(rango);
    this.errorRango.set(null);
  }

  generar(): void {
    this.errorGenerar.set(null);
    const valores = this.informeForm.getRawValue();

    if (this.informeForm.invalid) {
      marcarInvalidos(this.informeForm);
      return;
    }
    const problema = errorDeRango(valores.desde, valores.hasta);
    this.errorRango.set(problema);
    if (problema || valores.tipo === null) {
      return;
    }

    this.generando.set(true);
    this.reportes.generarInforme({ tipo: valores.tipo, desde: valores.desde, hasta: valores.hasta }).subscribe({
      next: informe => {
        this.generando.set(false);
        this.generado.emit(informe.id);
      },
      error: error => {
        this.generando.set(false);
        this.errorGenerar.set(mensajeError(error, 'No se pudo generar el informe.'));
      }
    });
  }

}
