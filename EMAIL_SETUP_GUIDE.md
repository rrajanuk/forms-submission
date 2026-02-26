# Email Verification Setup Guide

**Application:** Multi-Tenant Form Submission Platform
**VPS IP:** 217.216.48.189
**Backend Port:** 3001
**Tech Stack:** Node.js, Express, TypeScript, Better-SQLite3

---

## Overview

This guide will help you set up email delivery for user verification emails. The application already has:
- ✅ Email verification token generation
- ✅ Database schema with email verification fields
- ✅ API endpoints for verification
- ✅ Frontend UI for verification
- ❌ **Missing:** Actual email sending functionality

---

## Quick Start: Choose Your Email Provider

### Recommended Options (Free Tier Available)

| Provider | Free Tier | Cost | Setup Difficulty | Best For |
|----------|-----------|------|------------------|----------|
| **Gmail SMTP** | ✅ Free | $0 | Easy | Development, low volume |
| **SendGrid** | ✅ 100/day | $0+ | Easy | Production, reliable |
| **Mailgun** | ✅ 5,000/month | $0+ | Easy | Production, flexible |
| **AWS SES** | ❌ None | Pay-as-you-go | Medium | High volume, cost-effective |
| **Brevo (formerly Sendinblue)** | ✅ 300/day | $0+ | Easy | Marketing + transactional |

---

## Option 1: Gmail SMTP (Easiest, Free)

### Pros
- ✅ Completely free
- ✅ Easy to set up
- ✅ Reliable for low volume (<100/day)

### Cons
- ⚠️ Daily sending limits
- ⚠️ Requires Gmail account
- ⚠️ May go to spam folder

### Setup Steps

#### 1. Enable 2-Factor Authentication on Gmail
```
1. Go to https://myaccount.google.com
2. Security → 2-Step Verification → Enable
```

#### 2. Create App Password
```
1. Google Account → Security
2. 2-Step Verification → App passwords
3. Generate → Select "Mail" → Select "Other (Custom name)"
4. Name it: "Form Submission Platform"
5. Generate → Copy the 16-character password
```

#### 3. Update `.env` File on VPS
```bash
# SSH into your VPS
ssh user@217.216.48.189

# Navigate to project
cd /var/www/forms-submission  # or your project path

# Edit .env file
nano .env
```

Add/Update these lines:
```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=noreply@yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com
```

#### 4. Restart Backend
```bash
pm2 reload forms-api
# or
pm2 restart forms-api
```

---

## Option 2: SendGrid (Recommended for Production)

### Pros
- ✅ 100 emails/day free
- ✅ Reliable delivery
- ✅ Good inbox placement
- ✅ Easy setup

### Setup Steps

#### 1. Create SendGrid Account
```
1. Go to https://sendgrid.com/
2. Sign up for free account
3. Verify your email address
```

#### 2. Create API Key
```
1. Settings → API Keys
2. Create API Key
3. Name it: "Form Submission Platform"
4. Permissions: Mail Send
5. Copy the API key (starts with SG.)
```

#### 3. Verify Sender Identity
```
1. Settings → Sender Authentication
2. Choose "Single Sender Verification"
3. Enter your email and click "Verify"
4. Check your email and click verification link
```

#### 4. Update `.env` on VPS
```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.YOUR_API_KEY_HERE
SMTP_FROM=noreply@yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com
```

---

## Option 3: Mailgun (Flexible)

### Pros
- ✅ 5,000 emails/month free
- ✅ Good documentation
- ✅ Flexible routing

### Setup Steps

#### 1. Create Mailgun Account
```
1. Go to https://www.mailgun.com/
2. Sign up for free trial
3. Verify your email
```

#### 2. Verify Domain (Optional but Recommended)
```
1. Domains → Add New Domain
2. Enter your domain (e.g., yourdomain.com)
3. Add DNS records to your domain registrar
```

#### 3. Get SMTP Credentials
```
1. Domains → Select your domain
2. Domain Settings → SMTP Credentials
3. Reset password or create new credentials
```

#### 4. Update `.env` on VPS
```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@mg.yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com
```

---

## Backend Implementation

The backend already has email verification endpoints. Now we need to add the actual email sending functionality.

### 1. Create Email Service

Create file: `src/services/email.service.ts`

