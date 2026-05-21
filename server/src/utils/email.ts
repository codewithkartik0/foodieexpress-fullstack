import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../config/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

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

/**
 * Send an email via SMTP, or log to stdout when SMTP is not configured (dev convenience).
 * Failures are logged but do not throw — callers should not block user-facing flows on email.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info('[email:stdout]', { to: msg.to, subject: msg.subject, text: msg.text });
    return;
  }
  try {
    const info = await t.sendMail({
      from: config.smtp.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    logger.info(`Email sent: ${info.messageId} -> ${msg.to}`);
  } catch (err) {
    logger.error('Email send failed', err as Error);
  }
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
