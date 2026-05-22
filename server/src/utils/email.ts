import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../config/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;
let resendClient: Resend | null = null;

/**
 * Parse an RFC 5322-style "Name <email@host>" string into its parts.
 * Falls back to using the raw value as the email and a generic name.
 */
function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*"?(.*?)"?\s*<\s*(\S+@\S+?)\s*>\s*$/);
  if (m) {
    return { name: m[1].trim() || 'FoodieExpress', email: m[2].trim() };
  }
  return { name: 'FoodieExpress', email: raw.trim() };
}

// --- Brevo (HTTP API, https://api.brevo.com) ----------------------------
//
// Works with a single-sender-verified email -- no domain ownership needed.
// Free tier: 300 emails/day, no card required.

async function sendViaBrevo(msg: EmailMessage): Promise<boolean> {
  if (!config.brevo.apiKey) return false;
  const sender = parseFrom(config.smtp.from);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevo.apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      logger.error(`Brevo send failed: HTTP ${res.status} ${errBody}`);
      // Returning true here means "we attempted via Brevo, do not fall through
      // to the next backend" -- we don't want a misconfigured Brevo key to
      // silently start using SMTP / stdout.
      return true;
    }
    const data = (await res.json()) as { messageId?: string };
    logger.info(`Email sent via Brevo: ${data.messageId ?? 'no-id'} -> ${msg.to}`);
    return true;
  } catch (err) {
    logger.error('Brevo send threw', err as Error);
    return true;
  }
}

// --- Resend (HTTP API) --------------------------------------------------
//
// Requires verified domain to send to arbitrary recipients (otherwise capped
// to the account-owner email). Kept as a backup option for projects that own
// a domain.

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!config.resend.apiKey) return null;
  resendClient = new Resend(config.resend.apiKey);
  return resendClient;
}

async function sendViaResend(msg: EmailMessage): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    const result = await resend.emails.send({
      from: config.smtp.from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (result.error) {
      logger.error('Resend send failed', result.error as unknown as Error);
      return true;
    }
    logger.info(`Email sent via Resend: ${result.data?.id ?? 'no-id'} -> ${msg.to}`);
    return true;
  } catch (err) {
    logger.error('Resend send threw', err as Error);
    return true;
  }
}

// --- SMTP via nodemailer ------------------------------------------------
//
// Works for local dev / non-Render hosts. Render blocks outbound SMTP, so on
// Render this path is effectively dead.

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

async function sendViaSmtp(msg: EmailMessage): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    const info = await t.sendMail({
      from: config.smtp.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    logger.info(`Email sent via SMTP: ${info.messageId} -> ${msg.to}`);
    return true;
  } catch (err) {
    logger.error('SMTP send failed', err as Error);
    return true;
  }
}

/**
 * Send an email using the first configured backend, in priority order:
 *
 *   1. Brevo HTTP API (BREVO_API_KEY)         -- works on Render, no domain needed
 *   2. Resend HTTP API (RESEND_API_KEY)       -- works on Render, requires verified domain
 *   3. SMTP via nodemailer (SMTP_HOST + creds) -- local dev / non-Render hosts
 *   4. stdout fallback                         -- dev convenience
 *
 * Failures are logged but never thrown -- callers must not block user-facing
 * flows on email delivery.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (await sendViaBrevo(msg)) return;
  if (await sendViaResend(msg)) return;
  if (await sendViaSmtp(msg)) return;
  logger.info('[email:stdout]', { to: msg.to, subject: msg.subject, text: msg.text });
}

// Email body templates ------------------------------------------------------

export function welcomeEmail(name: string): EmailMessage {
  return {
    to: '',
    subject: 'Welcome to FoodieExpress',
    html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome to FoodieExpress! Your account has been created. Start exploring restaurants near you.</p>`,
    text: `Hi ${name}, welcome to FoodieExpress! Your account has been created.`,
  };
}

export function verifyEmailOtpMessage(name: string, otp: string, ttlMinutes: number): EmailMessage {
  return {
    to: '',
    subject: `${otp} is your FoodieExpress verification code`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Use the code below to verify your FoodieExpress email address. The code expires in ${ttlMinutes} minutes.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#fff5ed;color:#bb320c;padding:14px 18px;border-radius:10px;display:inline-block">${otp}</p>
<p>If you didn’t create a FoodieExpress account, you can safely ignore this email — no account will be created without verification.</p>`,
    text: `Your FoodieExpress verification code is ${otp}. It expires in ${ttlMinutes} minutes. If you didn’t create an account, ignore this email.`,
  };
}

export function passwordResetEmail(name: string, resetUrl: string): EmailMessage {
  return {
    to: '',
    subject: 'Reset your FoodieExpress password',
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>You requested a password reset. Click the link below to set a new password. The link expires in 30 minutes.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request a reset, you can safely ignore this email.</p>`,
    text: `Hi ${name}, reset your password: ${resetUrl} (expires in 30 minutes)`,
  };
}

export function orderReceiptEmail(args: {
  name: string;
  orderNumber: string;
  total: number;
  itemsHtml: string;
  itemsText: string;
}): EmailMessage {
  return {
    to: '',
    subject: `FoodieExpress receipt – Order #${args.orderNumber}`,
    html: `<p>Hi ${escapeHtml(args.name)},</p>
<p>Thanks for ordering with FoodieExpress. Your payment has been received.</p>
<h3>Order #${args.orderNumber}</h3>
${args.itemsHtml}
<p><strong>Total: ₹${args.total.toFixed(2)}</strong></p>
<p>You can track your order status in the app.</p>`,
    text: `Hi ${args.name},\nReceipt for Order #${args.orderNumber}\n${args.itemsText}\nTotal: ₹${args.total.toFixed(2)}`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
