import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './css/DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [chatrooms, setChatrooms] = useState([]);
  const navigate = useNavigate();

  const BASE_URL = 'https://chat-backend-aktb.onrender.com';

  const fetchChatrooms = async () => {
    const res = await axios.get(`${BASE_URL}/api/chatroom`);
    if (res.data.success) setChatrooms(res.data.rooms);
  };

  useEffect(() => {
    fetchChatrooms();
  }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) return;

    await axios.post(`${BASE_URL}/api/chatroom/create`, {
      name: roomName
    });

    setRoomName('');
    fetchChatrooms();
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-welcome">Welcome, {user.username} 👋</h2>

      <div className="dashboard-create-box">
        <input
          type="text"
          placeholder="Enter chatroom name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="dashboard-input"
        />
        <button onClick={handleCreate} className="dashboard-button">
          Create Chatroom
        </button>
      </div>

      <h3 className="dashboard-subtitle">Available Chatrooms:</h3>
      <div className="dashboard-room-list">
        {chatrooms.map(room => (
          <div
            key={room._id}
            className="dashboard-room-card"
            onClick={() => navigate(`/chat/${room._id}`)}
          >
            <p className="dashboard-room-name">{room.name}</p>
            <span className="dashboard-room-date">{new Date(room.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
