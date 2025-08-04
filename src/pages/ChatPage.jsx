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
  const [replyTo, setReplyTo] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!socket.connected) socket.connect();

    socket.emit("joinRoom", roomId);

    const handleReceiveMessage = (data) => {
      setMessages(prev => {
        if (!prev.some(m => m._id === data._id)) {
          return [...prev, data];
        }
        return prev;
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [roomId]);

  const handleSend = useCallback(async () => {
    const messageText = text.trim();
    if (!messageText) return;

    const tempId = Date.now().toString();
    const newMsg = {
      tempId,
      roomId,
      sender: user.username,
      text: messageText,
      replyTo,
      timestamp: new Date().toISOString(),
      status: "sending"
    };

    setMessages(prev => [...prev, newMsg]);
    setText("");
    setReplyTo(null);
    inputRef.current?.focus();

    try {
      const { data } = await axios.post(`${BASE_URL}/api/message`, {
        roomId,
        sender: user.username,
        text: messageText,
        replyTo
      });

      socket.emit("sendMessage", data);

      setMessages(prev => prev.map(m =>
        m.tempId === tempId ? { ...data, status: "sent" } : m
      ));
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => prev.map(m =>
        m.tempId === tempId ? { ...m, status: "failed" } : m
      ));
    }
  }, [text, user.username, roomId, replyTo]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (msg) => setReplyTo(msg);

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
              msg.sender === user.username ? "chat-page__message--own" : "chat-page__message--other"
            } ${msg.status === "failed" ? "chat-page__message--error" : ""}`}
            onDoubleClick={() => handleReply(msg)}
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
          className="chat-page__input"
          rows={1}
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