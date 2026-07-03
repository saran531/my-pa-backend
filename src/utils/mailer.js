const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a 6-digit OTP email for verification or password reset.
 * @param {string} to  Recipient email
 * @param {string} otp  6-digit code
 * @param {'verify'|'reset'} type
 */
const sendOtpEmail = async (to, otp, type = 'verify') => {
  const subject =
    type === 'reset'
      ? 'MY PA — Password Reset OTP'
      : 'MY PA — Verify Your Email';

  const heading =
    type === 'reset' ? 'Reset Your Password' : 'Verify Your Email Address';

  const body = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#6366f1;">${heading}</h2>
      <p>Use the OTP below. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#f3f4f6;border-radius:8px;margin:24px 0;">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:13px;">If you didn't request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"MY PA" <${process.env.REMINDER_FROM_EMAIL}>`,
    to,
    subject,
    html: body,
  });
};

/**
 * Send a meeting reminder email.
 * @param {object} opts
 * @param {string} opts.to          Recipient email
 * @param {string} opts.userName    User's full name
 * @param {string} opts.title       Meeting title
 * @param {Date}   opts.meetingTime Meeting date/time
 * @param {string} opts.type        Reminder type: onCreate | at30 | at15 | atStart
 */
const sendMeetingReminderEmail = async ({ to, userName, title, meetingTime, type }) => {
  const labels = {
    onCreate: 'Meeting Created',
    at30:     '30 Minutes Until Meeting',
    at15:     '15 Minutes Until Meeting',
    atStart:  'Meeting Starting Now',
  };
  const label = labels[type] || 'Meeting Reminder';

  const timeStr = meetingTime.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  const body = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#6366f1;">${label}</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <div style="padding:20px;background:#f3f4f6;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;">${title}</p>
        <p style="margin:0;color:#6b7280;">${timeStr}</p>
      </div>
      ${type === 'atStart' ? '<p style="color:#059669;font-weight:600;">This meeting is starting now!</p>' : ''}
      ${type === 'onCreate' ? '<p style="color:#6b7280;font-size:13px;">Reminders will also be sent 30 min, 15 min, and at the start time.</p>' : ''}
      <p style="color:#6b7280;font-size:13px;">— MY PA</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"MY PA" <${process.env.REMINDER_FROM_EMAIL}>`,
    to,
    subject: `[MY PA] ${label}: ${title}`,
    html: body,
  });
};

module.exports = { sendOtpEmail, sendMeetingReminderEmail };
