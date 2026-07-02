import { Env } from '../types';

async function sendBrevoEmail(env: Env, to: string, subject: string, htmlContent: string, senderName = 'CyberCoderBD') {
  if (!env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not set');
    return;
  }
  
  const payload = {
    sender: { name: senderName, email: 'noreply@cybercoderbd.com' },
    to: [{ email: to }],
    subject,
    htmlContent
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': env.BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Brevo API Error:', response.status, errorBody);
  }
}

export async function sendWelcomeEmail(env: Env, toEmail: string, name: string) {
  const html = `
    <h1>Welcome ${name}!</h1>
    <p>Thank you for registering. You can now purchase and download our digital tools.</p>
  `;
  await sendBrevoEmail(env, toEmail, 'Welcome to CyberCoderBD!', html);
}

export async function sendMagicLinkEmail(env: Env, toEmail: string, token: string) {
  const magicLink = `https://vcc.cybercoderbd.com/auth/verify?token=${token}`;
  const html = `
    <h2>Secure Login Request</h2>
    <p>Click the link below to securely log into your account:</p>
    <a href="${magicLink}">Login to CyberCoderBD</a>
    <p>This link will expire in 15 minutes.</p>
  `;
  await sendBrevoEmail(env, toEmail, 'Your Magic Login Link', html, 'CyberCoderBD Security');
}

export async function sendDownloadEmail(env: Env, toEmail: string, productName: string, downloadUrl: string) {
  const html = `
    <h2>Thank you for your purchase!</h2>
    <p>Your order for <strong>${productName}</strong> has been confirmed.</p>
    <p>You can access your digital product here:</p>
    <a href="${downloadUrl}">Download Product</a>
  `;
  await sendBrevoEmail(env, toEmail, `Your Download: ${productName}`, html, 'CyberCoderBD Downloads');
}

export async function sendAbandonedCartEmail(env: Env, toEmail: string, name: string) {
  const html = `
    <h2>Hi ${name}, you left something behind!</h2>
    <p>We noticed you added some items to your cart but haven't checked out yet.</p>
    <p>Your items are still waiting for you. <a href="https://vcc.cybercoderbd.com/">Return to store</a> to complete your purchase.</p>
  `;
  await sendBrevoEmail(env, toEmail, 'Did you forget something?', html, 'CyberCoderBD Sales');
}
