import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import "./css/ChatPage.css";

// ✅ Use single backend URL
const BASE_URL = "https://chat-backend-aktb.onrender.com";

// ✅ Singleton socket connection
const socket = io(BASE_URL, { autoConnect: false });

const ChatPage = () => {
  const { user } = useAuth();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("Loading...");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch room details and messages
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/chatroom`),
          axios.get(`${BASE_URL}/api/message/${roomId}`)
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

  // ✅ Socket connection
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
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  }, [text, user.username, roomId]);

  // Send on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
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
        />
        <button onClick={handleSend} className="chat-page__send-btn">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
