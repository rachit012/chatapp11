require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Socket.IO setup
const io = socketio(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

// Socket auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token provided'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  });
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  socket.join(socket.userId);

  socket.on('sendMessage', async ({ receiver, text }) => {
    try {
      const message = new Message({
        sender: socket.userId,
        receiver: receiver,
        text: text
      });
  
      const savedMessage = await message.save();
  
      // Only emit to the receiver, not back to sender
      io.to(receiver).emit('newMessage', savedMessage);
      
    } catch (err) {
      console.error('Message error:', err.message);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));