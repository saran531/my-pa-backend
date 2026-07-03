const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSettings,
  updateNotificationPrefs,
  updateThemePref,
} = require('../controllers/settingsController');

router.use(protect);

router.get('/', getSettings);
router.patch('/notifications', updateNotificationPrefs);
router.patch('/theme', updateThemePref);

module.exports = router;
