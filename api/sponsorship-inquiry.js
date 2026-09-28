import { getFirestore } from './_lib/firestore.js';
import { sendMailWithFallback } from './_lib/email.js';

const parseBody = (req) => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
};

const str = (val) => (typeof val === 'string' ? val.trim() : '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req) || {};
    const companyName = str(body.companyName);
    const contactName = str(body.contactName);
    const email = str(body.email);
    const phone = str(body.phone);
    const tier = str(body.tier) || 'general';
    const message = str(body.message);

    const errors = [];
    if (!companyName) errors.push('companyName');
    if (!contactName) errors.push('contactName');
    if (!/.+@.+\..+/.test(email)) errors.push('email');
    if (!phone) errors.push('phone');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Campos requeridos faltantes o inválidos', errors });
    }

    const db = getFirestore();
    const collectionRef = db.collection('sponsorship_inquiries');
    const inquiryId = `AUSP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const inquiryRecord = {
      id: inquiryId,
      companyName,
      contactName,
      email,
      phone,
      tier,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collectionRef.doc(inquiryId).set(inquiryRecord);

    const tierLabels = {
      oro: 'Auspicio ORO ($5.000.000 CLP + IVA - 1 Cupo Exclusivo)',
      plata: 'Auspicio PLATA ($4.000.000 CLP + IVA - 3 Cupos)',
      bronce: 'Auspicio BRONCE ($2.000.000 CLP + IVA)',
      stand: 'Stand de Exhibición Comercial (USD 800)',
      personalizado: 'Propuesta Personalizada / Otra modalidad',
    };
    const tierDisplay = tierLabels[tier] || tier;

    // Notificación a la organización
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
        <h2 style="color: #0D2C54; border-bottom: 2px solid #2A9D8F; padding-bottom: 8px;">
          Nueva Solicitud de Auspicio / Pre-Reserva CLAGTEE 2026
        </h2>
        <p>Se ha recibido una nueva manifestación de interés corporativo para el congreso:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 35%;">ID de Solicitud:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${inquiryId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Institución / Empresa:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #0D2C54;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Modalidad de Interés:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; color: #d97706; font-weight: bold;">${tierDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Persona de Contacto:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Email de Contacto:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Teléfono / WhatsApp:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${phone}</td>
          </tr>
          ${
            message
              ? `<tr>
            <td style="padding: 8px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Comentarios / Notas:</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${message}</td>
          </tr>`
              : ''
          }
        </table>
        <p style="color: #64748b; font-size: 13px;">Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
      </div>
    `;

    // Acuse de recibo para el patrocinador
    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
        <h2 style="color: #0D2C54;">CLAGTEE 2026 - Solicitud de Auspicio Recibida</h2>
        <p>Estimado(a) <strong>${contactName}</strong>,</p>
        <p>Agradecemos el interés de <strong>${companyName}</strong> en formar parte del <strong>XVI Congreso Latinoamericano de Generación y Transporte de Energía Eléctrica (CLAGTEE 2026)</strong>, que se celebrará en Santiago de Chile los días 28, 29 y 30 de Octubre de 2026.</p>
        
        <div style="background: #f8fafc; border-left: 4px solid #F4A261; padding: 12px 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Código de solicitud:</strong> ${inquiryId}</p>
          <p style="margin: 0;"><strong>Modalidad seleccionada:</strong> ${tierDisplay}</p>
        </div>

        <p>Hemos registrado su pre-reserva de interés. Un coordinador de nuestro Comité Organizador se pondrá en contacto con usted dentro de las próximas 24 horas hábiles para coordinar el acuerdo, resolver dudas técnicas o administrativas y gestionar la facturación correspondiente.</p>
        
        <p>Recordamos que los espacios y exclusividades se asignan por orden de confirmación y pago.</p>
        
        <p style="margin-top: 24px;">Atentamente,<br>
        <strong>Comité Organizador CLAGTEE 2026</strong><br>
        Pontificia Universidad Católica de Valparaíso<br>
        Email: <a href="mailto:clagtee2026@pucv.cl">clagtee2026@pucv.cl</a> | Web: <a href="https://www.clagtee2026.org">www.clagtee2026.org</a><br>
        Teléfono: +56 32 227 3661</p>
      </div>
    `;

    // Enviar correos de forma asíncrona sin bloquear la respuesta
    void Promise.allSettled([
      sendMailWithFallback({
        to: process.env.SENDER_EMAIL || 'clagtee2026@pucv.cl',
        subject: `[CLAGTEE 2026] Nueva Solicitud de Auspicio: ${companyName} (${tier.toUpperCase()})`,
        html: adminHtml,
        text: `Nueva Solicitud de Auspicio CLAGTEE 2026\nEmpresa: ${companyName}\nContacto: ${contactName} (${email}, ${phone})\nModalidad: ${tierDisplay}\nNotas: ${message}`,
      }),
      sendMailWithFallback({
        to: email,
        subject: `[CLAGTEE 2026] Hemos recibido su solicitud de auspicio - ${companyName}`,
        html: clientHtml,
        text: `Estimado(a) ${contactName},\nHemos recibido la pre-reserva de auspicio de ${companyName} para CLAGTEE 2026 (${tierDisplay}). El Comité Organizador le contactará dentro de las próximas 24 horas hábiles.\nContacto: clagtee2026@pucv.cl`,
      }),
    ]);

    return res.status(200).json({
      success: true,
      inquiryId,
      message: 'Solicitud de pre-reserva registrada exitosamente.',
    });
  } catch (error) {
    console.error('Error handling sponsorship inquiry:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud' });
  }
}
