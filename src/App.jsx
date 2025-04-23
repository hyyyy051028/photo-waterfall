import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Upload from './pages/Upload'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import './App.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  const isTokenValid = () => {
    if (!token) return false;
    
    try {
      // 解析token
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      // 检查token是否过期
      return tokenData.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  if (!token || !isTokenValid()) {
    // 清除无效的token和登录状态
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Upload />
          </PrivateRoute>
        } />
        <Route path="/gallery" element={
          <PrivateRoute>
            <Gallery />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App
