const sendOTP = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });
    // TODO: integrate real email/SMS provider
    return res.status(200).json({ message: "OTP sent" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });
    // TODO: verify against stored OTP
    return res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

module.exports = { sendOTP, verifyOTP };


