const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/authMiddleware');

// Get all messages between current user and another user
// Backend API routes (Node.js/Express example)

// Get messages between two users
router.get('/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      text
    });
    
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;