from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nombre, password=None, **extra_fields):
        if not email:
            raise ValueError('El usuario debe tener un email')
        if not nombre:
            raise ValueError('El usuario debe tener un nombre')

        email = self.normalize_email(email)
        usuario = self.model(email=email, nombre=nombre, **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, nombre, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', 'administrador')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True')

        return self.create_user(email, nombre, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    ROL_CHOICES = [
        ('administrador', 'Administrador'),
        ('directivo', 'Directivo'),
        ('supervisor', 'Supervisor'),
        ('empleado', 'Empleado'),
        ('recursos_humanos', 'Recursos Humanos'),
        ('encargado_formacion', 'Encargado de Formación'),
        ('encargado_documental', 'Encargado Documental'),
        ('capacitador', 'Capacitador'),
        ('tecnico_soporte', 'Técnico de Soporte'),
        ('encargado_administrativo', 'Encargado Administrativo'),
        ('proveedor_contenido', 'Proveedor de Contenido'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_usuario')
    nombre = models.CharField(max_length=255, db_column='nombre')
    email = models.EmailField(unique=True, db_column='email')
    fecha_registro = models.DateField(auto_now_add=True, db_column='fecha_registro')
    telefono = models.CharField(max_length=255, blank=True, db_column='telefono')
    # Opcional y única; varios usuarios sin cédula (NULL) están permitidos.
    cedula = models.CharField(max_length=10, null=True, blank=True, unique=True, db_column='cedula')
    is_active = models.BooleanField(default=True, db_column='is_active')
    is_staff = models.BooleanField(default=False, db_column='is_staff')
    rol = models.CharField(max_length=50, choices=ROL_CHOICES, db_column='rol')

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre']

    class Meta:
        db_table = 'usuario'

    def __str__(self):
        return self.email


class Administrador(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_administrador')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'administrador'

    def __str__(self):
        return self.fo_usuario.nombre


class Directivo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_directivo')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    nivel_jerarquia = models.IntegerField(default=1)

    class Meta:
        db_table = 'directivo'

    def __str__(self):
        return self.fo_usuario.nombre


class Supervisor(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_supervisor')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'supervisor'

    def __str__(self):
        return self.fo_usuario.nombre


class Empleado(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_empleado')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    puesto = models.CharField(max_length=255)
    fecha_ingreso = models.DateField()
    fo_supervisor = models.ForeignKey(Supervisor, on_delete=models.CASCADE, db_column='fo_supervisor')

    class Meta:
        db_table = 'empleado'

    def __str__(self):
        return self.fo_usuario.nombre


class RecursosHumanos(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_rh')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    departamento = models.CharField(max_length=255)

    class Meta:
        db_table = 'recursos_humanos'

    def __str__(self):
        return self.fo_usuario.nombre


class EncargadoFormacion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_enc_formacion')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'encargado_formacion'

    def __str__(self):
        return self.fo_usuario.nombre


class EncargadoDocumental(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_enc_doc')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'encargado_documental'

    def __str__(self):
        return self.fo_usuario.nombre


class Capacitador(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_capacitador')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    especialidad_tecnica = models.CharField(max_length=255)
    experiencia = models.IntegerField(default=0)

    class Meta:
        db_table = 'capacitador'

    def __str__(self):
        return self.fo_usuario.nombre


class TecnicoSoporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_tecnico')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    especialidad_tecnica = models.CharField(max_length=255)
    tickets_resueltos = models.IntegerField(default=0)

    class Meta:
        db_table = 'tecnico_soporte'

    def __str__(self):
        return self.fo_usuario.nombre


class EncargadoAdministrativo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_enc_admin')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    presupuesto_asignado = models.IntegerField(default=0)

    class Meta:
        db_table = 'encargado_administrativo'

    def __str__(self):
        return self.fo_usuario.nombre


class ProveedorContenido(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_prov_contenido')
    fo_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    rating_calidad = models.IntegerField(default=0)

    class Meta:
        db_table = 'proveedor_contenido'

    def __str__(self):
        return self.fo_usuario.nombre
