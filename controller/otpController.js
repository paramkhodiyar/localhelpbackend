const SibApiV3Sdk = require('sib-api-v3-sdk');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// Initialize Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_KEY;

const transEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// ==========================
// SEND OTP
// ==========================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log("Generated OTP:", otp, "for:", email);

    // Store OTP in DB
    await prisma.otp.create({ data: { email, otp, expiresAt } });

    // Send OTP via Brevo
    const sendSmtpEmail = {
      sender: { name: 'LocalHelp', email: 'youremail@yourdomain.com' }, // must be verified sender
      to: [{ email }],
      subject: 'Your One-Time Password (OTP) for LocalHelp Login',
      htmlContent: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 480px;
          margin: auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 20px;
          background-color: #fafafa;
        ">
          <h2 style="color: #2d3748; text-align: center;">🔐 Verify Your Login</h2>
          <p style="font-size: 15px; color: #4a5568;">
            Hello <b>${email.split('@')[0]}</b>,<br><br>
            Use the following <b>One-Time Password (OTP)</b> to complete your login to <b>LocalHelp</b>.
          </p>
          <div style="
            background-color: #3182ce;
            color: white;
            text-align: center;
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 3px;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          ">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #718096;">
            This OTP is valid for <b>5 minutes</b>. Please do not share it with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #a0aec0; text-align: center;">
            © ${new Date().getFullYear()} LocalHelp. All rights reserved.
          </p>
        </div>
      `,
    };

    await transEmailApi.sendTransacEmail(sendSmtpEmail);

    console.log("✅ OTP sent via Brevo to:", email);
    res.status(200).json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    res.status(500).json({ error: 'Error sending OTP' });
  }
};


// ==========================
// VERIFY OTP
// ==========================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: 'Email and OTP are required' });

    const record = await prisma.otp.findFirst({
      where: { email, otp },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > record.expiresAt)
      return res.status(400).json({ error: 'OTP expired' });

    // Delete used OTP
    await prisma.otp.delete({ where: { id: record.id } });

    // Generate JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'OTP verified successfully', token });
  } catch (error) {
    console.error('❌ Verify OTP error:', error.message);
    res.status(500).json({ error: 'Error verifying OTP' });
  }
};
