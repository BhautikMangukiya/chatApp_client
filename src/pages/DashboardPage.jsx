const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require("path");

// Load environment variables from .env
dotenv.config();

// App setup
const app = express();
const server = http.createServer(app);

// CORS setup (only allow your Vercel frontend URLs)
const allowedOrigins = [
  "https://chat-app-client-beryl-five.vercel.app",
  "https://chat-app-client-git-main-bhautiks-projects-e9693610.vercel.app",
  "https://chat-app-client-cnvz786wy-bhautiks-projects-e9693610.vercel.app",
  "https://chat-app-client-76n2gfh2c-bhautiks-projects-e9693610.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
const authRoutes = require("./routes/auth.routes");
const chatroomRoutes = require("./routes/chatroom.routes");
const messageRoutes = require("./routes/message.routes");

app.use("/api/auth", authRoutes);
app.use("/api/chatroom", chatroomRoutes);
app.use("/api/message", messageRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`📦 User ${socket.id} joined room ${roomId}`);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.roomId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Default route for health check
app.get("/", (req, res) => {
  res.send("🚀 Chat App Backend Running...");
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
