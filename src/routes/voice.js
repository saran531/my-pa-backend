const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { parseTranscript } = require('../controllers/voiceController');

router.use(protect);

router.post('/parse', parseTranscript);

module.exports = router;
