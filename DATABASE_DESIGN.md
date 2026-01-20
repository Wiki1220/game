# 数据库与日志系统设计文档

**版本**: v1.1  
**更新日期**: 2026-01-20  
**目的**: 为数据仓库提供完整的游戏数据采集方案

---

## 1. 设计目标

- **数据完整性**: 记录所有关键用户行为和游戏事件
- **可追溯性**: 详细对局日志可完全还原对局过程
- **ETL 友好**: 便于导出到数据仓库进行分析
- **性能平衡**: 日志写入不影响游戏体验

---

## 2. 数据库表设计

### 2.1 核心业务表

#### `users` - 正式用户表 (已存在，需扩展)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | INT PK | 用户ID |
| username | VARCHAR(50) | 登录名 |
| nickname | VARCHAR(50) | 显示昵称 |
| points | INT | 点数余额 |
| total_points_earned | INT | 历史总获得点数 |
| total_points_spent | INT | 历史总消费点数 |
| ... | | (其他已有字段) |

#### `guests` - 游客表 (已存在)
> 保持不变

---

### 2.2 卡牌数据表

#### `cards` - 卡牌主表
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | INT PK | 卡牌ID (自增) |
| card_code | VARCHAR(50) | 卡牌唯一编码 (如 `summon_roadblock`) |
| name_cn | VARCHAR(50) | 中文名称 |
| name_en | VARCHAR(50) | 英文名称 |
| description_cn | TEXT | 中文效果描述 |
| description_en | TEXT | 英文效果描述 |
| type | ENUM | 类型: `SPEED`, `TRAP`, `ACTION`, `RULE`, `SUMMON`, `EQUIP` |
| tier | ENUM | 稀有度: `SILVER(白银)`, `GOLD(黄金)`, `PRISMATIC(彩色)` |
| effect_id | VARCHAR(50) | 效果标识符 (如 `SUMMON_ROADBLOCK`) |
| needs_target | BOOLEAN | 是否需要选择目标 |
| target_type | VARCHAR(30) | 目标类型: `self`, `enemy`, `empty`, `piece_type` |
| target_piece_type | VARCHAR(20) | 限定棋子类型 (如 `chariot`, `soldier`) |
| is_active | BOOLEAN | 是否启用 (默认true) |
| is_implemented | BOOLEAN | 是否已实现 |
| icon_url | VARCHAR(255) | 图标路径 |
| effect_data | JSON | 效果参数 (机器可读) |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**type 枚举值** (来自现有 `CARD_TYPES`):
| 值 | 中文 | 说明 |
|---|-----|-----|
| `SPEED` | 速攻 | 快速响应 |
| `TRAP` | 陷阱 | 条件触发 |
| `ACTION` | 行动 | 主动使用 |
| `RULE` | 永续 | 持续效果 |
| `SUMMON` | 召唤 | 召唤棋子 |
| `EQUIP` | 装备 | 装备到棋子 |

**tier 枚举值** (来自现有 `CARD_TIERS`):
| 值 | 中文 |
|---|-----|
| `SILVER` | 白银 |
| `GOLD` | 黄金 |
| `PRISMATIC` | 彩色 |

#### `card_effects` - 卡牌效果历史表 (版本控制)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | INT PK | 记录ID |
| card_id | INT FK | 关联卡牌 |
| version | INT | 版本号 |
| effect_data | JSON | 该版本的效果数据 |
| change_note | TEXT | 变更说明 |
| effective_from | DATETIME | 生效时间 |
| effective_to | DATETIME | 失效时间 (NULL=当前) |

---

### 2.3 对局相关表

#### `game_records` - 对局历史记录表 (用户可查询)
> 保留现有结构，用于用户个人战绩查询

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | INT PK | 对局ID |
| room_id | VARCHAR(20) | 房间ID |
| game_log_id | VARCHAR(36) | 关联详细日志的UUID |
| red_player_id | INT | 红方用户ID |
| red_username | VARCHAR(50) | 红方用户名(快照) |
| black_player_id | INT | 黑方用户ID |
| black_username | VARCHAR(50) | 黑方用户名(快照) |
| winner | ENUM | `red`, `black`, `draw`, `none` |
| end_reason | ENUM | 结束原因 |
| total_turns | INT | 总回合数 |
| duration_seconds | INT | 对局时长(秒) |
| game_mode | ENUM | `ranked`, `casual`, `match`, `custom`, `local` |
| started_at | DATETIME | 开始时间 |
| ended_at | DATETIME | 结束时间 |
| created_at | DATETIME | 记录创建时间 |

