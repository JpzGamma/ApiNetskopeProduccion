import smtplib
from email.message import EmailMessage
from ..config import settings

def enviar_correo_verificacion(destinatario: str, nombre: str, codigo: str):
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

# === NUEVO: email de restablecimiento ===
def enviar_correo_reset(destinatario: str, nombre: str, reset_url: str, token: str):
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        raise RuntimeError("MAIL_USERNAME/MAIL_PASSWORD no configurados")

    msg = EmailMessage()
    msg["Subject"] = "Restablece tu contraseña - GammaIngenieros"
    msg["From"] = settings.MAIL_USERNAME
    msg["To"] = destinatario
    msg.set_content(
        f"Hola {nombre},\n\n"
        f"Para restablecer tu contraseña, abre este enlace (expira en {settings.RESET_TOKEN_EXPIRE_MINUTES} min):\n\n"
        f"{reset_url}\n\n"
        f"Si prefieres usar el token directamente en Swagger (/auth/reset), aquí está:\n{token}\n\n"
        f"Si no solicitaste este cambio, ignora este correo."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)