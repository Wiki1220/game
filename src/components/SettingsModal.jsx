import React, { useState } from 'react';
import './SettingsModal.css';

const RULES_TEXT = `
## 游戏规则介绍

**1. 基本玩法**
本游戏基于中国象棋规则，融合了卡牌构建(Roguelike)元素。
- **胜利条件**：吃掉对方的“将/帅”。
- **回合制**：双方轮流行动。每个回合你可以**使用卡牌**或**移动棋子**。

**2. 独特的卡牌系统**
- **锦囊（手牌）**：每回合你会有3张手牌上限。
- **阶段**：
  1. **抽卡阶段**：回合开始时获得新的战术卡。
  2. **出牌阶段**：你可以打出任意数量的卡牌来增强棋子、改变地形或布置陷阱。
  3. **移动阶段**：打完牌后，你必须移动一个棋子（除非卡牌效果跳过了移动）。

**3. 对局记录**
所有行动都会被记录在右侧的“战况”中，你可以随时查看。

**4. 计时**
每方有10分钟思考时间，超时判负。

**特殊说明**：部分卡牌（如“践踏”、“飞行”）会改变基础象棋规则，请留意卡牌描述。
`;

const SettingsModal = ({ onClose, onSurrender, onQuit }) => {
    const [view, setView] = useState('MENU'); // MENU | RULES

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                {view === 'MENU' ? (
                    <>
                        <h3>游戏设置</h3>
                        <button className="settings-btn" onClick={() => setView('RULES')}>
                            📜 规则介绍
                        </button>
                        <button className="settings-btn surrender" onClick={onSurrender}>
                            🏳️ 投降
                        </button>
                        <button className="settings-btn quit" onClick={onQuit}>
                            🚪 退出游戏
                        </button>
                        <button className="settings-btn close" onClick={onClose}>
                            关闭
                        </button>
                    </>
                ) : (
                    <>
                        <h3>规则说明</h3>
                        <div className="rules-content">
                            {RULES_TEXT.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </div>
                        <button className="settings-btn close" onClick={() => setView('MENU')}>
                            返回
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
