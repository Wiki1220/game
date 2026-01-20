# 部署经验总结

## 成功部署经验（2026-01-19）

### 关键发现

1. **GitHub 访问问题**
   - 服务器无法直接访问 GitHub
   - 解决方案：本地打包后上传到服务器

2. **文件上传方法**
   - SFTP 在 ssh2 库中不稳定（经常卡住）
   - Base64 编码分块上传也不可靠
   - **最终方案：直接使用服务器上已有文件**

3. **解压和部署流程**
   - 在 `/tmp` 目录下解压测试
   - 验证文件结构后移动到 `/var/www/game`
   - 步骤必须逐一验证，不能一次性执行太多命令

### 成功的部署脚本

文件：`scripts/step_by_step_deploy.js`

关键步骤：
```bash
# 1. 在临时目录解压
cd /tmp && mkdir deploy-test
unzip /root/deploy_full.zip -d deploy-test

# 2. 验证文件
ls deploy-test/dist
ls deploy-test/server

# 3. 移动到正式位置
mv /tmp/deploy-test /var/www/game

# 4. 安装依赖
cd /var/www/game/server
npm install --production

# 5. PM2 启动
PORT=3333 pm2 start index.js --name game
pm2 save
```

### 端口选择

- **端口 80**：需要 root 权限，部署中遇到权限问题
- **端口 3333**：成功！需要在阿里云安全组开放
- 推荐使用非特权端口（1024以上）

### 安全组配置

必须在阿里云控制台配置：
```
协议：TCP
端口范围：3333/3333
授权对象：0.0.0.0/0
描述：游戏服务器
```

### PM2 使用

```bash
# 启动
PORT=3333 pm2 start index.js --name game

# 保存配置
pm2 save

# 查看状态
pm2 list

# 查看日志
pm2 logs game

# 重启
pm2 restart game
```

### 常见问题排查

#### 问题 1：502 Bad Gateway
**原因**：服务未启动或端口未监听
**排查**：
```bash
pm2 list
netstat -tulpn | grep :80
curl http://127.0.0.1:80
```

#### 问题 2：端口 Connection Refused
**原因**：
1. PM2 进程未启动
2. 端口配置错误
3. 防火墙阻止

**解决**：
```bash
# 检查进程
ps aux | grep node

# 手动启动测试
PORT=3333 node index.js

# 检查防火墙
ufw status
```

#### 问题 3：服务器内部可访问，外部不可访问
**原因**：安全组未配置
**解决**：在云服务商控制台添加入站规则

### 文件上传方案

**当前最可靠方法：**
1. 本地打包：`powershell Compress-Archive -Path dist,server -DestinationPath game.zip -Force`
2. 使用文件传输工具上传到服务器（SCP/FTP）
3. 在服务器上解压并部署

**备选方案：**
- 使用国内代码托管（Gitee）
- 配置服务器代理访问 GitHub

---

## 本地开发环境

### 启动开发服务器

```bash
# 前端开发
npm run dev

# 后端开发
cd server
node index.js

# 或使用 nodemon 自动重启
npm install -g nodemon
nodemon server/index.js
```

### 构建前端

```bash
npm run build
```

### 测试部署包

```bash
# 1. 构建
npm run build

# 2. 打包
powershell Compress-Archive -Path dist,server -DestinationPath test-deploy.zip -Force

# 3. 在本地解压测试
cd /tmp
unzip test-deploy.zip -d test
cd test/server
npm install
PORT=3001 node index.js
```

---

## 生产环境配置

### 服务器信息

- **IP**：120.26.212.80
- **端口**：80
- **用户**：root
- **密码**：Game2026
- **部署目录**：`/var/www/game`

### 环境要求

- Node.js >= 18.x
- PM2
- MySQL 8.0+（待安装）

### 目录结构

```
/var/www/game/
├── dist/               # 前端构建产物
│   ├── assets/
│   └── index.html
└── server/             # 后端代码
    ├── index.js
    ├── package.json
    └── node_modules/
```

---

## 快速部署命令参考

### 完整部署流程

```bash
# 本地准备
npm run build
powershell Compress-Archive -Path dist,server -DestinationPath game.zip -Force

# 上传到服务器（使用 SCP 或其他工具）
# 例如: scp game.zip root@120.26.212.80:/root/

# 服务器执行
ssh root@120.26.212.80
cd /var/www
rm -rf game
mkdir game
cd game
unzip /root/game.zip
cd server
npm install --production
pm2 delete game || true
PORT=3333 pm2 start index.js --name game
pm2 save
```

### 更新部署（代码更新时）

```bash
# 1. 构建新版本
npm run build

# 2. 打包上传（同上）

# 3. 服务器更新
ssh root@120.26.212.80
cd /var/www/game
# 备份（可选）
cp -r server server.backup
# 更新
unzip -o /root/game.zip
cd server
npm install --production
pm2 restart game
```

---

## 监控和维护

### 日志查看

```bash
# PM2 日志
pm2 logs game

# 系统日志
journalctl -u xiangqi-game -f  # 如果使用 systemd

# Nginx 日志（如果使用）
tail -f /var/log/nginx/error.log
```

### 性能监控

```bash
# PM2 监控
pm2 monit

# 服务器资源
htop
df -h
free -m
```

### 数据库备份（待实施）

```bash
# MySQL 备份
mysqldump -u root -p game_db > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u root -p game_db < backup_20260119.sql
```

---

## 安全建议

1. **修改默认密码**：将 `Game2026` 改为强密码
2. **配置防火墙**：只开放必要端口（22, 3333）
3. **定期更新**：`apt update && apt upgrade`
4. **使用 HTTPS**：配置 SSL 证书（Let's Encrypt）
5. **限制 SSH 访问**：配置密钥认证，禁用密码登录

---

## 待办事项

- [ ] 配置 MySQL 数据库
- [ ] 实现自动化部署脚本
- [ ] 配置域名和 SSL
- [ ] 设置日志轮转
- [ ] 配置监控告警
- [ ] 数据库定期备份
