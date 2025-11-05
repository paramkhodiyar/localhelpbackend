const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('OTP functionality will not work without these variables');
}

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check for recent OTP (rate limiting - within last 60 seconds)
    const recentOTP = await prisma.otp.findFirst({
      where: {
        email: email,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000) // Last 60 seconds
        }
      }
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 60 seconds before requesting a new OTP'
      });
    }

    // Delete any existing OTPs for this email
    await prisma.otp.deleteMany({
      where: { email: email }
    });

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.otp.create({
      data: {
        email,
        otp,
        expiresAt
      }
    });

    // Email options
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'LocalHelp',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: 'Your OTP Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verification Code</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
              <p style="font-size: 16px; margin-bottom: 30px;">Your verification code is:</p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <h2 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${otp}</h2>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              <p style="font-size: 14px; color: #666; margin-top: 10px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} LocalHelp. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Log OTP only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP sent to ${email}: ${otp}`);
    } else {
      console.log(`OTP sent to ${email}`);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600 // seconds
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Find the most recent OTP for this email
    const storedOTP = await prisma.otp.findFirst({
      where: { email: email },
      orderBy: { createdAt: 'desc' }
    });

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.'
      });
    }

    // Check if OTP has expired
    if (new Date() > storedOTP.expiresAt) {
      // Delete expired OTP
      await prisma.otp.delete({
        where: { id: storedOTP.id }
      });
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (storedOTP.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP verified successfully - delete it
    await prisma.otp.delete({
      where: { id: storedOTP.id }
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      email
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cleanup expired OTPs (run periodically)
const cleanupExpiredOTPs = async () => {
  try {
    const result = await prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date() // Less than current time
        }
      }
    });
    
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired OTP(s)`);
    }
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

// Cleanup on startup
cleanupExpiredOTPs();

module.exports = {
  sendOTP,
  verifyOTP
};