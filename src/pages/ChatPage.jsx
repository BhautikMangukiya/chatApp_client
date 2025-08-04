import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import "./css/ChatPage.css";

const BASE_URL = "https://chatapp-backend-hfpn.onrender.com";

// Singleton socket connection
const socket = io(BASE_URL, { transports: ["websocket"], autoConnect: false });

const ChatPage = () => {
  const { user } = useAuth();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("Loading...");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch room & messages
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, messagesRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/chatroom`),
          axios.get(`${BASE_URL}/api/message/${roomId}`),
        ]);

        const room = roomsRes.data.rooms.find((r) => r._id === roomId);
        if (!room) {
          navigate("/"); // Redirect if room not found
          return;
        }

        setRoomName(room.name);
        setMessages(messagesRes.data.messages || []);
      } catch (error) {
        console.error("❌ Error loading chat room:", error);
      }
    };

    fetchData();
  }, [roomId, navigate]);

  // Join room & listen for new messages
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit("joinRoom", roomId);

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("receiveMessage", handleNewMessage);

    return () => {
      socket.off("receiveMessage", handleNewMessage);
    };
  }, [roomId]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!text.trim()) return;

    const newMessage = {
      roomId,
      sender: user.username,
      text: text.trim(),
    };

    try {
      await axios.post(`${BASE_URL}/api/message`, newMessage);
      socket.emit("sendMessage", newMessage);
      setText("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  }, [text, user.username, roomId]);

  // Send on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Always focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  // Scroll on message update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-page">
      <div className="nav">
        <h2 className="chat-page__header">{roomName}</h2>
      </div>

      <div className="chat-page__chat-box">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-page__message ${
              msg.sender === user.username
                ? "chat-page__message--own"
                : "chat-page__message--other"
            }`}
          >
            <div className="chat-page__message-text">{msg.text}</div>
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
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="chat-page__send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;