const crypto = require('crypto');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/mailer');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP string */
const generateOtp = () =>
  crypto.randomInt(100000, 999999).toString();

/** Issue a fresh access + refresh token pair and persist the refresh token */
const issueTokens = async (user) => {
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());

  // Load existing refresh tokens (field is select:false)
  const loaded = await User.findById(user._id).select('+refreshTokens');
  const existing = loaded?.refreshTokens ?? [];

  // Keep max 5 active refresh tokens (oldest dropped first)
  const updated = [...existing, refreshToken].slice(-5);
  await User.findByIdAndUpdate(user._id, { refreshTokens: updated });

  return { accessToken, refreshToken };
};

// ─── POST /auth/signup ───────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({ fullName, email, password });

    // Generate and save OTP
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send OTP email — if it fails, undo the account creation
    try {
      await sendOtpEmail({ to: email, otp, type: 'verify', userName: fullName });
    } catch (emailErr) {
      await User.findByIdAndDelete(user._id);
      console.error('signup email error:', emailErr);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    // Do NOT issue tokens — user must verify OTP first
    return res.status(201).json({
      message: 'Account created. Please check your email for the verification code.',
      email: email.toLowerCase(),
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /auth/login ────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = await issueTokens(user);

    return res.json({
      message: 'Logged in successfully.',
      accessToken,
      refreshToken,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required.' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token not recognised.' });
    }

    // Rotate: remove used token, issue a new pair
    const updatedTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccess = signAccessToken(user._id.toString());
    const newRefresh = signRefreshToken(user._id.toString());
    updatedTokens.push(newRefresh);
    await User.findByIdAndUpdate(user._id, { refreshTokens: updatedTokens.slice(-5) });

    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /auth/verify-signup-otp ────────────────────────────────────────────
exports.verifySignupOtp = async (req, res) => {
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

    // Issue tokens now that the user is verified
    const { accessToken, refreshToken } = await issueTokens(user);

    return res.json({
      verified: true,
      message: 'Email verified successfully.',
      accessToken,
      refreshToken,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error('verifySignupOtp error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /auth/logout ───────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      // Remove just this refresh token
      await User.updateOne(
        { refreshTokens: refreshToken },
        { $pull: { refreshTokens: refreshToken } }
      );
    }
    return res.json({ message: 'Logged out.' });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── POST /auth/forgot-password ─────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail({ to: email, otp, type: 'reset', userName: user.fullName });

    return res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── POST /auth/reset-password ──────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiresAt');
    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    // Invalidate all refresh tokens on password reset
    user.refreshTokens = [];
    await user.save();

    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
