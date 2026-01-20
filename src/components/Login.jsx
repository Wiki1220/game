import React, { useState } from 'react';

const Login = ({ onLogin, onGuest }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div className="login-page">
            {/* 背景装饰 */}
            <div className="bg-decoration">
                <div className="piece piece-1">將</div>
                <div className="piece piece-2">帥</div>
                <div className="piece piece-3">車</div>
                <div className="piece piece-4">馬</div>
            </div>

            <div className="login-card">
                {/* Logo区域 */}
                <div className="logo-section">
                    <div className="logo-icon">♟</div>
                    <h1>战旗对决</h1>
                    <p className="subtitle">Battle Chess: Duel</p>
                </div>

                {/* 模式切换标签 */}
                <div className="tab-switcher">
                    <button
                        className={`tab ${!isRegister ? 'active' : ''}`}
                        onClick={() => setIsRegister(false)}
                    >
                        登录
                    </button>
                    <button
                        className={`tab ${isRegister ? 'active' : ''}`}
                        onClick={() => setIsRegister(true)}
                    >
                        注册
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-msg">
                        <span className="error-icon">⚠</span>
                        {error}
                    </div>
                )}

                {/* 表单 */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">用户名</label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                id="username"
                                type="text"
                                placeholder="请输入用户名"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                minLength={3}
                                maxLength={20}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">密码</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="password"
                                type="password"
                                placeholder="请输入密码"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? (
                            <span className="loading-spinner"></span>
                        ) : (
                            isRegister ? '立即注册' : '登录游戏'
                        )}
                    </button>
                </form>

                {/* 分割线 */}
                <div className="divider-line">
                    <span>或者</span>
                </div>

                {/* 游客登录 */}
                <button className="guest-btn" onClick={handleGuest} disabled={loading}>
                    <span className="guest-icon">🎮</span>
                    游客模式快速体验
                </button>

                {/* 底部提示 */}
                <p className="footer-hint">
                    {isRegister
                        ? '注册即表示同意我们的服务条款'
                        : '首次登录？点击上方"注册"创建账号'}
                </p>
            </div>

            <style>{`
                * {
                    box-sizing: border-box;
                }

                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    position: relative;
                    overflow: hidden;
                    padding: 20px;
                }

                /* 背景装饰棋子 */
                .bg-decoration {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    opacity: 0.08;
                }

                .piece {
                    position: absolute;
                    font-size: 120px;
                    font-weight: bold;
                    color: #fff;
                }

                .piece-1 { top: 10%; left: 5%; transform: rotate(-15deg); }
                .piece-2 { top: 60%; right: 5%; transform: rotate(20deg); }
                .piece-3 { bottom: 10%; left: 15%; transform: rotate(10deg); }
                .piece-4 { top: 20%; right: 20%; transform: rotate(-5deg); }

                .login-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 40px;
                    background: rgba(30, 30, 50, 0.95);
                    border-radius: 20px;
                    box-shadow: 
                        0 25px 50px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    position: relative;
                    z-index: 10;
                }

                /* Logo区域 */
                .logo-section {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .logo-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .logo-section h1 {
                    font-size: 32px;
                    font-weight: bold;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin: 0 0 5px 0;
                    letter-spacing: 4px;
                }

                .subtitle {
                    font-size: 12px;
                    color: #666;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                }

                /* 标签切换 */
                .tab-switcher {
                    display: flex;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 4px;
                    margin-bottom: 25px;
                }

                .tab {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: transparent;
                    color: #888;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.3s ease;
                }

                .tab.active {
                    background: linear-gradient(135deg, #e63946 0%, #d62828 100%);
                    color: white;
                    box-shadow: 0 4px 15px rgba(230, 57, 70, 0.4);
                }

                .tab:not(.active):hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
                }

                /* 错误消息 */
                .error-msg {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(220, 53, 69, 0.15);
                    border: 1px solid rgba(220, 53, 69, 0.3);
                    color: #ff6b6b;
                    padding: 12px 16px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    font-size: 14px;
                }

                .error-icon {
                    font-size: 16px;
                }

                /* 输入框组 */
                .input-group {
                    margin-bottom: 20px;
                }

                .input-group label {
                    display: block;
                    color: #aaa;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 16px;
                    font-size: 16px;
                    z-index: 1;
                }

                .input-wrapper input {
                    width: 100%;
                    padding: 14px 16px 14px 48px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: #fff;
                    font-size: 15px;
                    transition: all 0.3s ease;
                    outline: none;
                }

                .input-wrapper input::placeholder {
                    color: #555;
                }

                .input-wrapper input:focus {
                    border-color: #e63946;
                    background: rgba(230, 57, 70, 0.05);
                    box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.1);
                }

                /* 提交按钮 */
                .submit-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #e63946 0%, #d62828 100%);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(230, 57, 70, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 52px;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(230, 57, 70, 0.5);
                }

                .submit-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                /* 加载动画 */
                .loading-spinner {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* 分割线 */
                .divider-line {
                    display: flex;
                    align-items: center;
                    margin: 25px 0;
                }

                .divider-line::before,
                .divider-line::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
                }

                .divider-line span {
                    padding: 0 15px;
                    color: #555;
                    font-size: 13px;
                }

                /* 游客按钮 */
                .guest-btn {
                    width: 100%;
                    padding: 14px;
                    background: transparent;
                    border: 2px solid rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    color: #aaa;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .guest-btn:hover:not(:disabled) {
                    border-color: #ffd93d;
                    color: #ffd93d;
                    background: rgba(255, 217, 61, 0.05);
                }

                .guest-icon {
                    font-size: 18px;
                }

                /* 底部提示 */
                .footer-hint {
                    text-align: center;
                    margin-top: 20px;
                    color: #555;
                    font-size: 12px;
                }

                /* 响应式 */
                @media (max-width: 480px) {
                    .login-card {
                        padding: 30px 20px;
                    }

                    .logo-section h1 {
                        font-size: 26px;
                    }

                    .piece {
                        font-size: 80px;
                    }
                }
            `}</style>
        </div>
    );
};

export default Login;
