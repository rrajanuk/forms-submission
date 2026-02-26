import nodemailer from 'nodemailer';

/**
 * Email Service for sending transactional emails
 * Supports verification emails and submission notifications
 */

// Create transporter based on environment variables
const createTransporter = () => {
  // Check if email is enabled
  if (!process.env.SMTP_ENABLED || process.env.SMTP_ENABLED === 'false') {
    console.log('📧 Email sending is disabled (SMTP_ENABLED=false)');
    return null;
  }

  // Validate required environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error(`❌ Missing SMTP configuration: ${missing.join(', ')}`);
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add logging for debugging
      logger: process.env.NODE_ENV === 'development',
      debug: process.env.NODE_ENV === 'development',
    });

    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    return null;
  }
};

/**
 * Send verification email to user
 */
export const sendVerificationEmail = async (
  email: string,
  userName: string,
  verificationToken: string
): Promise<{ success: boolean; messageId?: string; error?: string; fallbackToken?: string }> => {
  const transporter = createTransporter();

  // If email is disabled, return token as fallback
  if (!transporter) {
    console.log('📧 Email disabled - returning verification token as fallback');
    return {
      success: false,
      fallbackToken: verificationToken,
    };
  }

  // Build verification URL
  const baseUrl = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"Form Builder" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address - Form Builder',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
          .greeting { font-size: 18px; margin-bottom: 20px; }
          .message { color: #555; margin-bottom: 30px; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); }
          .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }
          .link-section { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 30px 0; }
          .link-label { font-size: 14px; color: #666; margin-bottom: 10px; font-weight: 600; }
          .link-url { word-break: break-all; font-family: 'Courier New', monospace; font-size: 13px; color: #333; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 13px; }
          .footer p { margin: 5px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #856404; }
          .emoji { font-size: 24px; margin-bottom: 10px; display: block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="emoji">🎉</span>
            <h1>Welcome to Form Builder!</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${userName ? userName + ',' : 'there,'}</p>
            <p class="message">Thank you for registering with Form Builder! We're excited to have you on board. Before you can start creating beautiful forms, we need to verify your email address.</p>

            <div class="button-container">
              <a href="${verificationUrl}" class="button">✓ Verify Email Address</a>
            </div>

            <div class="link-section">
              <p class="link-label">Or copy and paste this link into your browser:</p>
              <p class="link-url">${verificationUrl}</p>
            </div>

            <div class="warning">
              <strong>This link will expire in 24 hours.</strong><br>
              If you didn't create an account with Form Builder, please ignore this email.
            </div>

            <div class="footer">
              <p>Form Builder - Create Beautiful Forms</p>
              <p>Need help? Contact us at ${process.env.NOTIFICATION_EMAIL || 'support@formbuilder.com'}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Form Builder!

      Hi ${userName || 'there'},

      Thank you for registering with Form Builder! We're excited to have you on board.

      Before you can start creating beautiful forms, please verify your email address by clicking the link below:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account with Form Builder, please ignore this email.

      Need help? Contact us at ${process.env.NOTIFICATION_EMAIL || 'support@formbuilder.com'}
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Verification email sent successfully');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   URL:', verificationUrl);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send verification email:', error.message);
    console.error('   To:', email);
    console.error('   Error:', error);

    // Return token as fallback so registration doesn't fail completely
    return {
      success: false,
      error: error.message,
      fallbackToken: verificationToken,
    };
  }
};

/**
 * Send notification for new form submission
 */
export const sendSubmissionNotification = async (
  to: string,
  formName: string,
  submissionData: any,
  organizationName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('📧 Email disabled - skipping submission notification');
    return { success: false };
  }

  const submissionCount = Object.keys(submissionData).length;
  const timestamp = new Date().toLocaleString();

  const mailOptions = {
    from: `"Form Builder" <${process.env.SMTP_FROM}>`,
    to,
    subject: `📝 New Form Submission: ${formName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }
          .field { margin: 10px 0; }
          .label { font-weight: 600; color: #555; }
          .value { color: #333; word-break: break-word; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 New Form Submission</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="field">
                <span class="label">Organization:</span>
                <span class="value">${organizationName}</span>
              </div>
              <div class="field">
                <span class="label">Form:</span>
                <span class="value">${formName}</span>
              </div>
              <div class="field">
                <span class="label">When:</span>
                <span class="value">${timestamp}</span>
              </div>
              <div class="field">
                <span class="label">Fields submitted:</span>
                <span class="value">${submissionCount}</span>
              </div>
            </div>

            <h3>Submission Data:</h3>
            ${Object.entries(submissionData).map(([key, value]) => `
              <div class="field">
                <span class="label">${key}:</span>
                <span class="value">${value as string}</span>
              </div>
            `).join('')}

            <div class="footer">
              <p>Sent by Form Builder</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      New Form Submission

      Organization: ${organizationName}
      Form: ${formName}
      When: ${timestamp}
      Fields submitted: ${submissionCount}

      Submission Data:
      ${Object.entries(submissionData).map(([key, value]) => `${key}: ${value}`).join('\n')}
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Submission notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send submission notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
export const testEmailConfig = async (): Promise<{ success: boolean; message: string; error?: string }> => {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      message: 'Email transporter not created. Check SMTP configuration.',
    };
  }

  try {
    // Verify SMTP configuration
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP configuration is valid!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'SMTP configuration failed',
      error: error.message,
    };
  }
};
