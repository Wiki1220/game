import React, { useState } from 'react';

const Login = ({ onLogin, onGuest }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3333';
    // If we serve frontend via backend static proxy, '' is correct.
    // But if dev mode (vite 5173 -> backend 3001), we need full url.
    // Actually, Vite proxy should handle /api -> 3001/3333.
    // Let's assume /api works via proxy (setup needed in vite.config).
    const API_URL = '/api/auth';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegister ? '/register' : '/login';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');

            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/guest`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onGuest(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>战旗：对决</h1>
                <h2>{isRegister ? '注册账号' : '登录游戏'}</h2>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="用户名"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="密码"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                    <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
                    </button>
                </form>

                <div className="actions">
                    <button className="link-btn" onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? '已有账号？登录' : '没有账号？注册'}
                    </button>

                    <div className="divider">或</div>

                    <button className="guest-btn" onClick={handleGuest} disabled={loading}>
                        游客登录
                    </button>
                </div>
            </div>

            <style>{`
        .login-container {
          display: flex;
          height: 100vh;
          align-items: center;
          justify-content: center;
          background: #121212;
          color: #fff;
        }
        .login-card {
          width: 320px;
          padding: 40px;
          background: #1e1e1e;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          text-align: center;
        }
        h1 { margin-bottom: 30px; color: #ff4d4d; text-shadow: 0 0 10px rgba(255, 77, 77, 0.5); }
        h2 { margin-bottom: 20px; font-size: 1.2em; color: #aaa; }
        input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          background: #333;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          font-size: 1rem;
        }
        .primary-btn {
          width: 100%;
          padding: 12px;
          background: #d32f2f;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }
        .primary-btn:hover { background: #b71c1c; }
        .guest-btn {
          width: 100%;
          padding: 10px;
          background: transparent;
          border: 1px solid #666;
          color: #ccc;
          border-radius: 6px;
          cursor: pointer;
        }
        .guest-btn:hover { border-color: #fff; color: #fff; }
        .divider { margin: 15px 0; color: #666; font-size: 0.8em; }
        .actions { margin-top: 20px; }
        .link-btn {
          background: none;
          border: none;
          color: #4dabf5;
          cursor: pointer;
          font-size: 0.9em;
          text-decoration: underline;
        }
        .error-msg {
          background: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 0.9em;
        }
      `}</style>
        </div>
    );
};

export default Login;
