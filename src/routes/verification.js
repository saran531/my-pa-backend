const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/verificationController');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

// POST /api/verification/send-otp  (requires login)
router.post(
  '/send-otp',
  protect,
  [body('email').isEmail().withMessage('Valid email required').normalizeEmail()],
  validate,
  sendOtp
);

// POST /api/verification/verify-otp  (requires login)
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
