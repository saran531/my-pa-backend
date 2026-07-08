const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    refreshTokens: {
      type: [String],
      select: false,
    },
    // OTP for email verification / password reset
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    // Timestamp of the last OTP send, used to enforce a resend cooldown so a
    // user (or an attacker) cannot spam-request OTPs for the same account.
    otpLastSentAt: {
      type: Date,
      select: false,
    },
    // Notification & reminder preferences
    notificationPrefs: {
      emailReminders: { type: Boolean, default: true },
      pushReminders:  { type: Boolean, default: true },
      reminderAt30:   { type: Boolean, default: true },
      reminderAt15:   { type: Boolean, default: true },
      reminderAtStart:{ type: Boolean, default: true },
      reminderOnCreate:{ type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with stored hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Public-safe user object (no password, no tokens, no OTP)
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    emailVerified: this.emailVerified,
    themePreference: this.themePreference,
    notificationPrefs: this.notificationPrefs,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
