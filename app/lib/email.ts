import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'VMA <team@aalap.ai>',
      to: [to],
      subject: 'Reset Your Password - Video Music App',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 0; text-align: center;">
                  <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #FF7A00; font-size: 32px; font-weight: bold;">VMA</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                          Hi ${name},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                          We received a request to reset your password for your Video Music App account. Click the button below to create a new password:
                        </p>
                        <table role="presentation" style="margin: 30px auto;">
                          <tr>
                            <td style="border-radius: 6px; background-color: #FF7A00;">
                              <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 20px 0; color: #367AFF; font-size: 14px; line-height: 1.5; word-break: break-all;">
                          ${resetUrl}
                        </p>
                        <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                          © ${new Date().getFullYear()} Video Music App. All rights reserved.
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
    });
  } catch (error) {
    logger.error('Failed to send password reset email', error);
    throw new Error('Failed to send password reset email');
  }
}
