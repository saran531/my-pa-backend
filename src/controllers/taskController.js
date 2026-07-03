const Task = require('../models/Task');

// ─── GET /api/tasks ──────────────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ tasks });
  } catch (err) {
    console.error('getTasks error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── POST /api/tasks ─────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { title, description, category, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'personal',
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    return res.status(201).json({ task });
  } catch (err) {
    console.error('createTask error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── PATCH /api/tasks/:id ────────────────────────────────────────────────────
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const { title, description, category, priority, dueDate, completed, completedAt } = req.body;

    if (title       !== undefined) task.title       = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (category    !== undefined) task.category    = category;
    if (priority    !== undefined) task.priority    = priority;
    if (dueDate     !== undefined) task.dueDate     = dueDate ? new Date(dueDate) : null;

    if (completed !== undefined) {
      task.completed   = completed;
      task.completedAt = completed
        ? (completedAt ? new Date(completedAt) : new Date())
        : null;
    }

    await task.save();
    return res.json({ task });
  } catch (err) {
    console.error('updateTask error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── DELETE /api/tasks/:id ───────────────────────────────────────────────────
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('deleteTask error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
