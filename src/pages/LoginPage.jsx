import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './css/LoginPage.css';

// ✅ Use correct backend URL (fallbacks included)
const BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "https://chat-backend-aktb.onrender.com";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        username,
        password,
      });

      if (res.data.success) {
        setUser(res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2 className="login-title">DuoChat Login</h2>

        <input
          type="text"
          placeholder="Username (Jay / Bhautik)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />

        <button type="submit" className="login-button">Login</button>

        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
};

export default LoginPage;
