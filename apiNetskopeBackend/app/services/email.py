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