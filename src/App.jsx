import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={user ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/chat/:roomId"
        element={user ? <ChatPage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;
