import React, { useState, useEffect } from 'react';

// 预设头像映射到实际显示
const AVATAR_DISPLAY = {
    general_red: { char: '帥', color: '#d32f2f' },
    general_black: { char: '將', color: '#333' },
    chariot_red: { char: '車', color: '#d32f2f' },
    chariot_black: { char: '車', color: '#333' },
    horse_red: { char: '馬', color: '#d32f2f' },
    horse_black: { char: '馬', color: '#333' },
    cannon_red: { char: '炮', color: '#d32f2f' },
    cannon_black: { char: '砲', color: '#333' },
    elephant_red: { char: '相', color: '#d32f2f' },
    elephant_black: { char: '象', color: '#333' },
    advisor_red: { char: '仕', color: '#d32f2f' },
    advisor_black: { char: '士', color: '#333' },
    soldier_red: { char: '兵', color: '#d32f2f' },
    soldier_black: { char: '卒', color: '#333' },
};

const PRESET_AVATARS = Object.keys(AVATAR_DISPLAY);

const ProfilePage = ({ user, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('profile'); // profile, history, stats
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ nickname: '', bio: '', avatar_preset: '' });
    const [saving, setSaving] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchHistory(1);
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile', { headers });
            const data = await res.json();
            if (data.success) {
                setProfile(data.user);
                setEditForm({
                    nickname: data.user.nickname || '',
                    bio: data.user.bio || '',
                    avatar_preset: data.user.avatar_preset || 'general_red'
                });
            }
        } catch (e) {
            console.error('Fetch profile error:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/user/stats', { headers });
            const data = await res.json();
            if (data.success) setStats(data.stats);
        } catch (e) {
            console.error('Fetch stats error:', e);
        }
    };

    const fetchHistory = async (page) => {
        try {
            const res = await fetch(`/api/user/history?page=${page}&limit=10`, { headers });
            const data = await res.json();
            if (data.success) {
                setHistory(data.records);
                setHistoryTotal(data.pagination.totalPages);
                setHistoryPage(page);
            }
        } catch (e) {
            console.error('Fetch history error:', e);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers,
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.success) {
                setProfile({ ...profile, ...data.user });
                setEditing(false);
                if (onUpdate) onUpdate(data.user);
            }
        } catch (e) {
            console.error('Save profile error:', e);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getAvatarDisplay = (preset) => {
        return AVATAR_DISPLAY[preset] || AVATAR_DISPLAY.general_red;
    };

    if (loading) {
        return (
            <div className="profile-modal-overlay">
                <div className="profile-modal loading">
                    <div className="spinner-large"></div>
                    <p>加载中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="profile-modal">
                {/* 头部 */}
                <div className="profile-header">
                    <button className="close-btn" onClick={onClose}>✕</button>

                    <div className="profile-avatar" style={{
                        background: getAvatarDisplay(profile?.avatar_preset).color
                    }}>
                        {getAvatarDisplay(profile?.avatar_preset).char}
                    </div>

                    <h2>{profile?.nickname || profile?.username}</h2>
                    {profile?.username !== profile?.nickname && (
                        <p className="username-sub">@{profile?.username}</p>
                    )}

                    {profile?.is_guest && <span className="guest-badge">游客账号</span>}
                    {profile?.title && <span className="title-badge">{profile.title}</span>}

                    <p className="join-date">加入于 {formatDate(profile?.created_at)}</p>
                </div>

                {/* 标签页 */}
                <div className="profile-tabs">
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
                        👤 资料
                    </button>
                    <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
                        📊 统计
                    </button>
                    <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
                        📜 战绩
                    </button>
                </div>

                {/* 内容区 */}
                <div className="profile-content">
                    {/* 资料页 */}
                    {activeTab === 'profile' && (
                        <div className="tab-content">
                            {editing ? (
                                <div className="edit-form">
                                    <div className="form-group">
                                        <label>昵称</label>
                                        <input
                                            type="text"
                                            value={editForm.nickname}
                                            onChange={e => setEditForm({ ...editForm, nickname: e.target.value })}
                                            maxLength={20}
                                        />
                                    </div>

                                    {!profile?.is_guest && (
                                        <div className="form-group">
                                            <label>个人简介</label>
                                            <textarea
                                                value={editForm.bio}
                                                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                                maxLength={200}
                                                placeholder="介绍一下自己..."
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>选择头像</label>
                                        <div className="avatar-grid">
                                            {PRESET_AVATARS.map(id => (
                                                <div
                                                    key={id}
                                                    className={`avatar-option ${editForm.avatar_preset === id ? 'selected' : ''}`}
                                                    style={{ background: getAvatarDisplay(id).color }}
                                                    onClick={() => setEditForm({ ...editForm, avatar_preset: id })}
                                                >
                                                    {getAvatarDisplay(id).char}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button className="cancel-btn" onClick={() => setEditing(false)}>取消</button>
                                        <button className="save-btn" onClick={handleSave} disabled={saving}>
                                            {saving ? '保存中...' : '保存'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-info">
                                    <div className="info-row">
                                        <span className="label">用户名</span>
                                        <span className="value">{profile?.username}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">昵称</span>
                                        <span className="value">{profile?.nickname || '-'}</span>
                                    </div>
                                    {!profile?.is_guest && (
                                        <div className="info-row">
                                            <span className="label">简介</span>
                                            <span className="value bio">{profile?.bio || '暂无简介'}</span>
                                        </div>
                                    )}
                                    <div className="info-row">
                                        <span className="label">点数</span>
                                        <span className="value points-value">{profile?.points || profile?.elo_rating || 1000}</span>
                                    </div>

                                    <button className="edit-btn" onClick={() => setEditing(true)}>
                                        ✏️ 编辑资料
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 统计页 */}
                    {activeTab === 'stats' && stats && (
                        <div className="tab-content stats-content">
                            <div className="stats-grid">
                                <div className="stat-card points-card">
                                    <div className="stat-value">{stats.points || stats.elo_rating}</div>
                                    <div className="stat-label">当前点数</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.total_games}</div>
                                    <div className="stat-label">总场次</div>
                                </div>
                                <div className="stat-card win">
                                    <div className="stat-value">{stats.wins}</div>
                                    <div className="stat-label">胜利</div>
                                </div>
                                <div className="stat-card loss">
                                    <div className="stat-value">{stats.losses}</div>
                                    <div className="stat-label">失败</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.win_rate}%</div>
                                    <div className="stat-label">胜率</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.max_win_streak || 0}</div>
                                    <div className="stat-label">最高连胜</div>
                                </div>
                            </div>
                            {stats.total_play_time_formatted && (
                                <div className="play-time">
                                    总游戏时长: {stats.total_play_time_formatted}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 战绩页 */}
                    {activeTab === 'history' && (
                        <div className="tab-content history-content">
                            {history.length === 0 ? (
                                <div className="empty-history">暂无对局记录</div>
                            ) : (
                                <>
                                    <div className="history-list">
                                        {history.map(record => (
                                            <div key={record.id} className={`history-item ${record.result}`}>
                                                <div className="result-badge">
                                                    {record.result === 'win' ? '胜' : record.result === 'loss' ? '负' : '平'}
                                                </div>
                                                <div className="match-info">
                                                    <div className="opponent">vs {record.opponent_name}</div>
                                                    <div className="details">
                                                        {record.total_turns}回合 · {record.duration_formatted}
                                                    </div>
                                                </div>
                                                <div className="elo-change">
                                                    {record.elo_change > 0 ? '+' : ''}{record.elo_change || 0}
                                                </div>
                                                <div className="match-time">{formatDateTime(record.played_at)}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {historyTotal > 1 && (
                                        <div className="pagination">
                                            <button
                                                disabled={historyPage <= 1}
                                                onClick={() => fetchHistory(historyPage - 1)}
                                            >上一页</button>
                                            <span>{historyPage} / {historyTotal}</span>
                                            <button
                                                disabled={historyPage >= historyTotal}
                                                onClick={() => fetchHistory(historyPage + 1)}
                                            >下一页</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .profile-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }

                .profile-modal {
                    width: 100%;
                    max-width: 480px;
                    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                }

                .profile-modal.loading {
                    padding: 60px;
                    text-align: center;
                    color: #888;
                }

                .spinner-large {
                    width: 40px; height: 40px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-top-color: #e63946;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                .profile-header {
                    padding: 30px 20px;
                    text-align: center;
                    background: linear-gradient(180deg, rgba(230,57,70,0.2) 0%, transparent 100%);
                    position: relative;
                }

                .close-btn {
                    position: absolute;
                    top: 15px; right: 15px;
                    width: 36px; height: 36px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    border-radius: 50%;
                    color: #888;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .close-btn:hover {
                    background: rgba(255,255,255,0.2);
                    color: #fff;
                }

                .profile-avatar {
                    width: 80px; height: 80px;
                    border-radius: 50%;
                    margin: 0 auto 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 36px;
                    font-weight: bold;
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    border: 3px solid rgba(255,255,255,0.2);
                }

                .profile-header h2 {
                    margin: 0 0 5px;
                    color: #fff;
                    font-size: 24px;
                }

                .username-sub {
                    color: #666;
                    font-size: 14px;
                    margin: 0 0 10px;
                }

                .guest-badge, .title-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    margin: 5px 3px;
                }

                .guest-badge {
                    background: rgba(255,193,7,0.2);
                    color: #ffc107;
                }

                .title-badge {
                    background: rgba(156,39,176,0.2);
                    color: #ba68c8;
                }

                .join-date {
                    color: #555;
                    font-size: 13px;
                    margin: 10px 0 0;
                }

                .profile-tabs {
                    display: flex;
                    background: rgba(0,0,0,0.2);
                    padding: 5px;
                    margin: 0 15px;
                    border-radius: 12px;
                }

                .profile-tabs button {
                    flex: 1;
                    padding: 12px;
                    background: transparent;
                    border: none;
                    color: #666;
                    font-size: 14px;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.2s;
                }

                .profile-tabs button.active {
                    background: rgba(230,57,70,0.2);
                    color: #e63946;
                }

                .profile-tabs button:hover:not(.active) {
                    color: #aaa;
                }

                .profile-content {
                    height: 320px;
                    overflow-y: auto;
                    padding: 20px;
                }

                .tab-content {
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* 资料页 */
                .profile-info .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 15px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }

                .info-row .label {
                    color: #666;
                }

                .info-row .value {
                    color: #fff;
                }

                .info-row .value.points-value {
                    color: #64b5f6;
                    font-weight: bold;
                }

                .info-row .value.bio {
                    max-width: 200px;
                    text-align: right;
                    color: #888;
                }

                .edit-btn {
                    width: 100%;
                    padding: 14px;
                    margin-top: 20px;
                    background: linear-gradient(135deg, #e63946 0%, #d62828 100%);
                    border: none;
                    border-radius: 12px;
                    color: #fff;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .edit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(230,57,70,0.4);
                }

                /* 编辑表单 */
                .edit-form .form-group {
                    margin-bottom: 20px;
                }

                .edit-form label {
                    display: block;
                    color: #888;
                    font-size: 13px;
                    margin-bottom: 8px;
                }

                .edit-form input,
                .edit-form textarea {
                    width: 100%;
                    padding: 12px;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    color: #fff;
                    font-size: 15px;
                    box-sizing: border-box;
                }

                .edit-form textarea {
                    min-height: 80px;
                    resize: vertical;
                }

                .edit-form input:focus,
                .edit-form textarea:focus {
                    border-color: #e63946;
                    outline: none;
                }

                .avatar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 8px;
                }

                .avatar-option {
                    aspect-ratio: 1;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                    color: #fff;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                }

                .avatar-option:hover {
                    transform: scale(1.1);
                }

                .avatar-option.selected {
                    border-color: #ffd700;
                    box-shadow: 0 0 10px rgba(255,215,0,0.5);
                }

                .form-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }

                .cancel-btn, .save-btn {
                    flex: 1;
                    padding: 14px;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .cancel-btn {
                    background: rgba(255,255,255,0.1);
                    color: #888;
                }

                .save-btn {
                    background: linear-gradient(135deg, #e63946 0%, #d62828 100%);
                    color: #fff;
                }

                .save-btn:disabled {
                    opacity: 0.6;
                }

                /* 统计页 */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }

                .stat-card {
                    background: rgba(255,255,255,0.05);
                    padding: 20px;
                    border-radius: 15px;
                    text-align: center;
                }

                .stat-card.points-card {
                    grid-column: span 2;
                    background: linear-gradient(135deg, rgba(100,181,246,0.1) 0%, rgba(33,150,243,0.05) 100%);
                }

                .stat-card.win { background: rgba(76,175,80,0.1); }
                .stat-card.loss { background: rgba(244,67,54,0.1); }

                .stat-value {
                    font-size: 32px;
                    font-weight: bold;
                    color: #fff;
                }

                .stat-card.elo .stat-value { color: #ffd700; }
                .stat-card.win .stat-value { color: #4caf50; }
                .stat-card.loss .stat-value { color: #f44336; }

                .stat-label {
                    color: #666;
                    font-size: 13px;
                    margin-top: 5px;
                }

                .stat-sub {
                    color: #555;
                    font-size: 12px;
                    margin-top: 5px;
                }

                .play-time {
                    text-align: center;
                    color: #555;
                    font-size: 13px;
                    margin-top: 20px;
                }

                /* 战绩页 */
                .empty-history {
                    text-align: center;
                    color: #555;
                    padding: 40px;
                }

                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .history-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 12px;
                    border-left: 3px solid #666;
                }

                .history-item.win { border-left-color: #4caf50; }
                .history-item.loss { border-left-color: #f44336; }
                .history-item.draw { border-left-color: #ffc107; }

                .result-badge {
                    width: 36px; height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                }

                .history-item.win .result-badge {
                    background: rgba(76,175,80,0.2);
                    color: #4caf50;
                }

                .history-item.loss .result-badge {
                    background: rgba(244,67,54,0.2);
                    color: #f44336;
                }

                .history-item.draw .result-badge {
                    background: rgba(255,193,7,0.2);
                    color: #ffc107;
                }

                .match-info {
                    flex: 1;
                }

                .match-info .opponent {
                    color: #fff;
                    font-weight: 500;
                }

                .match-info .details {
                    color: #555;
                    font-size: 12px;
                    margin-top: 3px;
                }

                .elo-change {
                    font-weight: bold;
                    color: #888;
                }

                .history-item.win .elo-change { color: #4caf50; }
                .history-item.loss .elo-change { color: #f44336; }

                .match-time {
                    color: #444;
                    font-size: 12px;
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    margin-top: 20px;
                }

                .pagination button {
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    border-radius: 8px;
                    color: #888;
                    cursor: pointer;
                }

                .pagination button:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .pagination span {
                    color: #666;
                }
            `}</style>
        </div>
    );
};

export default ProfilePage;
