#!/usr/bin/env python3
"""
Envía la notificación de actualización de enlace de pago y advertencia técnica
sobre el puerto 8446 a los 9 pre-registros pendientes del CLAGTEE 2026.
"""
import os
import re
import sys
import json
import time
import urllib.request
import urllib.error

# Cargar RESEND_API_KEY desde .env.local
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if not os.path.exists(env_path):
    print("Error: No se encontró .env.local")
    sys.exit(1)

with open(env_path) as f:
    env_content = f.read()

resend_match = re.search(r"RESEND_API_KEY=([^\s]+)", env_content)
if not resend_match:
    print("Error: Falta RESEND_API_KEY en .env.local")
    sys.exit(1)

RESEND_API_KEY = resend_match.group(1).strip()
SENDER = "CLAGTEE 2026 <clagtee2026@clagtee.org>"
BCC = ["clagtee2026@pucv.cl"]

RECIPIENTS = [
    # REG-0139 ya fue enviado exitosamente (Resend ID: 01a13d64-e36e-70f7-90de-c5259ea17af0)
    {
        "id": "REG-0140",
        "name": "Hélio de Paiva Amorim Junior",
        "email": "amorim@cepel.br",
        "categoryLabel": "Autor",
        "amount": "350",
        "paper": "MAQ-2",
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2292",
        "notes": "Autor CEPEL Brasil"
    },
    {
        "id": "REG-0107",
        "name": "Manuel Lau Pacheco",
        "email": "manuel.lau@unsaac.edu.pe",
        "categoryLabel": "Estudiante",
        "amount": "180",
        "paper": None,
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2290",
        "notes": "UNSAAC Perú"
    },
    {
        "id": "REG-0101",
        "name": "Charle Correia",
        "email": "charle.correia@unesp.br",
        "categoryLabel": "Estudiante Autor",
        "amount": "180",
        "paper": "PLA-13",
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2290",
        "notes": "UNESP Brasil"
    },
    {
        "id": "REG-0108",
        "name": "Justo Roberts",
        "email": "jjroberts@fi.mdp.edu.ar",
        "categoryLabel": "Paper Adicional",
        "amount": "100",
        "paper": "PLA-57",
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2289",
        "notes": "Co-chair / UNMdP"
    },
    {
        "id": "REG-0136",
        "name": "Katarina Ferreira Trigueiro de Almeida",
        "email": "katarina.ferreira@gesel.ie.ufrj.br",
        "categoryLabel": "Cena de Gala adicional",
        "amount": "60",
        "paper": None,
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2288",
        "notes": "GESEL UFRJ Brasil"
    },
    {
        "id": "REG-0089",
        "name": "Gloria Patricia López Sepúlveda",
        "email": "gloriap@utfpr.edu.br",
        "categoryLabel": "Cena de Gala adicional",
        "amount": "60",
        "paper": None,
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2288",
        "notes": "UTFPR Brasil"
    },
    {
        "id": "REG-0032",
        "name": "José Luis Pañinao Fuentealba",
        "email": "jpaninao@csi-ing.com",
        "categoryLabel": "Participante General",
        "amount": "300",
        "paper": None,
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2291",
        "notes": "CSI Chile"
    },
    {
        "id": "REG-0012",
        "name": "Sergio Badilla",
        "email": "sbadilla@marmonutility.com",
        "categoryLabel": "Participante General",
        "amount": "300",
        "paper": None,
        "paymentUrl": "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=2291",
        "notes": "Marmon Utility"
    }
]

