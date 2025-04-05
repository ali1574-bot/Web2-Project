const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "your-email@example.com", // Your email address
    pass: "your-email-password" // Your email password
  }
});

/**
 * Sends an email notification.
 * 
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} body - The body of the email.
 */
async function sendEmail(to, subject, body) {
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
}

module.exports = {
  sendEmail
};