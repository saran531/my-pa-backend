const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/verificationController');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

// Dedicated, stricter limiter for OTP requests. The shared authLimiter in
// app.js only covers /api/auth, so this route previously had no rate
// limiting at all — anyone could OTP-bomb an arbitrary email address with
// unlimited requests (Issue 1: "prevent OTP spam").
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

// POST /api/verification/send-otp  (no auth required — used for signup OTP resend + settings)
router.post(
  '/send-otp',
  otpRequestLimiter,
  [body('email').isEmail().withMessage('Valid email required').normalizeEmail()],
  validate,
  sendOtp
);

// POST /api/verification/verify-otp  (requires login — for Settings verify email flow)
router.post(
  '/verify-otp',
  protect,
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  verifyOtp
);

module.exports = router;