---

### 2.4 点数/经济系统表

#### `points_transactions` - 点数交易流水表
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | BIGINT PK | 交易ID |
| user_id | INT FK | 用户ID |
| user_type | ENUM | `user` / `guest` |
| transaction_type | ENUM | 交易类型 (见下方枚举) |
| amount | INT | 变动数量 (正=获得, 负=消费) |
| balance_before | INT | 变动前余额 |
| balance_after | INT | 变动后余额 |
| reference_type | VARCHAR(50) | 关联类型 (`game`, `shop`, `admin`, `system`) |
| reference_id | VARCHAR(50) | 关联ID |
| description | VARCHAR(255) | 描述 |
| metadata | JSON | 额外数据 |
| created_at | DATETIME(3) | 交易时间 |

**transaction_type 枚举值**:
| 值 | 说明 |
|---|-----|
| `game_win` | 对局胜利奖励 |
| `game_loss` | 对局失败扣除 |
| `game_draw` | 平局结算 |
| `daily_login` | 每日登录奖励 |
| `achievement` | 成就奖励 |
| `purchase_avatar` | 购买头像 |
| `purchase_emote` | 购买表情 |
| `admin_grant` | 管理员发放 |
| `admin_deduct` | 管理员扣除 |
| `refund` | 退款 |
| `convert_bonus` | 游客转正奖励 |

---

## 3. 日志系统设计

### 3.1 日志分类与存储

| 日志类型 | 存储方式 | 存储位置 | 保留时间 | 用途 |
|---------|---------|---------|---------|-----|
| **对局日志** | JSON 文件 | 云端 | 永久 | 回放/分析/还原 |
| **用户行为日志** | MySQL | 数据库 | 90天 | 行为分析 |
| **点数流水** | MySQL | 数据库 | 永久 | 财务审计 |
| **错误日志** | 文件 | 云端 | 30天 | 调试 |
| **访问日志** | 文件 | 云端 | 7天 | 运维 |

**日志级别**: 生产环境默认记录 `INFO` 及以上

---

### 3.2 用户行为日志表

#### `user_action_logs` - 用户行为日志
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | BIGINT PK | 日志ID |
| user_id | INT | 用户ID |
| user_type | ENUM | `user` / `guest` |
| session_id | VARCHAR(36) | 会话ID |
| action | VARCHAR(50) | 行为类型 |
| action_category | VARCHAR(30) | 行为分类 |
| target_type | VARCHAR(50) | 目标类型 |
| target_id | VARCHAR(50) | 目标ID |
| metadata | JSON | 额外数据 |
| ip_address | VARCHAR(45) | IP地址 |
| user_agent | VARCHAR(500) | 浏览器UA |
| device_type | ENUM | `desktop`, `mobile`, `tablet` |
| created_at | DATETIME(3) | 时间戳 |

**action 枚举值分类**:

| 分类 | action 值 | 说明 |
|-----|----------|-----|
| **认证** | `login`, `logout`, `register`, `guest_login`, `guest_convert` | 登录相关 |
| **大厅** | `enter_lobby`, `leave_lobby`, `refresh_rooms` | 大厅操作 |
| **房间** | `create_room`, `join_room`, `leave_room`, `toggle_ready`, `kick_player` | 房间操作 |
| **匹配** | `start_match`, `cancel_match`, `match_found`, `match_timeout` | 匹配操作 |
| **对局** | `game_start`, `game_move`, `game_card_draw`, `game_card_use`, `game_surrender`, `game_end` | 对局操作 |
| **社交** | `send_emote`, `send_chat`, `add_friend`, `remove_friend` | 社交操作 |
| **商城** | `view_shop`, `purchase_item`, `use_item` | 商城操作 |
| **设置** | `change_avatar`, `change_nickname`, `change_settings` | 设置操作 |

---

### 3.3 错误日志表

#### `error_logs` - 错误日志
| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | BIGINT PK | 日志ID |
| error_code | VARCHAR(50) | 错误码 |
| error_type | ENUM | `client`, `server`, `database`, `network`, `game_logic`, `unknown` |
| severity | ENUM | `info`, `warn`, `error`, `fatal` |
| message | TEXT | 错误信息 |
| stack_trace | TEXT | 堆栈跟踪 |
| user_id | INT | 关联用户 (可空) |
| session_id | VARCHAR(36) | 会话ID |
| game_id | VARCHAR(36) | 关联对局ID (可空) |
| request_path | VARCHAR(255) | 请求路径 |
| request_method | VARCHAR(10) | HTTP方法 |
| request_body | JSON | 请求体 |
| response_status | INT | 响应状态码 |
| ip_address | VARCHAR(45) | IP |
| user_agent | VARCHAR(500) | UA |
| server_version | VARCHAR(20) | 服务器版本 |
| metadata | JSON | 额外上下文 |
| created_at | DATETIME(3) | 时间戳 |

