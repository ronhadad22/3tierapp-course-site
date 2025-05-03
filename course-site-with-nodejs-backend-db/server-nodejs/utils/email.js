const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5001'}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@yourapp.com',
    to,
    subject: 'Verify your email',
    html: `<p>Thank you for registering! Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
  });
}


module.exports = { sendVerificationEmail };
