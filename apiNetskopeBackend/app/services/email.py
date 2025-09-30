import smtplib
from email.message import EmailMessage
from ..config import settings

def enviar_correo_verificacion(destinatario: str, nombre: str, codigo: str):
    """
    Summary:
        Envía un correo con un código de verificación para activar la cuenta.

    Params:
        destinatario (str): Dirección de correo del receptor.
        nombre (str): Nombre del usuario a personalizar en el mensaje.
        codigo (str): Código de verificación de 6 dígitos.

    Return:
        None: No retorna valor. Lanza RuntimeError si faltan credenciales o excepciones de SMTP al fallar el envío.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        raise RuntimeError("MAIL_USERNAME/MAIL_PASSWORD no configurados")

    msg = EmailMessage()
    msg["Subject"] = "Código de Verificación - GammaIngenieros"
    msg["From"] = settings.MAIL_USERNAME
    msg["To"] = destinatario
    msg.set_content(
        f"Hola {nombre},\n\nTu código de verificación es: {codigo}\n\nAtte: GammaIngenieros"
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)


def enviar_correo_reset_codigo(destinatario: str, nombre: str, codigo: str):
    """
    Summary:
        Envía un correo con un código temporal para restablecer la contraseña (sin enlace).

    Params:
        destinatario (str): Dirección de correo del receptor.
        nombre (str): Nombre del usuario para personalizar el mensaje.
        codigo (str): Código de restablecimiento de 6 dígitos.

    Return:
        None: No retorna valor. Lanza RuntimeError si faltan credenciales o excepciones de SMTP al fallar el envío.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        raise RuntimeError("MAIL_USERNAME/MAIL_PASSWORD no configurados")

    msg = EmailMessage()
    msg["Subject"] = "Código para restablecer tu contraseña - GammaIngenieros"
    msg["From"] = settings.MAIL_USERNAME
    msg["To"] = destinatario
    msg.set_content(
        f"Hola {nombre},\n\n"
        f"Tu código para restablecer la contraseña es: {codigo}\n"
        f"Este código expira pronto. Si no solicitaste este cambio, ignora este correo.\n\n"
        f"Atte: GammaIngenieros"
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)