// import { useEffect, useState, useRef, useCallback } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import axios from "axios";
// import io from "socket.io-client";
// import "./css/ChatPage.css";

// const BASE_URL = "https://chatapp-backend-hfpn.onrender.com";

// // Singleton socket connection
// const socket = io(BASE_URL, { transports: ["websocket"], autoConnect: false });

// const ChatPage = () => {
//   const { user } = useAuth();
//   const { roomId } = useParams();
//   const navigate = useNavigate();

//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [roomName, setRoomName] = useState("Loading...");
//   const chatEndRef = useRef(null);
//   const inputRef = useRef(null);

//   // Auto-scroll
//   const scrollToBottom = () => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   // Fetch room & messages
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [roomsRes, messagesRes] = await Promise.all([
//           axios.get(`${BASE_URL}/api/chatroom`),
//           axios.get(`${BASE_URL}/api/message/${roomId}`)
//         ]);

//         const room = roomsRes.data.rooms.find((r) => r._id === roomId);
//         if (!room) {
//           navigate("/");
//           return;
//         }

//         setRoomName(room.name);
//         setMessages(messagesRes.data.messages || []);
//       } catch (error) {
//         console.error("❌ Error loading chat room:", error);
//       }
//     };

//     fetchData();
//   }, [roomId, navigate]);

//   // Join room & socket listeners
//   useEffect(() => {
//     if (!socket.connected) socket.connect();
//     socket.emit("joinRoom", roomId);

//     // Receive new messages
//     socket.on("receiveMessage", (msg) => {
//       setMessages((prev) => [...prev, msg]);
//     });

//     // Update message status
//     socket.on("messageStatusUpdate", ({ _id, status }) => {
//       setMessages((prev) =>
//         prev.map((m) => (m._id === _id ? { ...m, status } : m))
//       );
//     });

//     // Mark messages as seen
//     socket.on("messagesSeen", (ids) => {
//       setMessages((prev) =>
//         prev.map((m) => (ids.includes(m._id) ? { ...m, status: "seen" } : m))
//       );
//     });

//     return () => {
//       socket.off("receiveMessage");
//       socket.off("messageStatusUpdate");
//       socket.off("messagesSeen");
//     };
//   }, [roomId]);

//   // Send message
//   const handleSend = useCallback(async () => {
//     if (!text.trim()) return;

//     const tempId = Date.now().toString();
//     const newMessage = {
//       _id: tempId,
//       roomId,
//       sender: user.username,
//       text: text.trim(),
//       status: "sent"
//     };

//     setMessages((prev) => [...prev, newMessage]);
//     setText("");

//     try {
//       await axios.post(`${BASE_URL}/api/message`, newMessage);
//       socket.emit("sendMessage", newMessage);
//     } catch (err) {
//       console.error("❌ Error sending message:", err);
//     }
//   }, [text, user.username, roomId]);

//   // Send on Enter key
//   const handleKeyDown = (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   // Mark unread messages as seen
//   useEffect(() => {
//     const unseenIds = messages
//       .filter((m) => m.sender !== user.username && m.status !== "seen")
//       .map((m) => m._id);

//     if (unseenIds.length) {
//       socket.emit("markAsSeen", { messageIds: unseenIds, roomId });
//     }
//   }, [messages, roomId, user.username]);

//   // Always focus input on mount
//   useEffect(() => {
//     setTimeout(() => {
//       inputRef.current?.focus();
//     }, 300);
//   }, []);

//   // Scroll when messages change
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const renderStatusIcon = (status) => {
//     if (status === "sent") return <span>✓</span>; // 1 gray tick
//     if (status === "delivered") return <span>✓✓</span>; // 2 gray ticks
//     if (status === "seen") return <span style={{ color: "blue" }}>✓✓</span>; // 2 blue ticks
//     return null;
//   };

//   return (
//     <div className="chat-page">
//       <div className="nav">
//         <h2 className="chat-page__header">{roomName}</h2>
//       </div>

//       <div className="chat-page__chat-box">
//         {messages.map((msg, idx) => (
//           <div
//             key={idx}
//             className={`chat-page__message ${
//               msg.sender === user.username
//                 ? "chat-page__message--own"
//                 : "chat-page__message--other"
//             }`}
//           >
//             <div className="chat-page__message-text">
//               {msg.text}
//               {msg.sender === user.username && (
//                 <span className="chat-page__status">
//                   {renderStatusIcon(msg.status)}
//                 </span>
//               )}
//             </div>
//           </div>
//         ))}
//         <div ref={chatEndRef} />
//       </div>

//       <div className="chat-page__input-area">
//         <input
//           ref={inputRef}
//           type="text"
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Type a message..."
//           className="chat-page__input"
//         />
//         <button
//           onClick={(e) => {
//             e.preventDefault();
//             handleSend();
//           }}
//           className="chat-page__send-btn"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ChatPage;


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

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch room and messages
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, messagesRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/chatroom`),
          axios.get(`${BASE_URL}/api/message/${roomId}`),
        ]);

        const room = roomsRes.data.rooms.find((r) => r._id === roomId);
        if (!room) {
          navigate("/");
          return;
        }

        setRoomName(room.name);
        setMessages(messagesRes.data.messages || []);
      } catch (error) {
        console.error("❌ Error loading chat room:", error);
        navigate("/");
      }
    };

    fetchData();
  }, [roomId, navigate]);

  // Socket connection and listeners
  useEffect(() => {
    if (!user || !roomId) return;

    if (!socket.connected) socket.connect();
    socket.emit("joinRoom", { roomId, userId: user._id });

    // Receive new message
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Update message status
    socket.on("messageStatusUpdate", ({ _id, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === _id ? { ...m, status } : m))
      );
    });

    // Mark messages as seen
    socket.on("messagesSeen", (ids) => {
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m._id) ? { ...m, status: "seen" } : m))
      );
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageStatusUpdate");
      socket.off("messagesSeen");
      socket.emit("leaveRoom", { roomId, userId: user._id });
    };
  }, [roomId, user]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!text.trim() || !user) return;

    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      roomId,
      sender: user._id,
      senderName: user.username,
      text: text.trim(),
      status: "sent",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setText("");

    try {
      const response = await axios.post(`${BASE_URL}/api/message`, newMessage);
      socket.emit("sendMessage", response.data.message);
    } catch (err) {
      console.error("❌ Error sending message:", err);
      setMessages((prev) =>
        prev.filter((m) => m._id !== tempId)
      );
    }
  }, [text, user, roomId]);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mark unread messages as seen
  useEffect(() => {
    if (!user) return;

    const unseenIds = messages
      .filter((m) => m.sender !== user._id && m.status !== "seen")
      .map((m) => m._id);

    if (unseenIds.length) {
      socket.emit("markAsSeen", { messageIds: unseenIds, roomId, userId: user._id });
    }
  }, [messages, roomId, user]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Render message status icons
  const renderStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <span className="status-tick">✓</span>;
      case "delivered":
        return <span className="status-tick">✓✓</span>;
      case "seen":
        return <span className="status-tick seen">✓✓</span>;
      default:
        return null;
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>{roomName}</h2>
      </div>

      <div className="chat-box">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`message ${
              msg.sender === user?._id ? "message-own" : "message-other"
            }`}
          >
            <div className="message-content">
              <div className="message-text">{msg.text}</div>
              <div className="message-meta">
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.sender === user?._id && renderStatusIcon(msg.status)}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button onClick={handleSend} className="send-btn">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;