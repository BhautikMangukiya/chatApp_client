// ChatPage.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./css/ChatPage.css";

dayjs.extend(relativeTime);

const BASE_URL = "https://chatapp-backend-hfpn.onrender.com";
let socket;

const ChatPage = () => {
  const { user } = useAuth();
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("Loading...");
  const [replyTo, setReplyTo] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.emit("joinRoom", roomId);

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => {
        if (!prev.some((m) => m._id === msg._id)) {
          return [...prev, msg];
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = Date.now().toString();
    const tempMsg = {
      tempId,
      roomId,
      sender: user.username,
      text: trimmed,
      replyTo,
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setText("");
    setReplyTo(null);
    inputRef.current?.focus();

    try {
      const { data } = await axios.post(`${BASE_URL}/api/message`, {
        roomId,
        sender: user.username,
        text: trimmed,
        replyTo,
      });

      socket.emit("sendMessage", data); // Emit after successful save

      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...data, status: "sent" } : m))
      );
    } catch (err) {
      console.error("Send error:", err.message);
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, status: "failed" } : m))
      );
    }
  }, [text, replyTo, roomId, user.username]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-page">
      <div className="nav">
        <h2>{roomName}</h2>
      </div>
      <div className="chat-page__chat-box">
        {messages.map((msg) => (
          <div
            key={msg._id || msg.tempId}
            className={`chat-page__message ${
              msg.sender === user.username ? "chat-page__message--own" : "chat-page__message--other"
            } ${msg.status === "failed" ? "chat-page__message--error" : ""}`}
            onDoubleClick={() => setReplyTo(msg)}
          >
            {msg.replyTo && (
              <div className="chat-page__message-reply">
                Replying to: {msg.replyTo.text.slice(0, 30)}
              </div>
            )}
            <div className="chat-page__message-text">{msg.text}</div>
            <div className="chat-page__message-meta">
              <span>{dayjs(msg.timestamp).format("HH:mm")}</span>
              {msg.status === "sending" && <span> ⏳</span>}
              {msg.status === "sent" && <span> ✅</span>}
              {msg.status === "failed" && <span> ❌</span>}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {replyTo && (
        <div className="chat-page__reply-preview">
          Replying to: {replyTo.text.slice(0, 40)}
          <button onClick={() => setReplyTo(null)}>x</button>
        </div>
      )}

      <div className="chat-page__input-area">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="chat-page__input"
        />
        <button onClick={handleSend} disabled={!text.trim()} className="chat-page__send-btn">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
