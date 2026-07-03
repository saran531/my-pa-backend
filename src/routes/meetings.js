const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/meetingController');

// All meeting routes require a valid access token
router.use(protect);

router.get('/',    getMeetings);
router.post('/',   createMeeting);
router.patch('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

module.exports = router;
