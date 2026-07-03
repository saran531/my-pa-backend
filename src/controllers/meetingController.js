const Meeting = require('../models/Meeting');

// ─── GET /api/meetings ───────────────────────────────────────────────────────
exports.getMeetings = async (req, res) => {
  try {
    const filter = { user: req.user._id };

    // Optional date-range filters: ?from=ISO&to=ISO
    if (req.query.from || req.query.to) {
      filter.dateTime = {};
      if (req.query.from) filter.dateTime.$gte = new Date(req.query.from);
      if (req.query.to)   filter.dateTime.$lte = new Date(req.query.to);
    }

    const meetings = await Meeting.find(filter).sort({ dateTime: 1 });
    return res.json({ meetings });
  } catch (err) {
    console.error('getMeetings error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── POST /api/meetings ──────────────────────────────────────────────────────
exports.createMeeting = async (req, res) => {
  try {
    const { title, dateTime, description, source } = req.body;

    if (!title || !dateTime) {
      return res.status(400).json({ message: 'title and dateTime are required.' });
    }

    const dt = new Date(dateTime);
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ message: 'Invalid dateTime value.' });
    }

    // Conflict check: same user, same minute window (±1 min)
    const windowStart = new Date(dt.getTime() - 60 * 1000);
    const windowEnd   = new Date(dt.getTime() + 60 * 1000);
    const conflict = await Meeting.findOne({
      user: req.user._id,
      dateTime: { $gte: windowStart, $lte: windowEnd },
    });
    if (conflict) {
      return res.status(409).json({ message: 'You already have a meeting scheduled at this time.' });
    }

    const meeting = await Meeting.create({
      user: req.user._id,
      title: title.trim(),
      dateTime: dt,
      description: (description || '').trim(),
      source: source || 'manual',
    });

    // Fire-and-forget: schedule creation reminder email in next tick (never blocks the response)
    setImmediate(() => {
      require('../utils/reminderScheduler').sendCreationReminder(meeting._id).catch(err => {
        console.error('[Meeting] sendCreationReminder failed:', err.message);
      });
    });

    return res.status(201).json({ meeting });
  } catch (err) {
    console.error('createMeeting error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── PATCH /api/meetings/:id ─────────────────────────────────────────────────
exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }

    const { title, dateTime, description, completed } = req.body;

    if (dateTime !== undefined) {
      const dt = new Date(dateTime);
      if (isNaN(dt.getTime())) {
        return res.status(400).json({ message: 'Invalid dateTime value.' });
      }

      // Conflict check (exclude this meeting itself)
      const windowStart = new Date(dt.getTime() - 60 * 1000);
      const windowEnd   = new Date(dt.getTime() + 60 * 1000);
      const conflict = await Meeting.findOne({
        user: req.user._id,
        dateTime: { $gte: windowStart, $lte: windowEnd },
        _id: { $ne: meeting._id },
      });
      if (conflict) {
        return res.status(409).json({ message: 'You already have a meeting scheduled at this time.' });
      }
      meeting.dateTime = dt;
    }

    if (title       !== undefined) meeting.title       = title.trim();
    if (description !== undefined) meeting.description = description.trim();
    if (completed   !== undefined) meeting.completed   = completed;

    await meeting.save();
    return res.json({ meeting });
  } catch (err) {
    console.error('updateMeeting error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── DELETE /api/meetings/:id ────────────────────────────────────────────────
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }
    return res.json({ message: 'Meeting deleted.' });
  } catch (err) {
    console.error('deleteMeeting error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
