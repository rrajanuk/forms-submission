/**
 * Email Configuration Test Script
 *
 * Run this script to test your email setup:
 * node test-email.js
 */

require('dotenv').config();

console.log('🔧 Testing Email Configuration...\n');

// Check environment variables
console.log('1. Checking environment variables...');
const requiredVars = ['SMTP_ENABLED', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:');
  missing.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease add these to your .env file');
  process.exit(1);
}

console.log('✅ All required environment variables are set\n');

// Check if email is enabled
if (process.env.SMTP_ENABLED === 'false') {
  console.log('⚠️  Email sending is DISABLED (SMTP_ENABLED=false)');
  console.log('To enable, set SMTP_ENABLED=true in .env\n');
  process.exit(0);
}

console.log('✅ Email sending is ENABLED\n');

// Import and test nodemailer
const nodemailer = require('nodemailer');

console.log('2. Creating email transporter...');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true,
  debug: true,
});

console.log('✅ Transporter created\n');
console.log('   Host:', process.env.SMTP_HOST);
console.log('   Port:', process.env.SMTP_PORT);
console.log('   Secure:', process.env.SMTP_SECURE === 'true');
console.log('   User:', process.env.SMTP_USER);
console.log('   From:', process.env.SMTP_FROM);
console.log('');

// Test connection
console.log('3. Testing SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed!');
    console.error('   Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   - Check if SMTP credentials are correct');
    console.error('   - Check if network allows outbound SMTP (port 587/465)');
    console.error('   - For Gmail, use an App Password (not regular password)');
    console.error('   - For SendGrid/Mailgun, check if API key is valid');
    process.exit(1);
  }

  console.log('✅ SMTP connection successful!\n');

  // Send test email
  console.log('4. Sending test email...');
  const testEmail = process.argv[2] || process.env.SMTP_USER;

  transporter.sendMail({
    from: `"Form Builder Test" <${process.env.SMTP_FROM}>`,
    to: testEmail,
    subject: '✅ Form Builder - Email Test Successful',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; text-align: center; }
          .info { background: #e7f3ff; color: #004085; padding: 20px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h2>🎉 Email Test Successful!</h2>
            <p>Your email configuration is working perfectly.</p>
          </div>
          <div class="info">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>From:</strong> ${process.env.SMTP_FROM}</li>
              <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
            </ul>
          </div>
          <p style="text-align: center; margin-top: 20px; color: #666;">
            This is a test email from the Form Builder platform.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
      Email Test Successful!

      Your email configuration is working perfectly.

      Configuration:
      - Host: ${process.env.SMTP_HOST}
      - Port: ${process.env.SMTP_PORT}
      - From: ${process.env.SMTP_FROM}
      - Environment: ${process.env.NODE_ENV || 'development'}

      This is a test email from the Form Builder platform.
    `,
  })
  .then((info) => {
    console.log('✅ Test email sent successfully!\n');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', testEmail);
    console.log('\n📬 Check your inbox (and spam folder) for the test email.');
    console.log('\n✨ Your email setup is working! You can now use email verification.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to send test email!');
    console.error('   Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   - Check if recipient email is correct');
    console.error('   - Check if email provider allows sending from your account');
    console.error('   - Check daily sending limits (Gmail: 100/day, SendGrid: 100/day)');
    process.exit(1);
  });
});
