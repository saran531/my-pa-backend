const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ─── POST /verification/send-otp ────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(email, otp, 'verify');

    return res.json({ message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /verification/verify-otp ──────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiresAt');
    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    return res.json({ verified: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
