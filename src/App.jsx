import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Upload from './pages/Upload'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import Home from './pages/Home'
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

function AppContent() {
  const [navVisible, setNavVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/gallery') {
      const timer = setTimeout(() => {
        setNavVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setNavVisible(true);
    }
  }, [location.pathname]);

  return (
    <>
      <div className="nav-hover-area" />

      <nav className={`nav-header ${!navVisible ? 'hidden' : ''}`}>
        <div className="nav-container">
          <NavLink to="/" className="nav-logo">山茶花开</NavLink>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>首页</NavLink>
            <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>上传</NavLink>
            <NavLink to="/gallery" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>瀑布流</NavLink>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } />
        <Route path="/upload" element={
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
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