---

### 3.4 对局详细日志 (JSON 文件 - 云端存储)

**设计原则**: 日志必须足够详细，**仅凭日志即可完全还原整局对局过程**。

**路径格式**: `logs/games/{YYYY}/{MM}/{DD}/{game_log_id}.json`

**完整结构**:
```json
{
  "log_version": "1.0",
  "game_log_id": "550e8400-e29b-41d4-a716-446655440000",
  "game_record_id": 12345,
  "server_version": "0.3.3",
  
  "===== 对局基本信息 =====": "",
  "room": {
    "id": "ROOM_ABC123",
    "name": "测试房间",
    "type": "public",
    "mode": "casual",
    "created_at": "2026-01-20T21:00:00.000Z"
  },
  
  "===== 玩家信息 =====": "",
  "players": {
    "red": {
      "user_id": 1,
      "user_type": "user",
      "username": "player1",
      "nickname": "大侠",
      "points_before": 1000,
      "points_after": 1050,
      "points_change": 50,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "device_type": "desktop",
      "join_time": "2026-01-20T21:00:05.000Z"
    },
    "black": {
      "user_id": null,
      "user_type": "guest",
      "guest_id": "Guest_12345",
      "username": "Guest_12345",
      "nickname": "Guest_12345",
      "points_before": 500,
      "points_after": 450,
      "points_change": -50,
      "ip_address": "192.168.1.101",
      "join_time": "2026-01-20T21:00:08.000Z"
    }
  },
  
  "===== 时间戳 =====": "",
  "timeline": {
    "room_created": "2026-01-20T21:00:00.000Z",
    "players_ready": "2026-01-20T21:00:10.000Z",
    "game_started": "2026-01-20T21:00:12.000Z",
    "game_ended": "2026-01-20T21:15:30.500Z",
    "total_duration_ms": 918500
  },
  
  "===== 对局结果 =====": "",
  "result": {
    "winner": "red",
    "loser": "black",
    "end_reason": "checkmate",
    "end_reason_detail": "黑方被将死",
    "total_turns": 45,
    "red_turns": 23,
    "black_turns": 22
  },
  
  "===== 初始状态 =====": "",
  "initial_state": {
    "board": [
      {"id": "r_chariot_1", "type": "chariot", "player": "red", "row": 0, "col": 0},
      {"id": "r_horse_1", "type": "horse", "player": "red", "row": 0, "col": 1},
      "... 全部32个棋子"
    ],
    "random_seed": 1705766412345,
    "first_turn": "red"
  },
  
  "===== 事件流 (核心) =====": "",
  "events": [
    {
      "seq": 1,
      "event_type": "game_start",
      "timestamp": "2026-01-20T21:00:12.000Z",
      "data": {}
    },
    {
      "seq": 2,
      "event_type": "turn_start",
      "timestamp": "2026-01-20T21:00:12.100Z",
      "data": {
        "turn": "red",
        "turn_number": 1,
        "time_remaining_ms": 300000
      }
    },
    {
      "seq": 3,
      "event_type": "draft_options_generated",
      "timestamp": "2026-01-20T21:00:12.150Z",
      "data": {
        "player": "red",
        "options": [
          {"card_id": 5, "card_code": "action_nano", "name": "纳米激素", "tier": "SILVER", "type": "ACTION"},
          {"card_id": 12, "card_code": "equip_dress", "name": "洋装", "tier": "SILVER", "type": "EQUIP"},
          {"card_id": 8, "card_code": "summon_roadblock", "name": "路障", "tier": "GOLD", "type": "SUMMON"}
        ],
        "draft_tier": "SILVER"
      }
    },
    {
      "seq": 4,
      "event_type": "card_drafted",
      "timestamp": "2026-01-20T21:00:15.500Z",
      "data": {
        "player": "red",
        "selected_card": {"card_id": 5, "card_code": "action_nano", "name": "纳米激素"},
        "discarded_cards": [
          {"card_id": 12, "card_code": "equip_dress", "name": "洋装"},
          {"card_id": 8, "card_code": "summon_roadblock", "name": "路障"}
        ],
        "time_spent_ms": 3400,
        "hand_after": [
          {"card_id": 5, "card_code": "action_nano", "uid": "card_001"}
        ]
      }
    },
    {
      "seq": 5,
      "event_type": "piece_moved",
      "timestamp": "2026-01-20T21:00:20.000Z",
      "data": {
        "player": "red",
        "piece": {"id": "r_cannon_1", "type": "cannon"},
        "from": {"row": 2, "col": 1},
        "to": {"row": 2, "col": 4},
        "captured": null,
        "is_check": false,
        "time_spent_ms": 4500,
        "board_state_after": "... 或 hash"
      }
    },
    {
      "seq": 6,
      "event_type": "piece_captured",
      "timestamp": "2026-01-20T21:01:30.000Z",
      "data": {
        "player": "red",
        "attacker": {"id": "r_chariot_1", "type": "chariot"},
        "captured": {"id": "b_horse_2", "type": "horse", "player": "black"},
        "position": {"row": 5, "col": 7}
      }
    },
    {
      "seq": 7,
      "event_type": "card_played",
      "timestamp": "2026-01-20T21:02:00.000Z",
      "data": {
        "player": "red",
        "card": {"card_id": 5, "card_code": "action_nano", "name": "纳米激素", "uid": "card_001"},
        "target": {"piece_id": "r_horse_1", "type": "horse"},
        "effect_result": {
          "random_moves": [
            {"from": {"row": 0, "col": 1}, "to": {"row": 2, "col": 2}},
            {"from": {"row": 2, "col": 2}, "to": {"row": 4, "col": 3}}
          ]
        },
        "hand_after": []
      }
    },
    {
      "seq": 8,
      "event_type": "turn_end",
      "timestamp": "2026-01-20T21:02:05.000Z",
      "data": {
        "turn": "red",
        "turn_number": 1,
        "time_used_ms": 53000,
        "time_remaining_ms": 247000
      }
    },
    {
      "seq": 100,
      "event_type": "player_disconnected",
      "timestamp": "2026-01-20T21:10:00.000Z",
      "data": {
        "player": "black",
        "reason": "network_error",
        "reconnect_deadline": "2026-01-20T21:11:00.000Z"
      }
    },
    {
      "seq": 101,
      "event_type": "player_reconnected",
      "timestamp": "2026-01-20T21:10:30.000Z",
      "data": {
        "player": "black",
        "away_duration_ms": 30000
      }
    },
    {
      "seq": 150,
      "event_type": "player_surrendered",
      "timestamp": "2026-01-20T21:14:00.000Z",
      "data": {
        "player": "black",
        "turn_number": 40
      }
    },
    {
      "seq": 200,
      "event_type": "checkmate",
      "timestamp": "2026-01-20T21:15:30.000Z",
      "data": {
        "winner": "red",
        "loser": "black",
        "checking_pieces": ["r_chariot_1", "r_cannon_2"]
      }
    },
    {
      "seq": 201,
      "event_type": "game_end",
      "timestamp": "2026-01-20T21:15:30.500Z",
      "data": {
        "reason": "checkmate",
        "winner": "red",
        "points_awarded": {"red": 50, "black": -50}
      }
    }
  ],
  
  "===== 最终状态 =====": "",
  "final_state": {
    "board": ["... 剩余棋子"],
    "red_hand": [],
    "black_hand": [{"card_id": 3, "card_code": "xxx", "uid": "card_xyz"}],
    "active_rules": [
      {"card_id": 10, "card_code": "rule_restrict", "name": "限行", "activated_at": "..."}
    ],
    "active_buffs": [
      {"piece_id": "r_soldier_3", "effect_id": "EQUIP_DRESS", "name": "洋装"}
    ]
  },
  
  "===== 统计摘要 =====": "",
  "statistics": {
    "red": {
      "pieces_captured": 8,
      "pieces_lost": 5,
      "cards_drawn": 12,
      "cards_played": 10,
      "total_think_time_ms": 180000,
      "avg_think_time_ms": 7826,
      "checks_given": 5
    },
    "black": {
      "pieces_captured": 5,
      "pieces_lost": 8,
      "cards_drawn": 11,
      "cards_played": 8,
      "total_think_time_ms": 150000,
      "avg_think_time_ms": 6818,
      "checks_given": 2
    }
  },
  
  "===== 异常事件 =====": "",
  "anomalies": [
    {
      "type": "disconnection",
      "player": "black",
      "timestamp": "2026-01-20T21:10:00.000Z",
      "duration_ms": 30000,
      "resolved": true
    }
  ]
}
```

