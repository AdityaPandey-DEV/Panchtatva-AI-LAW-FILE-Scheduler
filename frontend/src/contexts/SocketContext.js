/**
 * Socket Context
 * 
 * Provides real-time communication capabilities using Socket.IO
 * for messaging, notifications, and live updates.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated() && user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        
        // Join user's room
        newSocket.emit('join', user._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      // Message event handlers
      newSocket.on('receive_message', (messageData) => {
        // Handle incoming message
        handleIncomingMessage(messageData);
      });

      newSocket.on('user_typing', (data) => {
        // Handle typing indicator
        handleTypingIndicator(data, true);
      });

      newSocket.on('user_stop_typing', (data) => {
        // Handle stop typing
        handleTypingIndicator(data, false);
      });

      // Online users updates
      newSocket.on('users_online', (users) => {
        setOnlineUsers(new Set(users));
      });

      newSocket.on('user_online', (userId) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      newSocket.on('user_offline', (userId) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Case updates
      newSocket.on('case_updated', (caseData) => {
        handleCaseUpdate(caseData);
      });

      // System notifications
      newSocket.on('system_notification', (notification) => {
        handleSystemNotification(notification);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user, isAuthenticated]);

  const handleIncomingMessage = (messageData) => {
    // Show notification if not on messages page
    if (!window.location.pathname.includes('/messages')) {
      toast.success(`New message from ${messageData.sender.name}`, {
        duration: 4000,
        onClick: () => {
          window.location.href = `/messages?chat=${messageData.sender._id}`;
        }
      });
    }

    // Dispatch custom event for message components
    window.dispatchEvent(new CustomEvent('newMessage', {
      detail: messageData
    }));
  };

  const handleTypingIndicator = (data, isTyping) => {
    // Dispatch custom event for typing indicators
    window.dispatchEvent(new CustomEvent('typingIndicator', {
      detail: { ...data, isTyping }
    }));
  };

  const handleCaseUpdate = (caseData) => {
    // Show notification for case updates
    toast.success(`Case ${caseData.caseNumber} has been updated`, {
      duration: 4000,
      onClick: () => {
        window.location.href = `/cases/${caseData._id}`;
      }
    });

    // Dispatch custom event for case components
    window.dispatchEvent(new CustomEvent('caseUpdated', {
      detail: caseData
    }));
  };

  const handleSystemNotification = (notification) => {
    // Show system notifications
    const toastType = notification.type || 'info';
    const message = notification.message || 'System notification';

    switch (toastType) {
      case 'success':
        toast.success(message);
        break;
      case 'warning':
        toast(message, { icon: '⚠️' });
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message);
    }
  };

  // Socket methods
  const sendMessage = (messageData) => {
    if (socket && connected) {
      socket.emit('send_message', messageData);
      return true;
    }
    return false;
  };

  const startTyping = (recipientId) => {
    if (socket && connected) {
      socket.emit('typing', {
        sender: user._id,
        recipient: recipientId,
        senderName: user.name
      });
    }
  };

  const stopTyping = (recipientId) => {
    if (socket && connected) {
      socket.emit('stop_typing', {
        sender: user._id,
        recipient: recipientId
      });
    }
  };

  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('join_room', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('leave_room', roomId);
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getOnlineUsersCount = () => {
    return onlineUsers.size;
  };

  const emitCustomEvent = (eventName, data) => {
    if (socket && connected) {
      socket.emit(eventName, data);
    }
  };

  const onCustomEvent = (eventName, callback) => {
    if (socket) {
      socket.on(eventName, callback);
      
      // Return cleanup function
      return () => {
        socket.off(eventName, callback);
      };
    }
  };

  const value = {
    // State
    socket,
    connected,
    onlineUsers,
    
    // Methods
    sendMessage,
    startTyping,
    stopTyping,
    joinRoom,
    leaveRoom,
    isUserOnline,
    getOnlineUsersCount,
    emitCustomEvent,
    onCustomEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
