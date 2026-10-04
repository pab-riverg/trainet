import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { sincronizarBusquedaConQ } from '../../utilidades/rutas';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PerfilUsuario, Supervisor, Usuario, UsuarioCrear, UsuariosService } from '../../servicios/usuarios';
import { CATALOGO_ROLES, etiquetaRol as obtenerEtiquetaRol } from '../../modelos/roles';
import { mensajeError } from '../../utilidades/errores';
import { esObligatorio, marcarInvalidos, mensajeControl } from '../../utilidades/formularios';
import { CampoTelefono } from '../../compartidos/campo-telefono/campo-telefono';
import { SoloDigitos } from '../../compartidos/solo-digitos';
import { CedulaPipe } from '../../compartidos/pipes-numeros';
import { TelefonoPipe } from '../../compartidos/pipes-numeros';
import { CEDULA_MAX, CEDULA_MIN, soloDigitos } from '../../utilidades/numeros';
import { erroresPorCampo } from '../../utilidades/reportes';
import { BotonAccion } from '../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../utilidades/paginacion';
import { cerrarModal } from '../../utilidades/modal';


type CampoPerfil = 'puesto' | 'fecha_ingreso' | 'fo_supervisor' | 'departamento' | 'especialidad_tecnica' | 'experiencia';

interface ValoresPerfilFormulario {
  puesto: string;
  fecha_ingreso: string;
  fo_supervisor: number | null;
  departamento: string;
  especialidad_tecnica: string;
  experiencia: number;
}

@Component({
  selector: 'app-usuarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CampoTelefono, SoloDigitos, CedulaPipe, TelefonoPipe, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './usuarios.html'
})
export class Usuarios implements OnInit {

