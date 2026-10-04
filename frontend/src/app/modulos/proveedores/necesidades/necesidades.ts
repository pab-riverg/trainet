import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProveedoresService } from '../../../servicios/proveedores';
import { NecesidadCapacitacion } from '../../../modelos/proveedores';
import { ROLES_GESTION_PROVEEDORES } from '../../../modelos/permisos-proveedores';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-necesidades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Paginador],
  templateUrl: './necesidades.html',
  styleUrl: './necesidades.css',
})
export class Necesidades implements OnInit {

  mensajeControl = mensajeControl;

  private proveedoresService = inject(ProveedoresService);

  moduloId = input.required<number>();

  necesidades = signal<NecesidadCapacitacion[]>([]);
  paginacion = crearPaginacion(() => this.necesidades());
  cargando = signal(false);
  error = signal<string | null>(null);

  necesidadForm = new FormGroup({
    tema: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    area: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    observaciones: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] })
  });
  enviando = signal(false);
  errorEnvio = signal<string | null>(null);
  exitoEnvio = signal<string | null>(null);

  puedeGestionar = computed(() => ROLES_GESTION_PROVEEDORES.includes(localStorage.getItem('trainet_rol') ?? ''));

  ngOnInit(): void {
    this.cargarNecesidades();
  }

  cargarNecesidades(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.proveedoresService.listarNecesidades().subscribe({
      next: necesidades => {
        this.necesidades.set(necesidades);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las necesidades de capacitación.'));
        this.cargando.set(false);
      }
    });
  }

  enviar(): void {
    if (this.necesidadForm.invalid) {
      marcarInvalidos(this.necesidadForm);
      return;
    }

    if (this.necesidadForm.invalid) {
      return;
    }

    const valores = this.necesidadForm.getRawValue();
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.exitoEnvio.set(null);

    this.proveedoresService.crearNecesidad({
      tema: valores.tema.trim(),
      area: valores.area.trim(),
      observaciones: valores.observaciones.trim(),
      fo_mod_prov: this.moduloId()
    }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exitoEnvio.set('Necesidad registrada. Se avisó a Administración y Recursos Humanos.');
        this.necesidadForm.reset({ tema: '', area: '', observaciones: '' });
        this.cargarNecesidades();
      },
      error: error => {
        this.enviando.set(false);
        this.errorEnvio.set(mensajeError(error, 'No se pudo registrar la necesidad.'));
      }
    });
  }

}
