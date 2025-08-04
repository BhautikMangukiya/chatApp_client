import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import "./css/ChatPage.css";

const BASE_URL = "https://chat-backend-aktb.onrender.com";

// ✅ Singleton socket
const socket = io(BASE_URL, {
  transports: ["websocket"],
  withCredentials: true
});

const ChatPage = () => {
  const { user } = useAuth();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("Loading...");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ Auto-scroll on message update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch room and messages
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
        console.error("❌ Error loading chat room:", error);
      }
    };

    fetchRoomData();
  }, [roomId]);

  // ✅ Join room + receive messages
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit("joinRoom", roomId);

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [roomId]);

  // ✅ Send message
  const handleSend = useCallback(async () => {
    if (!text.trim()) return;

    const newMsg = {
      roomId,
      sender: user.username,
      text: text.trim(),
    };

    try {
      await axios.post(`${BASE_URL}/api/message`, newMsg);
      socket.emit("sendMessage", newMsg);
      setText("");

      // ✅ Keep input focused
      inputRef.current?.focus();
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  }, [text, user.username, roomId]);

  // ✅ Send on Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // avoid form submit
      handleSend();
    }
  };

  // ✅ Always focus input on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="chat-page">
      <div className="nav">
        <h2 className="chat-page__header">{roomName}</h2>
      </div>

      <div className="chat-page__chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
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
          autoFocus
        />
        <button
          onClick={(e) => {
            e.preventDefault(); // avoid blur on mobile
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
