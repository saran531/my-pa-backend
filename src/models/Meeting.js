const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    dateTime: {
      type: Date,
      required: [true, 'Meeting date/time is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    // Granular reminder tracking
    reminderSentOnCreate: { type: Boolean, default: false },
    reminderSent30:       { type: Boolean, default: false },
    reminderSent15:       { type: Boolean, default: false },
    reminderSentStart:    { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['manual', 'voice'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

// Compound unique index: one user can't have two meetings at the exact same millisecond.
// This prevents duplicate creation when two POST requests arrive simultaneously.
meetingSchema.index({ user: 1, dateTime: 1 }, { unique: true });

module.exports = mongoose.model('Meeting', meetingSchema);
