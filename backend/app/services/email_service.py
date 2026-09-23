"""
Email service using Gmail SMTP.
Handles sending transactional emails (e.g., password reset).
Uses Python built-in smtplib — no third-party SDK required.
"""
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_reset_email(to_email: str, reset_link: str, user_name: str = "usuario") -> None:
    """Send a password reset email via Gmail SMTP."""

    html_body = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Redefinir senha - TaskFlow</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">&#9889; TaskFlow</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#111827;">Redefinicao de senha</h1>
              <p style="margin:0 0 8px;color:#6b7280;font-size:15px;line-height:1.6;">
                Ola, <strong>{user_name}</strong>!
              </p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                Recebemos uma solicitacao para redefinir a senha da sua conta TaskFlow.
                Clique no botao abaixo para criar uma nova senha:
              </p>
              <a href="{reset_link}"
                 style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Redefinir minha senha
              </a>
              <p style="margin:28px 0 16px;color:#9ca3af;font-size:13px;line-height:1.6;">
                Este link expira em <strong>15 minutos</strong>.<br/>
                Se voce nao solicitou a redefinicao, pode ignorar este e-mail.
              </p>
              <p style="margin:0;color:#d1d5db;font-size:12px;">
                Ou copie e cole o link abaixo no navegador:<br/>
                <span style="color:#6366f1;word-break:break-all;">{reset_link}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:12px;">TaskFlow &middot; Gerenciamento de tarefas</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Redefinicao de senha - TaskFlow"
    msg["From"] = f"TaskFlow <{settings.SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
