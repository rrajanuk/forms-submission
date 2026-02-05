import nodemailer from 'nodemailer';
import axios from 'axios';
import { Submission } from '../types';

class NotificationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(task: () => Promise<void>): Promise<void> {
    this.queue.push(task);
    if (!this.processing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Notification task failed:', error);
          // Retry logic could be added here
        }
      }
    }
    this.processing = false;
  }
}

const notificationQueue = new NotificationQueue();

export const sendEmailNotification = async (submission: Submission): Promise<void> => {
  if (process.env.SMTP_ENABLED !== 'true') {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailContent = `
    New Form Submission Received
    
    ID: ${submission.id}
    Name: ${submission.name}
    Email: ${submission.email}
    Phone: ${submission.phone || 'N/A'}
    Industry: ${submission.industry}
    Message: ${submission.message}
    
    Page URL: ${submission.page_url || 'N/A'}
    UTM: ${submission.utm || 'N/A'}
    IP: ${submission.ip || 'N/A'}
    User Agent: ${submission.user_agent || 'N/A'}
    
    Submitted at: ${new Date(submission.created_at).toISOString()}
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `New Form Submission from ${submission.name}`,
    text: emailContent,
  });
};

export const sendWebhookNotification = async (submission: Submission): Promise<void> => {
  if (process.env.WEBHOOK_ENABLED !== 'true' || !process.env.WEBHOOK_URL) {
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.WEBHOOK_SECRET) {
    headers['X-Webhook-Secret'] = process.env.WEBHOOK_SECRET;
  }

  await axios.post(
    process.env.WEBHOOK_URL,
    {
      event: 'submission.created',
      data: submission,
    },
    {
      headers,
      timeout: 10000,
    }
  );
};

export const notifySubmission = async (submission: Submission): Promise<void> => {
  // Add notification tasks to queue for async processing
  notificationQueue.add(async () => {
    try {
      await sendEmailNotification(submission);
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  });

  notificationQueue.add(async () => {
    try {
      await sendWebhookNotification(submission);
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  });
};
