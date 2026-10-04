"""Datos iniciales del asistente "Triny". Solo describen lo que TRAINET hace hoy; lo no verificable va en términos generales."""

CATEGORIAS_ASISTENTE = [
    ('Soporte técnico', 'bi-tools'),
    ('Compras', 'bi-bag'),
    ('Recursos', 'bi-box-seam'),
    ('Capacitación', 'bi-mortarboard'),
    ('Documentos', 'bi-folder2-open'),
    ('Mi cuenta', 'bi-person-circle'),
]

# (categoría, pregunta, palabras clave, respuesta)
PREGUNTAS_ASISTENTE = [
    ('Soporte técnico', '¿Cómo creo un ticket de soporte?',
     'ticket, soporte, ayuda, problema, falla, error, incidencia, reportar, tecnico',
     '¡Claro! Entra al módulo Soporte técnico y crea un ticket nuevo describiendo tu problema: elige la categoría '
     'que mejor lo represente, indica la prioridad y cuéntanos qué pasó con el mayor detalle posible. '
     'El equipo de soporte lo revisará y podrás seguir su estado desde el mismo módulo.'),
    ('Soporte técnico', '¿Qué significan los estados de mi ticket?',
     'estado, ticket, abierto, proceso, resuelto, cerrado, seguimiento',
     'Cada ticket pasa por estos estados: Abierto (lo registraste y espera atención), En proceso (el equipo de '
     'soporte está trabajando en él), Resuelto (ya hay una solución) y Cerrado (el caso terminó). '
     'Puedes consultarlo cuando quieras en Soporte técnico.'),
    ('Soporte técnico', '¿Dónde veo mis notificaciones?',
     'notificaciones, campanita, campana, avisos, alertas, mensajes, aviso',
     'Mira la campanita que aparece en la parte superior de la plataforma. Allí te avisamos de lo que pasa con '
     'tus solicitudes y tickets, y puedes marcar las notificaciones como leídas.'),
    ('Recursos', '¿Cómo pido un recurso?',
     'recurso, pedido, solicitar, pedir, material, equipo, licencia, mobiliario',
     '¡Con gusto te explico! Ve al módulo Pedido de recursos y crea una solicitud: elige el tipo de recurso que '
     'necesitas, explica para qué lo requieres e indica la prioridad. Luego podrás seguir su estado desde el mismo módulo.'),
    ('Recursos', '¿Qué significa cada estado de mi pedido de recursos?',
     'estado, pedido, recurso, pendiente, aprobado, rechazado, entregado',
     'Pendiente: tu solicitud espera revisión. Aprobado: fue aceptada y está en gestión. Rechazado: no se aprobó '
     '(revisa el comentario del encargado para conocer el motivo). Entregado: el recurso ya fue entregado.'),
    ('Compras', '¿Cómo compro algo en la tienda de Compras Internas?',
     'comprar, compra, tienda, carrito, articulo, solicitud, pedir, adquirir',
     'Entra a Compras Internas y explora la tienda: agrega los artículos que necesitas al carrito, escribe la '
     'justificación de cada artículo, indica el área que hace la solicitud y confirma la solicitud. '
     'Quedará registrada para su revisión.'),
    ('Compras', '¿Qué pasa después de enviar mi solicitud de compra?',
     'solicitud, compra, estado, pendiente, aprobada, comprada, entregada, seguimiento, despues',
     'Tu solicitud empieza como Pendiente. Después puede pasar a Aprobada (o Rechazada), luego a Comprada y '
     'finalmente a Entregada. Te avisaremos con notificaciones y puedes ver el estado en Compras Internas.'),
    ('Compras', '¿Cómo confirmo que recibí mi pedido de compra?',
     'recibir, recibido, confirmar, entrega, entregada, recepcion, llego',
     'Cuando tu solicitud figure como Entregada, abre su detalle en Compras Internas y confirma que la recibiste. '
     'Con eso el pedido queda cerrado como Recibida.'),
    ('Compras', '¿Qué hago si mi pedido de compra no llegó?',
     'no llego, no recibi, reclamo, reportar, falta, perdido, entregada, problema',
     'Si tu solicitud figura como Entregada pero no te llegó, abre su detalle en Compras Internas y repórtalo '
     'como no recibida, contando lo ocurrido. El equipo lo revisará y te avisaremos cuando haya novedades.'),
    ('Documentos', '¿Cómo consulto los documentos de la biblioteca?',
     'documento, biblioteca, archivo, manual, politica, procedimiento, descargar, buscar, consultar',
     'Abre el módulo Documentos: ahí encontrarás la biblioteca con los documentos publicados. Puedes buscarlos '
     'y abrirlos o descargarlos según tus permisos.'),
    ('Mi cuenta', '¿Qué hago si no tengo permiso para entrar a un módulo?',
     'permiso, acceso, modulo, denegado, no puedo entrar, prohibido, rol, autorizacion',
     'Cada módulo está disponible según tu rol dentro de TRAINET. Si necesitas acceder a uno que no ves o que te '
     'rechaza, escribe un ticket en Soporte técnico explicando qué módulo necesitas y para qué, '
     'y el administrador lo revisará.'),
    ('Capacitación', '¿Cómo veo mis cursos?',
     'curso, cursos, capacitacion, formacion, inscripcion, aprender, mis cursos',
     'Ve al módulo Capacitación: allí encuentras los cursos disponibles y aquellos en los que participas. '
     '¡Ánimo con tu formación!'),
    ('Mi cuenta', '¿Cómo cambio mi contraseña?',
     'contrasena, clave, password, cambiar, perfil, cuenta, acceso',
     'Entra a tu Perfil y busca la sección Cambiar contraseña: escribe tu contraseña actual y la nueva. '
     'Si no puedes iniciar sesión, usa la opción de recuperar contraseña en la pantalla de ingreso.'),
]


