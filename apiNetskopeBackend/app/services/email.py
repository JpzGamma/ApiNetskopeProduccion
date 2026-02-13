import smtplib
from email.message import EmailMessage
from ..config import settings


# =========================
# Helpers: HTML estilo UI
# =========================

def _html_shell(title: str, subtitle: str, body_html: str) -> str:
    return f"""\
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>{title}</title>
  </head>
  <body style="margin:0; padding:0; background:#e3f2fd;">
    <div style="
      background: linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%);
      padding: 32px 12px;
      font-family: Arial, Helvetica, sans-serif;
    ">
      <div style="max-width:560px; margin:0 auto;">
        <div style="
          background: linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%);
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.10);
        ">
          <div style="
            background:#ffffff;
            border-radius:14px;
            box-shadow: 0px 10px 30px rgba(0,0,0,0.06);
            overflow:hidden;
          ">
            <div style="padding:20px 22px 12px 22px; text-align:center;">
              <div style="font-size:18px; font-weight:700; color:#0b2d52;">
                {title}
              </div>
              <div style="margin-top:6px; font-size:13px; color:#6b7a90;">
                {subtitle}
              </div>
            </div>

            <div style="padding:6px 22px 22px 22px; color:#24364a; font-size:14px; line-height:1.55;">
              {body_html}
            </div>
          </div>

          <div style="text-align:center; margin-top:18px; color:#6b7a90; font-size:12px;">
            <div>&copy; 2026 Api - Netskope</div>
            <div>Equipo de Desarrollo Gamma Ingenieros</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
"""


def _badges_header() -> str:
    return """
    <div style="text-align:center; margin-bottom: 14px;">
      <span style="
        display:inline-block;
        padding: 8px 12px;
        border-radius: 10px;
        background:#f3f6fb;
        color:#0b2d52;
        font-weight:700;
        font-size:12px;
        margin-right: 8px;
      ">Api Netskope</span>
    </div>
    """


def _code_box(code: str) -> str:
    return f"""
    <div style="margin: 14px 0 16px 0;">
      <div style="font-size:12px; color:#6b7a90; margin-bottom:8px;">
        Código:
      </div>
      <div style="
        font-size: 28px;
        letter-spacing: 6px;
        font-weight: 800;
        text-align: center;
        padding: 14px 12px;
        border-radius: 12px;
        background: #f3f6fb;
        color: #0b2d52;
      ">{code}</div>
    </div>
    """


def _note_box(text: str) -> str:
    return f"""
    <div style="
      margin-top: 12px;
      padding: 12px 12px;
      border-radius: 12px;
      background:#f8fafc;
      border:1px solid #edf2f7;
      color:#6b7a90;
      font-size: 12px;
      line-height: 1.55;
    ">{text}</div>
    """


# =========================
# Helper: envío SMTP
# =========================

def _send_email(destinatario: str, subject: str, text_body: str, html_body: str) -> None:
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        raise RuntimeError("MAIL_USERNAME/MAIL_PASSWORD no configurados")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_USERNAME
    msg["To"] = destinatario

    # Texto plano (fallback)
    msg.set_content(text_body)

    # HTML (bonito)
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)


# =========================
# Funciones públicas
# =========================

def enviar_correo_verificacion(destinatario: str, nombre: str, codigo: str):
    """Envía un correo con un código de verificación para activar la cuenta."""
    subject = "Código de Verificación - GammaIngenieros"

    text = (
        f"Hola {nombre},\n\n"
        f"Tu código de verificación es: {codigo}\n\n"
        f"Atte: GammaIngenieros"
    )

    body = f"""
      {_badges_header()}
      <p style="margin:0 0 10px 0;">
        Hola <b>{nombre}</b>, usa el siguiente código para <b>verificar tu cuenta</b>.
      </p>
      {_code_box(codigo)}
      {_note_box("Este código es de un solo uso. No lo compartas con nadie.")}
    """

    html = _html_shell(
        title="Verificación de cuenta",
        subtitle="Completa el registro con tu código",
        body_html=body,
    )

    _send_email(destinatario, subject, text, html)


def enviar_correo_reset_codigo(destinatario: str, nombre: str, codigo: str):
    """Envía un correo con un código temporal para restablecer la contraseña (sin enlace)."""
    subject = "Código para restablecer tu contraseña - GammaIngenieros"

    text = (
        f"Hola {nombre},\n\n"
        f"Tu código para restablecer la contraseña es: {codigo}\n"
        f"Este código expira pronto. Si no solicitaste este cambio, ignora este correo.\n\n"
        f"Atte: GammaIngenieros"
    )

    body = f"""
      {_badges_header()}
      <p style="margin:0 0 10px 0;">
        Hola <b>{nombre}</b>, usa el siguiente código para <b>restablecer tu contraseña</b>.
      </p>
      {_code_box(codigo)}
      {_note_box("Este código expira pronto. Si no solicitaste este cambio, ignora este correo.")}
    """

    html = _html_shell(
        title="Restablecimiento de contraseña",
        subtitle="Recupera el acceso con tu código",
        body_html=body,
    )

    _send_email(destinatario, subject, text, html)


def enviar_correo_2fa_codigo(destinatario: str, nombre: str, codigo: str):
    """✅ Envía el correo con el código de doble factor (2FA) para inicio de sesión."""
    subject = "Código de inicio de sesión - GammaIngenieros"

    text = (
        f"Hola {nombre},\n\n"
        f"Tu código de inicio de sesión es: {codigo}\n"
        f"Este código expira pronto.\n\n"
        f"Atte: GammaIngenieros"
    )

    body = f"""
      {_badges_header()}
      <p style="margin:0 0 10px 0;">
        Hola <b>{nombre}</b>, tu código para completar el <b>inicio de sesión</b> es:
      </p>
      {_code_box(codigo)}
      {_note_box("Este código expira pronto. Si no fuiste tú, cambia tu contraseña.")}
    """

    html = _html_shell(
        title="Verificación 2FA",
        subtitle="Seguridad adicional para tu cuenta",
        body_html=body,
    )

    _send_email(destinatario, subject, text, html)
