const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

// All task routes require a valid access token
router.use(protect);

router.get('/',    getTasks);
router.post('/',   createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
