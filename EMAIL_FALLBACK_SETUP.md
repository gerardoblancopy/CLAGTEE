# Configuración del Fallback de Correo SMTP (Nodemailer) para CLAGTEE 2026

El sistema de correos del CMS cuenta ahora con un mecanismo de **Auto-Failover (Fallback automático)** implementado en `api/_lib/email.js`:

1. **Prioridad 1 (Resend):** Intenta enviar a través de Resend para aprovechar estadísticas y velocidad.
2. **Prioridad 2 (SMTP vía Nodemailer):** Si Resend alcanza el límite diario (100 correos/día en el plan gratuito), retorna código de saturación (`429`), o falla por cuota, conmuta **inmediatamente y de forma transparente a SMTP**.

---

## Paso 1: Obtener la Contraseña de Aplicación (Google Workspace / Gmail / PUCV)

Si la cuenta del congreso es `clagtee2026@pucv.cl` (gestionada en Google Workspace) o una cuenta de Gmail:

1. Inicia sesión con la cuenta de correo en [myaccount.google.com](https://myaccount.google.com/).
2. Ve a la pestaña **Seguridad**.
3. Asegúrate de tener activa la **Verificación en 2 pasos**.
4. En el buscador de la cuenta (arriba), escribe **"Contraseñas de aplicaciones"** (o ingresa directo a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
5. Crea una nueva contraseña con el nombre `CMS CLAGTEE 2026`.
6. Google generará una clave de **16 caracteres** (ejemplo: `abcd efgh ijkl mnop`). Cópiala.

> **Nota:** Si la cuenta institucional de la PUCV utiliza otro servidor SMTP propio (ej: `mail.pucv.cl`), simplemente se usan las credenciales SMTP de ese servidor.

---

## Paso 2: Configurar las Variables de Entorno en Vercel

1. Ingresa a tu panel en [vercel.com](https://vercel.com/) y selecciona el proyecto `clagtee-2026-conference-website-2`.
2. Ve a **Settings** → **Environment Variables**.
3. Añade las siguientes variables (aplícalas a *Production*, *Preview* y *Development*):

| Variable | Valor Recomendado (Google Workspace / PUCV) | Descripción |
| :--- | :--- | :--- |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `465` | Puerto seguro SSL |
| `SMTP_SECURE` | `true` | Habilitar SSL directo (puerto 465) |
| `SMTP_USER` | `clagtee2026@pucv.cl` *(o tu correo Gmail)* | Usuario remitente autenticado |
| `SMTP_PASS` | `abcdefghijklmnop` | La contraseña de aplicación de 16 caracteres |
| `SMTP_FROM` | `CLAGTEE 2026 <clagtee2026@pucv.cl>` *(opcional)* | Remitente visible |

4. Si deseas probarlo localmente, añade estas mismas líneas a tu archivo `.env.local`.

---

## Paso 3: ¿Cómo comprobar que está funcionando?

* No requieres cambiar nada en el CMS.
* Cuando envíes correos (invitación a revisores, asignaciones, recibos de inscripción o avisos generales):
  * Si Resend tiene cuota disponible, verás en los logs: `[email:resend] ... enviado a destinatario@correo.com`.
  * Si Resend agota su cuota del día, verás en los logs de Vercel:
    ```text
    [email:fallback] Activando fallback SMTP para Invitación a revisor/a hacia destinatario@correo.com. Motivo: Resend fallo (...)
    [email:smtp] Envio exitoso via SMTP para Invitación a revisor/a a destinatario@correo.com: <message-id>
    ```
  * El usuario en el CMS nunca experimentará un corte o error de envío por límite diario.
