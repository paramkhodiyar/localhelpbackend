const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    // save to DB
    await prisma.OTP.create({
      data: { email, otp, expiresAt },
    });

    // setup mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // send email
    try {
        const info = await transporter.sendMail({
          from: `"LocalHelp Support" <${process.env.MAIL_USER}>`,
          to: email,
          subject: "Your One-Time Password (OTP) for Login",
          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 480px;
              margin: auto;
              border: 1px solid #e0e0e0;
              border-radius: 10px;
              padding: 20px;
              background-color: #fafafa;
            ">
              <h2 style="color: #2d3748; text-align: center;">🔒 Verify Your Login</h2>
              <p style="font-size: 15px; color: #4a5568;">
                Hello <b>${email.split('@')[0]}</b>,<br><br>
                Use the following <b>One-Time Password (OTP)</b> to complete your login on <b>LocalHelp</b>.
              </p>
              <div style="
                background-color: #3182ce;
                color: white;
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 3px;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              ">
                ${otp}
              </div>
              <p style="font-size: 14px; color: #718096;">
                This OTP is valid for <b>5 minutes</b>. Please do not share it with anyone.<br><br>
                If you did not request this, please ignore this email or contact our support team immediately.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="font-size: 12px; color: #a0aec0; text-align: center;">
                © ${new Date().getFullYear()} LocalHelp. All rights reserved.<br>
                Need help? Contact us at <a href="mailto:${process.env.MAIL_USER}" style="color: #3182ce;">${process.env.MAIL_USER}</a>
              </p>
            </div>
          `,
        }, { timeout: 10000 }); // 10 seconds timeout
      
        console.log("✅ OTP email sent:", info.response);
        return res.status(200).json({ message: "OTP sent successfully" });
      } catch (error) {
        console.error("❌ Error sending OTP:", error.message);
        return res.status(500).json({ message: "Failed to send OTP. Try again later." });
      }
      
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending OTP' });
  }
};
exports.verifyOTP = async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      const record = await prisma.oTP.findFirst({
        where: { email, otp },
        orderBy: { createdAt: 'desc' },
      });
  
      if (!record) return res.status(400).json({ error: 'Invalid OTP' });
      if (new Date() > record.expiresAt)
        return res.status(400).json({ error: 'OTP expired' });
  
      // (Optional) Delete OTP after verification
      await prisma.OTP.delete({ where: { id: record.id } });
  
      // Generate JWT for user
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.status(200).json({ message: 'OTP verified', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error verifying OTP' });
    }
  };
  