**event_type 完整枚举**:

| 事件类型 | 说明 |
|---------|-----|
| `game_start` | 对局开始 |
| `game_end` | 对局结束 |
| `turn_start` | 回合开始 |
| `turn_end` | 回合结束 |
| `draft_options_generated` | 抽牌选项生成 (含未选卡牌) |
| `card_drafted` | 选择卡牌 (含放弃的卡牌) |
| `draft_skipped` | 跳过抽牌 (手满) |
| `piece_moved` | 棋子移动 |
| `piece_captured` | 棋子被吃 |
| `card_played` | 使用卡牌 |
| `card_effect_resolved` | 卡牌效果结算 |
| `rule_activated` | 永续规则生效 |
| `rule_expired` | 永续规则失效 |
| `buff_applied` | 装备/效果附加 |
| `buff_removed` | 装备/效果移除 |
| `check` | 将军 |
| `checkmate` | 将死 |
| `stalemate` | 困毙 |
| `player_surrendered` | 玩家投降 |
| `player_disconnected` | 玩家断线 |
| `player_reconnected` | 玩家重连 |
| `player_timeout` | 玩家超时 |
| `game_error` | 游戏逻辑错误 |
| `game_aborted` | 对局异常中止 |

---

## 4. 数据流向图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   客户端    │ ──► │   服务端    │ ──► │   MySQL     │
│  (浏览器)   │     │  (Node.js)  │     │  (主数据库)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  云端存储    │
                   │ (JSON日志)  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  数据仓库    │
                   │  (ETL导入)  │
                   └─────────────┘
