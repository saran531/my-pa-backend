const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ─── POST /verification/send-otp ────────────────────────────────────────────
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otpLastSentAt');
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Resend cooldown: blocks rapid-fire OTP spam for the same account even
    // if requests come from different IPs (the route-level rate limiter only
    // keys off IP + email pair).
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000
      );
      return res.status(429).json({ message: `Please wait ${waitSec}s before requesting another OTP.` });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail({ to: email, otp, type: 'verify', userName: user.fullName });

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
