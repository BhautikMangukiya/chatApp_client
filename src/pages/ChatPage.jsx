import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import "./css/ChatPage.css";

const BASE_URL = "https://chatapp-backend-hfpn.onrender.com";

const socket = io(BASE_URL, {
  transports: ["websocket"],
  autoConnect: false
});

const ChatPage = () => {
  const { user } = useAuth();
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("Loading...");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch room data and messages
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/chatroom`),
          axios.get(`${BASE_URL}/api/message/${roomId}`),
        ]);

        const room = roomRes.data.rooms.find((r) => r._id === roomId);
        setRoomName(room?.name || "Chat Room");
        setMessages(msgRes.data.messages || []);
      } catch (error) {
        console.error("Error loading chat room:", error);
      }
    };

    fetchRoomData();
  }, [roomId]);

  // Socket.io connection and message handling
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinRoom", roomId);

    const handleReceiveMessage = (data) => {
      // Replace optimistic update with confirmed message
      setMessages(prev => prev.map(m => 
        m.tempId && m.sender === data.sender && m.text === data.text 
          ? data 
          : m
      ).filter(m => !m.tempId || m.sender !== data.sender || m.text !== data.text));
      
      // Add new message if not already present
      setMessages(prev => {
        if (!prev.some(m => m._id === data._id || (m.tempId && m.text === data.text && m.sender === data.sender))) {
          return [...prev, data];
        }
        return prev;
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [roomId]);

  // Optimistic message sending
  const handleSend = useCallback(async () => {
    const messageText = text.trim();
    if (!messageText) return;

    // Create optimistic message
    const tempId = Date.now().toString();
    const newMsg = {
      tempId,
      roomId,
      sender: user.username,
      text: messageText,
      timestamp: new Date().toISOString()
    };

    // Add immediately to UI
    setMessages(prev => [...prev, newMsg]);
    setText("");
    
    // Keep input focused
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    try {
      // Send to server
      const { data } = await axios.post(`${BASE_URL}/api/message`, {
        roomId,
        sender: user.username,
        text: messageText
      });
      
      // Emit via socket
      socket.emit("sendMessage", data);
      
      // Update message with server data
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...data, isPending: false } : m
      ));
    } catch (err) {
      console.error("Error sending message:", err);
      // Mark as failed
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, isPending: "failed" } : m
      ));
    }
  }, [text, user.username, roomId]);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="chat-page">
      <div className="nav">
        <h2 className="chat-page__header">{roomName}</h2>
      </div>

      <div className="chat-page__chat-box">
        {messages.map((msg) => (
          <div
            key={msg._id || msg.tempId}
            className={`chat-page__message ${
              msg.sender === user.username
                ? "chat-page__message--own"
                : "chat-page__message--other"
            } ${msg.isPending ? "chat-page__message--pending" : ""}`}
          >
            <div className="chat-page__message-text">{msg.text}</div>
            {msg.isPending === "failed" && (
              <div className="chat-page__message-error">Failed to send</div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-page__input-area">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-page__input"
          autoFocus
          enterKeyHint="send"
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="chat-page__send-btn"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;