# Sinónimos y variantes de uso real, por pregunta. Se fusionan con las palabras clave base y con las de la fila existente.
PALABRAS_CLAVE_EXTRA = {
    '¿Cómo creo un ticket de soporte?': 'tiket, crear, abrir, incidente, reporte, falla, error, problema',
    '¿Cómo cambio mi contraseña?': 'contraseña, clave, olvide, perdi, recuperar, restablecer, acceso, password',
    '¿Cómo pido un recurso?': 'portatil, computador, equipo, laptop, pc, licencia, prestamo',
    '¿Cómo compro algo en la tienda de Compras Internas?': 'portatil, computador, laptop, equipo, licencia',
    '¿Qué pasa después de enviar mi solicitud de compra?': 'pedido, envio, entrega, estado',
    '¿Cómo confirmo que recibí mi pedido de compra?': 'paquete, pedido, envio, entrega, llego',
    '¿Qué hago si mi pedido de compra no llegó?': 'paquete, pedido, envio, entrega, llego, solicitud',
    '¿Cómo veo mis cursos?': 'ver cursos, capacitaciones, formacion',
}

# Categoría de las filas existentes que quedaron sin categoría (solo se asigna si está vacía).
CATEGORIA_POR_PREGUNTA = {'¿Cómo cambio mi contraseña?': 'Mi cuenta'}

MAX_PALABRAS_CLAVE = 255


def fusionar_palabras_clave(actual, *nuevas):
    """Agrega las palabras que falten, sin quitar ni reordenar las existentes. Respeta el máximo de 255."""
    resultado = [p.strip() for p in actual.split(',') if p.strip()]
    vistas = {p.lower() for p in resultado}
    for lista in nuevas:
        for palabra in (p.strip() for p in lista.split(',')):
            if palabra and palabra.lower() not in vistas:
                if len(', '.join(resultado + [palabra])) > MAX_PALABRAS_CLAVE:
                    continue
                resultado.append(palabra)
                vistas.add(palabra.lower())
    return ', '.join(resultado)