```

---

## 5. 索引设计

```sql
-- 用户行为日志
CREATE INDEX idx_user_action_user ON user_action_logs(user_id, created_at);
CREATE INDEX idx_user_action_action ON user_action_logs(action, created_at);
CREATE INDEX idx_user_action_session ON user_action_logs(session_id);

-- 点数流水
CREATE INDEX idx_points_user ON points_transactions(user_id, created_at);
CREATE INDEX idx_points_type ON points_transactions(transaction_type, created_at);

-- 错误日志
CREATE INDEX idx_error_severity ON error_logs(severity, created_at);
CREATE INDEX idx_error_user ON error_logs(user_id, created_at);
CREATE INDEX idx_error_game ON error_logs(game_id, created_at);

-- 卡牌表
CREATE INDEX idx_card_code ON cards(card_code);
CREATE INDEX idx_card_type ON cards(type);
CREATE INDEX idx_card_tier ON cards(tier);
```

---

## 6. 数据保留与清理策略

| 数据类型 | 保留策略 | 清理方式 |
|---------|---------|---------|
| 对局日志 (JSON) | 永久 | 定期迁移到冷存储 |
| 用户行为日志 | 90天热数据 | 定期清理并归档 |
| 对局记录 | 永久 | 无需清理 |
| 点数流水 | 永久 | 无需清理 |
| 错误日志 | 30天 | 定期清理 |
| 卡牌数据 | 永久 | 版本控制，不删除 |

---

## 7. 实现优先级

| 优先级 | 模块 | 说明 |
|-------|-----|-----|
| **P0** | cards 表 | 卡牌基础数据，从 cardDefs.js 同步 |
| **P0** | points_transactions 表 | 点数流水，对局结算时写入 |
| **P0** | 对局 JSON 日志 | 每局结束时生成完整日志 |
| **P1** | user_action_logs 表 | 关键用户行为记录 |
| **P1** | error_logs 表 | 错误追踪 |
| **P2** | User 表扩展 | 添加 total_points_earned/spent |

---

## 8. 确认事项

- [x] 卡牌类型: 使用现有 CARD_TYPES (SPEED/TRAP/ACTION/RULE/SUMMON/EQUIP)
- [x] 卡牌稀有度: 使用现有 CARD_TIERS (SILVER/GOLD/PRISMATIC)
- [x] 无法力消耗字段
- [x] 日志存储云端，定期清理
- [x] 不需要立即脱敏 (密码已 hash 存储)
- [x] 日志级别 INFO 及以上
- [x] 对局日志详细到可还原 (含未选卡牌、断线、投降、错误等)
- [x] 不需要 game_moves 表，用 JSON 日志替代

---

确认后开始实现。
