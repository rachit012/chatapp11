import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// UserList Component
const UserList = ({ users, selectedUser, onSelectUser, onLogout, currentUser }) => (
  <div className="w-1/4 bg-white border-r border-gray-200 p-4 overflow-y-auto">
    <div className="mb-6 p-3 bg-gray-100 rounded-lg">
      <p className="font-semibold">Logged in as:</p>
      <p className="text-blue-600 truncate">{currentUser?.username}</p>
    </div>
    <h2 className="text-xl font-semibold mb-4">Users</h2>
    {users.map(user => (
      <div
        key={user._id}
        onClick={() => onSelectUser(user)}
        className={`p-3 rounded-lg mb-2 cursor-pointer flex items-center ${
          selectedUser?._id === user._id
            ? 'bg-blue-100 text-blue-800'
            : 'hover:bg-gray-100'
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
        <span className="truncate">{user.username}</span>
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
  <div className="p-4 border-b border-gray-200 bg-white flex items-center">
    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
    <h2 className="text-xl font-semibold">{username}</h2>
  </div>
);

// MessageList Component
const MessageList = ({ messages, currentUserId, messagesEndRef }) => {
  // Add loading state if currentUserId is not available
  if (!currentUserId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map(msg => {
        // Safely get sender ID whether it's an object or direct ID
        const senderId = msg.sender?._id || msg.sender;
        
        // Now safe to compare since we checked currentUserId exists
        const isSender = senderId?.toString() === currentUserId.toString();
        return (
          <div 
            key={msg._id} 
            className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                isSender
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="text-sm break-words">{msg.text}</div>
              <div
                className={`text-xs mt-1 ${
                  isSender ? 'text-blue-200' : 'text-gray-500'
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

// MessageInput Component
const MessageInput = ({ text, onChange, onSend }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={onChange}
          onKeyDown={e => e.key === 'Enter' && onSend()}
        />
        <button
          onClick={onSend}
          className={`px-6 py-3 rounded-r-lg transition ${
            text.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

// Main Chat Component
const Chat = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);

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
    const userData = res.data.user;
    if (userData.id && !userData._id) {
      userData._id = userData.id;
    }
    setCurrentUser(userData);
  } catch (err) {
    console.error('Error fetching user:', err.response?.data || err.message);
    localStorage.removeItem("accessToken");
    navigate('/login');
  } finally {
    setIsUserLoading(false);
  }
};
    if (token) fetchCurrentUser();
  }, [token, navigate]);

  // Fetch users excluding self
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

  // Socket connection and handlers
  useEffect(() => {
    if (!token || !currentUser) return;

    const socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socketRef.current = socket;

    const handleNewMessage = (message) => {
      if (message.sender === selectedUser?._id || message.receiver === selectedUser?._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          return exists ? prev : [...prev, message];
        });
      }
    };

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join', { userId: currentUser._id });
    });

    socket.on('newMessage', handleNewMessage);
    socket.on('connect_error', (err) => console.error('Connection error:', err));

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.disconnect();
    };
  }, [token, currentUser, selectedUser]);

  // Fetch messages with selected user
  useEffect(() => {
    const fetchMessages = async () => {
  if (!selectedUser || !currentUser) return;

  setIsLoading(true);
  try {
    const res = await axios.get(`http://localhost:5000/api/messages/${selectedUser._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error('Error fetching messages:', {
      error: err.response?.data || err.message,
      status: err.response?.status,
    });
  } finally {
    setIsLoading(false);
  }
};

    fetchMessages();
  }, [selectedUser, currentUser, token]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!text.trim() || !selectedUser || !currentUser || isLoading) return;

    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      sender: currentUser._id,
      receiver: selectedUser._id,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setText('');

    try {
      socketRef.current?.emit('sendMessage', {
        receiver: selectedUser._id,
        text,
      });

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
        prev.map(msg => (msg._id === tempId ? res.data : msg))
      );
    } catch (err) {
      console.error('Message send error:', err);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    socketRef.current?.disconnect();
    navigate('/login');
  };

  return (
  <div className="flex h-screen bg-gray-50">
    {/* Only render UserList if we have currentUser */}
    {currentUser && (
      <UserList
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    )}
    
    <div className="flex-1 flex flex-col">
      {isUserLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading user data...</p>
        </div>
      ) : selectedUser ? (
        <>
          <ChatHeader username={selectedUser.username} />
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : (
            <MessageList
              messages={messages}
              currentUserId={currentUser?._id} // Now safe to access directly
              messagesEndRef={messagesEndRef}
            />
          )}
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
