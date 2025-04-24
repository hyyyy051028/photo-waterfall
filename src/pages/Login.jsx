import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// 预加载图片
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = resolve;
    img.onerror = reject;
  });
};

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 预加载背景图片
    preloadImage('../../imags/首页2.jpg')
      .then(() => setIsLoading(false))
      .catch(err => {
        console.error('背景图片加载失败:', err);
        setIsLoading(false);
      });
  }, []);

  const generateToken = (username) => {
    // 创建 token payload
    const payload = {
      username,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24小时过期
      iat: Math.floor(Date.now() / 1000)
    };

    // 简单的 JWT 结构
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const content = btoa(JSON.stringify(payload));
    const signature = btoa('your-secret-key'); // 实际应用中应该使用更安全的签名方法

    return `${header}.${content}.${signature}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'camellia' && password === '20060221') {
      const token = generateToken(username);
      localStorage.setItem('token', token);
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/');
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div className={`login-container ${isLoading ? 'loading' : 'loaded'}`}>
      <div className="login-box">
        <h2 className="login-title">Camellia你好！</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              id="username"
              name="username"
              type="text"
              required
              className="form-input"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