  mensajeControl = mensajeControl;
  esObligatorio = esObligatorio;

  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);
  private miPropioId = Number(localStorage.getItem('trainet_id'));

  catalogoRoles = CATALOGO_ROLES;

  usuarios = signal<Usuario[]>([]);
  // 10 filas por página sobre el resultado de la búsqueda y el filtro por rol.
  paginacion = crearPaginacion(() => this.usuarios());
  cargando = signal(false);
  error = signal<string | null>(null);

  modoEdicion = signal<Usuario | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  usuarioAEliminar = signal<Usuario | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  busquedaControl = new FormControl('', { nonNullable: true });
  rolFiltroControl = new FormControl('', { nonNullable: true });

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  esAdministrador = computed(() => this.rolActual() === 'administrador');

  supervisores = signal<Supervisor[]>([]);
  errorSupervisores = signal<string | null>(null);

  rolSeleccionado = signal('');
  rolOriginal = signal<string | null>(null);
  faltaSupervisor = computed(() => this.rolSeleccionado() === 'empleado' && this.supervisores().length === 0);

  cargandoPerfil = signal(false);
  errorPerfilCarga = signal<string | null>(null);
  private valoresPerfilOriginal: ValoresPerfilFormulario | null = null;

  editandoPropioUsuario = computed(() => {
    const edicion = this.modoEdicion();
    return !!edicion && edicion.id === this.miPropioId;
  });

  avisoCambioRol = computed(() =>
    !!this.modoEdicion() && this.rolOriginal() !== null && this.rolSeleccionado() !== this.rolOriginal()
  );

  usuarioForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    telefono: new FormControl('', { nonNullable: true }),
    cedula: new FormControl('', { nonNullable: true, validators: [Validators.minLength(CEDULA_MIN), Validators.maxLength(CEDULA_MAX), Validators.pattern(/^\d+$/)] }),
    rol: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    is_active: new FormControl(true, { nonNullable: true }),
    puesto: new FormControl('', { nonNullable: true }),
    fecha_ingreso: new FormControl('', { nonNullable: true }),
    fo_supervisor: new FormControl<number | null>(null),
    departamento: new FormControl('', { nonNullable: true }),
    especialidad_tecnica: new FormControl('', { nonNullable: true }),
    experiencia: new FormControl(0, { nonNullable: true })
  });

  constructor() {
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.busquedaControl);
    this.usuarioForm.controls.rol.valueChanges.pipe(takeUntilDestroyed()).subscribe(rol => {
      this.rolSeleccionado.set(rol);

      if (!this.modoEdicion()) {
        this.limpiarCamposPerfil();
        this.actualizarValidadoresPerfil(rol);
        return;
      }

      if (rol === this.rolOriginal()) {
        if (this.valoresPerfilOriginal) {
          this.usuarioForm.patchValue(this.valoresPerfilOriginal, { emitEvent: false });
        }
        this.actualizarValidadoresPerfil(rol, { opcional: true });
      } else {
        this.limpiarCamposPerfil();
        this.actualizarValidadoresPerfil(rol);
      }
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();

    this.busquedaControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.paginacion.reiniciar();
        this.cargarUsuarios();
      });

    this.rolFiltroControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.paginacion.reiniciar();
      this.cargarUsuarios();
    });
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.usuariosService.listar({
      search: this.busquedaControl.value || undefined,
      rol: this.rolFiltroControl.value || undefined
    }).subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la lista de usuarios.'));
        this.cargando.set(false);
      }
    });
  }

  cargarSupervisores(): void {
    this.errorSupervisores.set(null);
    this.usuariosService.listarSupervisores().subscribe({
      next: supervisores => this.supervisores.set(supervisores),
      error: error => this.errorSupervisores.set(mensajeError(error, 'No se pudieron cargar los supervisores.'))
    });
  }

  private cargarPerfilUsuario(id: number): void {
    this.cargandoPerfil.set(true);
    this.errorPerfilCarga.set(null);

    this.usuariosService.obtener(id).subscribe({
      next: detalle => {
        this.cargandoPerfil.set(false);

        const valores: ValoresPerfilFormulario = {
          puesto: detalle.perfil?.puesto ?? '',
          fecha_ingreso: detalle.perfil?.fecha_ingreso ?? '',
          fo_supervisor: detalle.perfil?.fo_supervisor ?? null,
          departamento: detalle.perfil?.departamento ?? '',
          especialidad_tecnica: detalle.perfil?.especialidad_tecnica ?? '',
          experiencia: detalle.perfil?.experiencia ?? 0
        };

        this.valoresPerfilOriginal = valores;
        this.usuarioForm.patchValue(valores, { emitEvent: false });
      },
      error: error => {
        this.cargandoPerfil.set(false);
        this.errorPerfilCarga.set(mensajeError(error, 'No se pudo cargar el perfil del usuario.'));
      }
    });
  }

  etiquetaRol(codigo: string): string {
    return obtenerEtiquetaRol(codigo);
  }

  private limpiarCamposPerfil(): void {
    this.usuarioForm.patchValue({
      puesto: '',
      fecha_ingreso: '',
      fo_supervisor: null,
      departamento: '',
      especialidad_tecnica: '',
      experiencia: 0
    }, { emitEvent: false });
  }

  private actualizarValidadoresPerfil(rol: string, opciones: { opcional?: boolean } = {}): void {
    const controles = this.usuarioForm.controls;
    const requerido = !opciones.opcional;

    controles.puesto.clearValidators();
    controles.fecha_ingreso.clearValidators();
    controles.fo_supervisor.clearValidators();
    controles.departamento.clearValidators();
    controles.especialidad_tecnica.clearValidators();

    if (requerido) {
      if (rol === 'empleado') {
        controles.puesto.setValidators([Validators.required]);
        controles.fecha_ingreso.setValidators([Validators.required]);
        controles.fo_supervisor.setValidators([Validators.required]);
      } else if (rol === 'recursos_humanos') {
        controles.departamento.setValidators([Validators.required]);
      } else if (rol === 'capacitador' || rol === 'tecnico_soporte') {
        controles.especialidad_tecnica.setValidators([Validators.required]);
      }
    }

    controles.puesto.updateValueAndValidity({ emitEvent: false });
    controles.fecha_ingreso.updateValueAndValidity({ emitEvent: false });
    controles.fo_supervisor.updateValueAndValidity({ emitEvent: false });
    controles.departamento.updateValueAndValidity({ emitEvent: false });
    controles.especialidad_tecnica.updateValueAndValidity({ emitEvent: false });
  }

  private camposPerfilPorRol(rol: string): CampoPerfil[] {
    if (rol === 'empleado') {
      return ['puesto', 'fecha_ingreso', 'fo_supervisor'];
    }
    if (rol === 'recursos_humanos') {
      return ['departamento'];
    }
    if (rol === 'capacitador') {
      return ['especialidad_tecnica', 'experiencia'];
    }
    if (rol === 'tecnico_soporte') {
      return ['especialidad_tecnica'];
    }
    return [];
  }

  private perfilFueModificado(rol: string): boolean {
    return this.camposPerfilPorRol(rol).some(campo => this.usuarioForm.controls[campo].dirty);
  }

  private construirPerfil(rol: string): PerfilUsuario | undefined {
    const valores = this.usuarioForm.getRawValue();

    if (rol === 'empleado') {
      return {
        puesto: valores.puesto,
        fecha_ingreso: valores.fecha_ingreso,
        fo_supervisor: valores.fo_supervisor ?? undefined
      };
    }
    if (rol === 'recursos_humanos') {
      return { departamento: valores.departamento };
    }
    if (rol === 'capacitador') {
      return { especialidad_tecnica: valores.especialidad_tecnica, experiencia: valores.experiencia };
    }
    if (rol === 'tecnico_soporte') {
      return { especialidad_tecnica: valores.especialidad_tecnica };
    }
    return undefined;
  }

  abrirCrear(): void {
    this.modoEdicion.set(null);
    this.rolOriginal.set(null);
    this.valoresPerfilOriginal = null;
    this.errorFormulario.set(null);
    this.errorPerfilCarga.set(null);

    const hoy = new Date().toLocaleDateString('en-CA');

    this.usuarioForm.reset({
      nombre: '',
      email: '',
      telefono: '',
      cedula: '',
      rol: '',
      is_active: true,
      puesto: '',
      fecha_ingreso: hoy,
      fo_supervisor: null,
      departamento: '',
      especialidad_tecnica: '',
      experiencia: 0
    });
    this.usuarioForm.controls.rol.enable();
    this.rolSeleccionado.set('');
    this.actualizarValidadoresPerfil('');
    this.cargarSupervisores();
  }

  abrirEditar(usuario: Usuario): void {
    this.modoEdicion.set(usuario);
    this.rolOriginal.set(usuario.rol);
    this.valoresPerfilOriginal = null;
    this.errorFormulario.set(null);
    this.errorPerfilCarga.set(null);

    this.usuarioForm.reset({
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      // Se edita como número sin formato.
      cedula: soloDigitos(usuario.cedula),
      rol: usuario.rol,
      is_active: usuario.is_active,
      puesto: '',
      fecha_ingreso: '',
      fo_supervisor: null,
      departamento: '',
      especialidad_tecnica: '',
      experiencia: 0
    });

    if (usuario.id === this.miPropioId) {
      this.usuarioForm.controls.rol.disable();
    } else {
      this.usuarioForm.controls.rol.enable();
    }

    this.rolSeleccionado.set(usuario.rol);
    this.actualizarValidadoresPerfil(usuario.rol, { opcional: true });
    this.cargarSupervisores();
    this.cargarPerfilUsuario(usuario.id);
  }

  // Errores 400 del API bajo su campo (teléfono y cédula).
  erroresApi = signal<Record<string, string>>({});

  private alFallarGuardado(error: unknown): void {
    this.guardando.set(false);
    const errores = erroresPorCampo(error, ['telefono', 'cedula'], 'No se pudo guardar el usuario.');
    this.erroresApi.set(errores.porCampo);
    this.errorFormulario.set(errores.general);
  }

  guardar(): void {
    if (this.usuarioForm.invalid) {
      marcarInvalidos(this.usuarioForm);
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.erroresApi.set({});

    const valores = this.usuarioForm.getRawValue();
    const edicion = this.modoEdicion();

    if (edicion) {
      const rolCambio = valores.rol !== this.rolOriginal();
      const datos: Partial<UsuarioCrear & { is_active: boolean }> = {
        nombre: valores.nombre,
        email: valores.email,
        telefono: valores.telefono,
        cedula: valores.cedula || null,
        is_active: valores.is_active
      };

      if (rolCambio) {
        datos.rol = valores.rol;
      }

      if (rolCambio || this.perfilFueModificado(valores.rol)) {
        datos.perfil = this.construirPerfil(valores.rol);
      }

      this.usuariosService.actualizar(edicion.id, datos).subscribe({
        next: () => {
          this.guardando.set(false);
          cerrarModal('modalUsuario');
          this.cargarUsuarios();
        },
        error: error => this.alFallarGuardado(error)
      });
      return;
    }

    this.usuariosService.crear({
      nombre: valores.nombre,
      email: valores.email,
      telefono: valores.telefono,
      cedula: valores.cedula || null,
      rol: valores.rol,
      perfil: this.construirPerfil(valores.rol)
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        cerrarModal('modalUsuario');
        this.cargarUsuarios();
      },
      error: error => this.alFallarGuardado(error)
    });
  }

  abrirEliminar(usuario: Usuario): void {
    this.usuarioAEliminar.set(usuario);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const usuario = this.usuarioAEliminar();
    if (!usuario) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.usuariosService.eliminar(usuario.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminar');
        this.cargarUsuarios();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el usuario.'));
      }
    });
  }

}
