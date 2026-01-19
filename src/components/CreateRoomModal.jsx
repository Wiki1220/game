import React, { useState } from 'react';

const CreateRoomModal = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate({ name, isPublic });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>创建房间</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>房间名称</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="默认：xxx 的房间"
                            maxLength={20}
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={e => setIsPublic(e.target.checked)}
                            />
                            <span>公开房间 (显示在列表)</span>
                        </label>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="secondary-btn">取消</button>
                        <button type="submit" className="primary-btn">创建</button>
                    </div>
                </form>
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: #2a2a2a;
                    padding: 30px;
                    border-radius: 12px;
                    width: 400px;
                    color: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; color: #ccc; }
                .form-group input[type="text"] {
                    width: 100%;
                    padding: 10px;
                    background: #111;
                    border: 1px solid #444;
                    color: white;
                    border-radius: 4px;
                }
                .checkbox-group label {
                    display: flex; align-items: center; gap: 10px; cursor: pointer;
                }
                .modal-actions {
                    display: flex; justify-content: flex-end; gap: 10px;
                }
                .primary-btn {
                    background: #d32f2f; color: white; border: none; padding: 10px 20px;
                    border-radius: 4px; cursor: pointer; font-weight: bold;
                }
                .secondary-btn {
                    background: #555; color: white; border: none; padding: 10px 20px;
                    border-radius: 4px; cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default CreateRoomModal;
