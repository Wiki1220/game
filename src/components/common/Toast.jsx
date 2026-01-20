import React, { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast-item ${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
            <style>{`
                .toast-container {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }
                .toast-item {
                    background: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    backdrop-filter: blur(4px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: toast-fade-in 0.3s ease-out;
                    pointer-events: auto;
                    min-width: 200px;
                    text-align: center;
                }
                .toast-item.error {
                    border-left: 4px solid #ff4444;
                }
                .toast-item.success {
                    border-left: 4px solid #00C851;
                }
                .toast-item.info {
                    border-left: 4px solid #33b5e5;
                }
                @keyframes toast-fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
};