def build_email_html(r):
    name = r["name"]
    reg_id = r["id"]
    category = r["categoryLabel"]
    amount = r["amount"]
    payment_url = r["paymentUrl"]
    paper_info = f"<p style='margin:0 0 8px; font-size:14px; color:#425466;'>Paper asociado: <strong>{r['paper']}</strong></p>" if r.get("paper") else ""

    inner = f"""
    <h1 style="margin:0 0 14px; font-size:22px; line-height:1.3; color:#0D2C54;">Actualización: Enlace de pago para su inscripción</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>{name}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Le escribimos desde el Comité Organizador del <strong>XVI CLAGTEE 2026</strong> en relación a su pre-registro <strong>{reg_id}</strong>.
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Le informamos que la plataforma de eventos de la Pontificia Universidad Católica de Valparaíso (PUCV) ha actualizado los enlaces directos de pago para el congreso. Su pre-registro se encuentra <strong>válido y registrado dentro de plazo</strong> en nuestro sistema.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 8px; font-size:14px; color:#425466;">N° de pre-registro: <strong style="color:#0D2C54;">{reg_id}</strong></p>
        <p style="margin:0 0 8px; font-size:14px; color:#425466;">Categoría: <strong>{category}</strong></p>
        {paper_info}
        <p style="margin:0; font-size:14px; color:#425466;">Monto a pagar: <strong>USD {amount}</strong></p>
      </td></tr>
    </table>

    <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#425466;">
      <strong>Paso 1:</strong> Puede proceder con el pago en la plataforma oficial de la PUCV a través del siguiente botón:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:12px 0 20px;">
      <tr><td align="center">
        <a href="{payment_url}" style="background-color:#F4A261; color:#0D2C54; text-decoration:none; font-weight:700; padding:13px 30px; border-radius:8px; display:inline-block; font-size:16px;">
          Pagar en plataforma PUCV (USD {amount})
        </a>
      </td></tr>
    </table>

    <!-- Bloque de advertencia sobre firewall y puerto 8446 -->
    <div style="margin:20px 0; padding:14px 18px; background-color:#fff9e6; border:1px solid #f6d289; border-left:4px solid #F4A261; border-radius:8px; font-size:13.5px; line-height:1.6; color:#7d5306;">
      <p style="margin:0 0 6px; font-weight:700; font-size:14px; color:#854d0e;">⚠️ Recomendación importante sobre la conexión:</p>
      El portal de eventos de la universidad opera a través del puerto seguro <strong>8446</strong>. Si al abrir el enlace experimenta error de conexión o tiempo de espera agotado (<code>ERR_CONNECTION_TIMED_OUT</code>), esto se debe a restricciones de cortafuegos (firewall) de ciertas redes universitarias o corporativas.<br>
      <strong>Solución:</strong> Abra el enlace de pago desde una red doméstica o utilizando los <strong>datos móviles (4G/5G) de su celular</strong>.
    </div>

    <p style="margin:22px 0 14px; font-size:15px; line-height:1.6; color:#425466;">
      <strong>Paso 2:</strong> Una vez completado el pago:
    </p>
    <ul style="margin:0 0 20px 20px; padding:0; font-size:14.5px; line-height:1.6; color:#425466;">
      <li style="margin-bottom:8px;">Puede subir su comprobante en PDF/imagen ingresando a la web oficial <a href="https://clagtee2026.org/#inscripcion" style="color:#2A9D8F; font-weight:700;">clagtee2026.org/#inscripcion</a>.</li>
      <li>O bien, simplemente <strong>responda a este correo adjuntando el comprobante</strong> de pago para que nuestro equipo lo valide manualmente de forma directa.</li>
    </ul>

    <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#667085;">
      Si ya realizó el pago en las últimas horas y nos envió su comprobante, por favor desestime este mensaje mientras procesamos la validación.
    </p>
    """

    full_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Actualización enlace de pago - CLAGTEE 2026</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              {inner}
              <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Consultas y soporte:
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026 · Pontificia Universidad Católica de Valparaíso
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return full_html


def send_email(r):
    payload = {
        "from": SENDER,
        "to": [r["email"]],
        "bcc": BCC,
        "subject": f"Actualización: Enlace de pago para su inscripción ({r['id']}) - CLAGTEE 2026",
        "html": build_email_html(r)
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "CLAGTEE-Platform/1.0 (Macintosh; Intel Mac OS X 10_15_7)"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return True, data.get("id")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        return False, f"HTTP {e.code}: {error_msg}"
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    dry_run = "--send" not in sys.argv
    print(f"=== Envío de Actualización de Enlaces de Pago ({'DRY RUN' if dry_run else 'ENVÍO REAL'}) ===")
    print(f"Total destinatarios: {len(RECIPIENTS)}")

    for idx, r in enumerate(RECIPIENTS, 1):
        print(f"\n[{idx}/{len(RECIPIENTS)}] {r['id']} - {r['name']} <{r['email']}>")
        print(f"       Categoría: {r['categoryLabel']} (USD {r['amount']})")
        print(f"       Enlace: {r['paymentUrl']}")

        if not dry_run:
            success, result_id = send_email(r)
            if success:
                print(f"       ✅ ENVIADO EXITOSAMENTE (Resend ID: {result_id})")
            else:
                print(f"       ❌ ERROR AL ENVIAR: {result_id}")
            time.sleep(0.6)
        else:
            print("       [DRY RUN: No se envía. Usa --send para ejecutar.]")

    print("\nProceso finalizado.")
