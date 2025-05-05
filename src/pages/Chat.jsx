import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// UserList Component
const UserList = ({ users, selectedUser, onSelectUser, onLogout }) => (
  <div className="w-1/4 bg-white border-r border-gray-200 p-4 overflow-y-auto">
    <h2 className="text-xl font-semibold mb-4">Users</h2>
    {users.map(user => (
      <div
        key={user._id}
        onClick={() => onSelectUser(user)}
        className={`p-3 rounded-lg mb-2 cursor-pointer ${
          selectedUser?._id === user._id
            ? 'bg-blue-100 text-blue-800'
            : 'hover:bg-gray-100'
        }`}
      >
        {user.username}
      </div>
    ))}
    <button
      onClick={onLogout}
      className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
    >
      Logout
    </button>
  </div>
);

// ChatHeader Component
const ChatHeader = ({ username }) => (
  <div className="p-4 border-b border-gray-200 bg-white">
    <h2 className="text-xl font-semibold">{username}</h2>
  </div>
);

// MessageList Component
const MessageList = ({ messages, currentUserId, messagesEndRef }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-2">
    {messages.map(msg => (
      <div
        key={msg._id}
        className={`flex ${msg.sender === currentUserId ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            msg.sender === currentUserId
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          {msg.text}
          <div className="text-xs mt-1 opacity-70">
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
);

// MessageInput Component
const MessageInput = ({ text, onChange, onSend }) => (
  <div className="p-4 border-t border-gray-200 bg-white">
    <div className="flex">
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={text}
        onChange={onChange}
        onKeyDown={e => e.key === 'Enter' && onSend()}
      />
      <button
        onClick={onSend}
        className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 transition"
        disabled={!text.trim()}
      >
        Send
      </button>
    </div>
  </div>
);

// Main Chat Component
const Chat = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  // Redirect if no token
  useEffect(() => {
    if (!token) navigate('/login');
  }, [navigate, token]);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch {
        localStorage.removeItem("accessToken");
        navigate('/login');
      }
    };
    if (token) fetchCurrentUser();
  }, [token, navigate]);

  // Fetch user list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data.filter(user => user._id !== currentUser?._id));
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    if (token && currentUser) fetchUsers();
  }, [token, currentUser]);

  // Setup socket
  useEffect(() => {
    if (!token || !currentUser) return;

    const socket = io('http://localhost:5000', {
      auth: { token },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('newMessage', (message) => {
      if (
        (message.sender === selectedUser?._id && message.receiver === currentUser._id) ||
        (message.sender === currentUser._id && message.receiver === selectedUser?._id)
      ) {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, currentUser, selectedUser]);

  // Fetch messages when selecting user
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/messages/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    if (selectedUser && currentUser) fetchMessages();
  }, [selectedUser, currentUser, token]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!text.trim() || !selectedUser || !currentUser) return;

    const newMessage = {
      sender: currentUser._id,
      receiver: selectedUser._id,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, { ...newMessage, _id: Date.now().toString() }]);
    setText('');

    // Emit via socket
    socketRef.current?.emit('sendMessage', newMessage);

    // Persist via API
    try {
      const res = await axios.post(
        'http://localhost:5000/api/messages',
        {
          receiverId: selectedUser._id,
          text: newMessage.text,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(prev =>
        prev.map(msg => (msg._id === newMessage._id ? res.data : msg))
      );
    } catch (err) {
      console.error('Message send error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken"); // was accessToken
    localStorage.removeItem("user");
    socketRef.current?.disconnect();
    navigate('/login');
  };
  

  return (
    <div className="flex h-screen bg-gray-50">
      <UserList
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <ChatHeader username={selectedUser.username} />
            <MessageList
              messages={messages}
              currentUserId={currentUser?._id}
              messagesEndRef={messagesEndRef}
            />
            <MessageInput
              text={text}
              onChange={e => setText(e.target.value)}
              onSend={handleSendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-lg">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
