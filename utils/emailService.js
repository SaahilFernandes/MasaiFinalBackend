const nodemailer = require('nodemailer');
const config = require('../config');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });

  const mailOptions = {
    from: config.emailFrom,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    // In a real app, you might want to use a more robust error handling/logging service
  }
};

module.exports = sendEmail;