'use strict';
/**
 * Reminder Scheduler
 * Polls MongoDB every minute and fires email reminders for upcoming meetings.
 * Reminder types:
 *   • onCreate  — sent immediately when a meeting is created
 *   • 30 min    — 30 minutes before start
 *   • 15 min    — 15 minutes before start
 *   • at start  — at the exact start time
 */

const Meeting = require('../models/Meeting');
const User    = require('../models/User');
const { sendMeetingReminderEmail } = require('./mailer');

// How often the scheduler ticks (ms)
const TICK_MS = 60 * 1000; // every 1 minute

let _timer = null;

/**
 * Send one reminder email if the user has that reminder type enabled and it
 * hasn't been sent yet.
 */
async function _sendIfNeeded(meeting, user, type) {
  const prefs = user.notificationPrefs || {};
  const flagMap = {
    onCreate: { pref: 'reminderOnCreate', flag: 'reminderSentOnCreate' },
    at30:     { pref: 'reminderAt30',     flag: 'reminderSent30'       },
    at15:     { pref: 'reminderAt15',     flag: 'reminderSent15'       },
    atStart:  { pref: 'reminderAtStart',  flag: 'reminderSentStart'    },
  };

  const { pref, flag } = flagMap[type];

  // Skip if user disabled this type or email reminders globally
  if (prefs.emailReminders === false) return;
  if (prefs[pref] === false) return;
  // Skip if already sent
  if (meeting[flag]) return;

  try {
    await sendMeetingReminderEmail({
      to:          user.email,
      userName:    user.fullName,
      title:       meeting.title,
      meetingTime: meeting.dateTime,
      type,
    });
    await Meeting.findByIdAndUpdate(meeting._id, {
      [flag]: true,
      // Once any reminder is sent, mark the top-level flag too
      reminderSent: true,
    });
    console.log(`[Reminder] ${type} → ${user.email} for "${meeting.title}"`);
  } catch (err) {
    console.error(`[Reminder] Failed to send ${type} for meeting ${meeting._id}:`, err.message);
  }
}

/**
 * Main tick — runs every minute.
 * Finds all upcoming uncompleted meetings and dispatches the right reminders.
 */
async function _tick() {
  try {
    const now  = new Date();
    const soon = new Date(now.getTime() + 31 * 60 * 1000); // next 31 minutes

    // All future (or just-started) meetings that are not completed
    const meetings = await Meeting.find({
      completed: false,
      dateTime: { $lte: soon, $gte: new Date(now.getTime() - 2 * 60 * 1000) },
    }).lean();

    for (const meeting of meetings) {
      const user = await User.findById(meeting.user).lean();
      if (!user) continue;

      const msUntil = meeting.dateTime.getTime() - now.getTime();

      // At-start: within ±1 minute of start time
      if (Math.abs(msUntil) <= 60 * 1000) {
        await _sendIfNeeded(meeting, user, 'atStart');
      }
      // 15 min: between 14 and 16 minutes before
      if (msUntil >= 14 * 60 * 1000 && msUntil <= 16 * 60 * 1000) {
        await _sendIfNeeded(meeting, user, 'at15');
      }
      // 30 min: between 29 and 31 minutes before
      if (msUntil >= 29 * 60 * 1000 && msUntil <= 31 * 60 * 1000) {
        await _sendIfNeeded(meeting, user, 'at30');
      }
    }
  } catch (err) {
    console.error('[Reminder] Tick error:', err.message);
  }
}

/**
 * Send the "meeting created" confirmation email immediately.
 * Called by meetingController right after saving a new meeting.
 */
async function sendCreationReminder(meetingId) {
  try {
    const meeting = await Meeting.findById(meetingId).lean();
    if (!meeting) return;
    const user = await User.findById(meeting.user).lean();
    if (!user) return;
    await _sendIfNeeded(meeting, user, 'onCreate');
  } catch (err) {
    console.error('[Reminder] sendCreationReminder error:', err.message);
  }
}

/** Start the scheduler. Safe to call multiple times (no-op if already running). */
function start() {
  if (_timer) return;
  _timer = setInterval(_tick, TICK_MS);
  console.log('[Reminder] Scheduler started (tick every 1 min)');
}

/** Stop the scheduler (useful in tests). */
function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { start, stop, sendCreationReminder };
