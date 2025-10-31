const express = require("express");
const { signup, login } = require("../controller/authController.js");
const { sendOTP, verifyOTP } = require('../controller/otpController.js');

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Health check ok' });
});

module.exports = router;
