import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  otpCode: string;
}

let cachedTransporter: Transporter | null = null;
let cachedCredentialsKey = '';

function getTransporter(): Transporter | null {
  const emailUser = (process.env.EMAIL_USER || env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || env.EMAIL_PASS || '').trim();

  if (!emailUser || !emailPass) {
    console.warn('⚠️ [EMAIL SERVICE] EMAIL_USER or EMAIL_PASS not configured in .env.');
    return null;
  }

  const credentialsKey = `${emailUser}:${emailPass}`;
  if (cachedTransporter && cachedCredentialsKey === credentialsKey) {
    return cachedTransporter;
  }

  try {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    cachedCredentialsKey = credentialsKey;
    return cachedTransporter;
  } catch (err: any) {
    console.error('❌ [EMAIL SERVICE] Failed to initialize Gmail SMTP transport:', err.message);
    return null;
  }
}

/**
 * Sends a high-priority Trinetra Account Verification email containing a 6-digit OTP
 * directly through Gmail SMTP to the user's real email inbox.
 */
export async function sendVerificationEmail(
  toEmail: string,
  userName: string,
  otpCode: string
): Promise<EmailSendResult> {
  const emailUser = (process.env.EMAIL_USER || env.EMAIL_USER || '').trim() || 'bighamster1001@gmail.com';

  console.log('\n======================================================');
  console.log(`📬 [TRINETRA DISPATCHING REAL EMAIL]`);
  console.log(`From: ${emailUser}`);
  console.log(`To: ${toEmail} (${userName})`);
  console.log(`🔑 OTP CODE: ${otpCode}`);
  console.log('======================================================\n');

  const mailOptions = {
    from: `"Trinetra Citizen Safety" <${emailUser}>`,
    to: toEmail,
    replyTo: emailUser,
    subject: `🔐 Verify Your Trinetra Account - ${otpCode}`,
    text: `Hello ${userName},\n\nYour Trinetra verification code is: ${otpCode}\n\nThis code will expire in 15 minutes. If you did not request this registration, please disregard this email.\n\nTrinetra Citizen Safety & Vigilance Network`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trinetra Account Verification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1120; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background-color: #4f46e5; color: #ffffff; font-size: 20px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 0 20px rgba(79, 70, 229, 0.5);">
                      🛡️
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">TRINETRA</h1>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">Citizen Safety & Rapid Response Network</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 600;">Welcome, ${userName}!</h2>
                    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                      Thank you for joining Trinetra. To activate your citizen account and secure your access to emergency safe corridors and incident tracking, please verify your email address.
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background-color: #020617; border: 2px dashed #4f46e5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);">
                        ${otpCode}
                      </div>
                      <span style="display: block; font-size: 11px; color: #64748b; margin-top: 8px;">Valid for 15 minutes</span>
                    </div>

                    <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                      Enter this code into your verification screen to complete your sign-up. Once verified, you will be able to complete your profile with optional family emergency contact numbers and residential details.
                    </p>

                    <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 12px; color: #c7d2fe;">
                        <strong>Security Notice:</strong> Law enforcement officers will never ask you for your verification code.
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      If you did not initiate this registration, please safely ignore this message.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #475569;">
                      © ${new Date().getFullYear()} Trinetra Rapid Response & Citizen Safety System. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  const transport = getTransporter();
  if (!transport) {
    return {
      success: false,
      error: 'SMTP transporter credentials missing.',
      otpCode,
    };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ [EMAIL SERVICE] REAL GMAIL SENT to ${toEmail}! Response: ${info.response}, ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      otpCode,
    };
  } catch (err: any) {
    console.error(`❌ [EMAIL SERVICE] Gmail SMTP delivery failed to ${toEmail}: ${err.message}`);
    return {
      success: false,
      error: err.message,
      otpCode,
    };
  }
}
