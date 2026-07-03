const User = require('../models/User');

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+notificationPrefs');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      notificationPrefs: user.notificationPrefs,
      themePreference: user.themePreference,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateNotificationPrefs = async (req, res) => {
  try {
    const allowed = ['emailReminders', 'pushReminders', 'reminderAt30', 'reminderAt15', 'reminderAtStart', 'reminderOnCreate'];
    const prefs = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') prefs[`notificationPrefs.${key}`] = req.body[key];
    }
    if (Object.keys(prefs).length === 0) {
      return res.status(400).json({ message: 'No valid preferences provided.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: prefs },
      { new: true }
    );
    return res.json({ notificationPrefs: user.notificationPrefs });
  } catch (err) {
    console.error('updateNotificationPrefs error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateThemePref = async (req, res) => {
  try {
    const { themePreference } = req.body;
    if (!['light', 'dark', 'system'].includes(themePreference)) {
      return res.status(400).json({ message: 'Invalid theme preference.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { themePreference },
      { new: true }
    );
    return res.json({ themePreference: user.themePreference });
  } catch (err) {
    console.error('updateThemePref error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