```typescript
import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_ENABLED || process.env.SMTP_ENABLED === 'false') {
    console.log('📧 Email sending is disabled');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  userName: string,
  verificationToken: string
) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('📧 Email disabled - verification token:', verificationToken);
    return { success: false, message: 'Email sending disabled' };
  }

  const verificationUrl = `${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"Form Builder" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .code { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Form Builder!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>Thank you for registering with Form Builder! We're excited to have you on board.</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">✓ Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <div class="code">${verificationUrl}</div>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with Form Builder, please ignore this email.</p>
            <div class="footer">
              <p>Form Builder - Create Beautiful Forms</p>
              <p>Need help? Contact us at ${process.env.NOTIFICATION_EMAIL}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Form Builder!

      Hi ${userName || 'there'},

      Thank you for registering! Please verify your email address by visiting:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

// Send notification for new form submission
export const sendSubmissionNotification = async (
  to: string,
  formName: string,
  submissionData: any
) => {
  const transporter = createTransporter();

  if (!transporter) {
    return { success: false, message: 'Email sending disabled' };
  }

  const mailOptions = {
    from: `"Form Builder" <${process.env.SMTP_FROM}>`,
    to,
    subject: `New Form Submission: ${formName}`,
    html: `
      <h2>New Form Submission</h2>
      <p>You received a new submission for <strong>${formName}</strong></p>
      <pre>${JSON.stringify(submissionData, null, 2)}</pre>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Submission notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send notification:', error);
    return { success: false, error: error.message };
  }
};
```

### 2. Install Nodemailer

```bash
# On VPS
cd /var/www/forms-submission
npm install nodemailer @types/nodemailer
npm run build
```

### 3. Update Registration Route

Update `src/routes/auth.routes.ts` to send emails:

```typescript
import { sendVerificationEmail } from '../services/email.service';

// In the registration route, after creating user:
router.post('/register', async (req: Request, res: Response) => {
  // ... existing code ...

  // Send verification email
  console.log(`[${requestId}] 📧 Sending verification email to: ${user.email}`);
  const emailResult = await sendVerificationEmail(
    user.email,
    user.name,
    verificationToken
  );

  if (emailResult.success) {
    console.log(`[${requestId}] ✅ Verification email sent: ${emailResult.messageId}`);
  } else {
    console.log(`[${requestId}] ⚠️  Email sending failed: ${emailResult.message}`);
    // Still include token in response if email fails (fallback)
    (response as any).verificationToken = verificationToken;
  }

  // Don't include token if email was sent successfully
  if (emailResult.success) {
    // Remove token from response
    delete (response as any).verificationToken;
  }

  res.status(201).json(response);
});
```

---

## Testing Email Delivery

### 1. Test Script

Create `test-email.js` in project root:

```javascript
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.sendMail({
  from: `"Test" <${process.env.SMTP_FROM}>`,
  to: 'your-test-email@gmail.com',
  subject: 'Test Email',
  text: 'This is a test email from Form Builder!',
})
.then(info => console.log('✅ Email sent:', info.messageId))
.catch(error => console.error('❌ Error:', error));
```

Run test:
```bash
node test-email.js
```

### 2. Check Email Logs

```bash
# Check PM2 logs
pm2 logs forms-api --lines 50

# Look for:
# 📧 Verification email sent
# ✅ Email sent: <message-id>
```

---

## Production Deployment Checklist

### Before Going Live

- [ ] Email provider account created
- [ ] API key/password generated
- [ ] `.env` file updated with SMTP credentials
- [ ] `nodemailer` installed (`npm install nodemailer @types/nodemailer`)
- [ ] Backend rebuilt (`npm run build`)
- [ ] Backend restarted (`pm2 reload forms-api`)
- [ ] Test email sent successfully
- [ ] Check spam folder for test email
- [ ] Email template looks good

### Common Issues & Fixes

#### Issue: "Invalid login" (Gmail)
**Solution:** Use App Password, not regular password

#### Issue: Emails going to spam
**Solutions:**
- Use SPF/DKIM records (Mailgun/SendGrid provides these)
- Verify sender domain
- Build up sending reputation gradually

#### Issue: Connection timeout
**Solutions:**
- Check VPS firewall allows outbound SMTP (port 587)
- Try port 465 with `secure: true`
- Check if SMTP host is blocked

#### Issue: Rate limiting
**Solutions:**
- Gmail: 100/day limit
- SendGrid: 100/day free tier
- Mailgun: 5,000/month free tier
- Upgrade plan for higher volume

---

## DNS Records (Optional but Recommended)

If you have a domain, add these DNS records to improve deliverability:

### SPF Record
```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net -all
```

### DKIM (SendGrid/Mailgun provides this)
```
Type: TXT
Name: sendgrid._domainkey
Value: [provided by email provider]
```

---

## Environment Variables Reference

```bash
# Enable/disable email sending
SMTP_ENABLED=true

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net          # or smtp.gmail.com
SMTP_PORT=587                         # or 465 for SSL
SMTP_SECURE=false                      # true for port 465
SMTP_USER=apikey                       # or your-email@gmail.com
SMTP_PASS=SG.your-api-key-here        # or 16-char app password

# Email Addresses
SMTP_FROM=noreply@yourdomain.com       # From address
NOTIFICATION_EMAIL=admin@yourdomain.com # Bounce/notifications
```

---

## Next Steps

1. **Choose email provider** based on your needs
2. **Create account** and get credentials
3. **Update `.env` file** on VPS
4. **Install nodemailer**: `npm install nodemailer @types/nodemailer`
5. **Rebuild backend**: `npm run build`
6. **Restart service**: `pm2 reload forms-api`
7. **Test with new registration**

---

## Need Help?

Check logs:
```bash
pm2 logs forms-api --lines 100
```

Test email endpoint:
```bash
curl -X POST http://217.216.48.189:3001/api/auth/resend-verification \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to git
- Use environment-specific credentials (development vs production)
- Rotate API keys periodically
- Monitor email sending limits
- Set up SPF/DKIM for better deliverability

---

**Last Updated:** 2026-02-26
**VPS:** 217.216.48.189
**Application:** Multi-Tenant Form Submission Platform
