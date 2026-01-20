import React, { useState } from 'react';
import './SettingsModal.css';

const RULES_DATA = [
    {
        title: "🎯 基础规则",
        content: [
            "获胜条件: 吃掉对方的“将/帅”。",
            "基本走发: 遵循中国象棋标准规则。",
            "思考时间: 每回合 60 秒。超时自动跳过当前回合。"
        ]
    },
    {
        title: "🃏 卡牌系统",
        content: [
            "选牌阶段: 回合开始时 3选1。手牌上限 3 张。",
            "✦ 通常 (Normal): 使用后不消耗回合，可继续行棋。",
            "★ 行动 (Action): 强力卡牌，使用后立即结束回合。",
            "⚔ 速攻: 仅在当前回合生效的临时卡。",
            "▼ 陷阱: 隐蔽布置，敌方触发时生效。",
            "∞ 永续: 全局规则改变，场上仅限一张。",
            "◆ 召唤: 放置障碍或辅助单位 (场上上限2个)。"
        ]
    },
    {
        title: "⚠️ 特殊机制",
        content: [
            "召唤轮替: 当召唤第3个单位时，最早的召唤物自动销毁。",
            "炮架自毁: 炮利用召唤物做炮架吃子后，自身也会销毁。",
            "稀有度同步: 对手选牌的稀有度决定你下回合选牌的稀有度。"
        ]
    }
];

const SettingsModal = ({ onClose, onSurrender, onQuit, initialView = 'MENU' }) => {
    const [view, setView] = useState(initialView);

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className={`settings-modal ${view === 'RULES' ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
                {view === 'MENU' ? (
                    <>
                        <h3>游戏设置</h3>
                        <button className="settings-btn rules" onClick={() => setView('RULES')}>
                            📜 规则介绍
                        </button>

                        {onSurrender && (
                            <button className="settings-btn surrender" onClick={onSurrender}>
                                🏳️ 投降
                            </button>
                        )}

                        {onQuit && (
                            <button className="settings-btn quit" onClick={onQuit}>
                                🚪 退出游戏
                            </button>
                        )}

                        <button className="settings-btn close" onClick={onClose}>
                            关闭
                        </button>
                    </>
                ) : (
                    <>
                        <h3>规则说明</h3>
                        <div className="rules-content">
                            {RULES_DATA.map((section, i) => (
                                <div key={i} className="rule-section">
                                    <h4>{section.title}</h4>
                                    <ul>
                                        {section.content.map((line, j) => (
                                            <li key={j}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <button className="settings-btn close" onClick={() => initialView === 'RULES' ? onClose() : setView('MENU')}>
                            {initialView === 'RULES' ? '关闭' : '返回'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
