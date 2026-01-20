import React, { useState, useEffect } from 'react';
import './ActionNotification.css';

const ActionNotification = ({ notifications, onRemove, onHighlight }) => {
    return (
        <div className="notification-container">
            {notifications.map(n => (
                <NotificationItem
                    key={n.id}
                    data={n}
                    onRemove={onRemove}
                    onHighlight={onHighlight}
                />
            ))}
        </div>
    );
};

const NotificationItem = ({ data, onRemove, onHighlight }) => {
    const [elapsed, setElapsed] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [showEffect, setShowEffect] = useState(false);

    useEffect(() => {
        if (isHovered) return;

        const interval = 100;
        const timer = setInterval(() => {
            setElapsed(prev => {
                const next = prev + interval;
                if (next >= 3000) {
                    clearInterval(timer);
                    onRemove(data.id);
                }
                return next;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isHovered, onRemove, data.id]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        setElapsed(0); // Reset timer on hover
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const opacity = elapsed < 2000 ? 1 : Math.max(0, 1 - (elapsed - 2000) / 1000);

    const formatPos = (pos) => {
        if (!pos) return '';
        // Map 0-8 to 1-9
        return `(${pos.x + 1}, ${pos.y + 1})`;
    };

    return (
        <div
            className="notification-item"
            style={{ opacity }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trap Set */}
            {data.type === 'TRAP_SET' && (
                <span>
                    你的对手盖放了一张陷阱卡 ({data.count}/2)
                </span>
            )}

            {/* Trap Trigger */}
            {data.type === 'TRAP_TRIGGER' && (
                <span>
                    你触发了陷阱卡
                    <span
                        className="notification-link"
                        onMouseEnter={() => setShowEffect(true)}
                        onMouseLeave={() => setShowEffect(false)}
                    >
                        {data.card?.name}
                    </span>
                    ({data.count}/2)
                </span>
            )}

            {/* Play Card */}
            {data.type === 'PLAY_CARD' && (
                <span>
                    对手{data.targetText || data.targetPos ? '对' : ''}
                    {(data.targetText || data.targetPos) && (
                        <span
                            className="notification-link"
                            onMouseEnter={() => onHighlight(data.targetPos)}
                            onMouseLeave={() => onHighlight(null)}
                        >
                            {data.targetText || formatPos(data.targetPos)}
                        </span>
                    )}
                    发动了{data.card?.type ? ` ${data.card.type} ` : ' '}卡
                    <span
                        className="notification-link"
                        onMouseEnter={() => setShowEffect(true)}
                        onMouseLeave={() => setShowEffect(false)}
                    >
                        {data.card?.name}
                    </span>
                </span>
            )}

            {/* Subtitle for Effect */}
            {showEffect && data.card && (
                <div className="notification-subtitle">
                    {data.card.effect}
                </div>
            )}
        </div>
    );
};

export default ActionNotification;
