# 自动化部署系统

## 概述

自动化 CI/CD 系统，确保每次代码修改都能安全地部署到服务器并通过测试。

## 工作流程

```
代码修改 → git commit → git push → 自动部署 → 验证测试 → 成功/回滚
```

## 功能特性

- ✅ **自动构建**：自动运行 `npm run build`
- ✅ **自动打包**：创建部署压缩包
- ✅ **自动备份**：部署前备份当前服务器状态
- ✅ **自动部署**：上传并部署到服务器
- ✅ **自动验证**：检查服务是否正常运行
- ✅ **自动回滚**：部署失败时自动恢复
- ✅ **彩色输出**：清晰的进度提示

## 快速开始

### 1. 安装 Git Hooks

```bash
npm run setup-hooks
```

这会安装 `pre-push` hook，在每次 `git push` 时自动触发部署。

### 2. 使用方式

**方式 A：通过 Git（推荐）**
```bash
# 修改代码后
git add .
git commit -m "你的提交信息"
git push  # 自动触发部署
```

**方式 B：手动部署**
```bash
npm run deploy
```

**方式 C：强制部署（跳过验证）**
```bash
npm run deploy:force
```

### 3. 检查服务状态

```bash
npm run check
```

### 4. 跳过自动部署

如果需要推送代码但不想部署：
```bash
git push --no-verify
```

## 部署流程详解

### 步骤 1：构建前端
```bash
npm run build
```
- 编译 React 应用
- 生成优化后的静态文件到 `dist/`

### 步骤 2：打包文件
- 创建 `deploy.zip`，包含：
  - `dist/` - 前端构建产物
  - `server/` - 后端代码

### 步骤 3：备份服务器
- 备份当前 `/var/www/game` 到 `/var/www/game.backup`
- 确保可以回滚

### 步骤 4：上传文件
- 通过 SFTP 上传 `deploy.zip` 到服务器

### 步骤 5：部署
```bash
# 在服务器执行
unzip deploy.zip
npm install --production
pm2 restart game
```

### 步骤 6：验证
- 检查 PM2 进程状态
- 检查端口监听
- HTTP 健康检查（200 OK）

### 步骤 7：测试
- 静态文件检查
- Socket.IO 端点测试

## 部署配置

### 服务器信息

在 `scripts/auto-deploy.js` 中配置：

```javascript
const config = {
  host: '120.26.212.80',
  port: 22,
  username: 'root',
  password: 'Game2026',  // 建议改用 SSH 密钥
};
```

### 环境变量（可选）

创建 `.env` 文件：
```env
DEPLOY_HOST=120.26.212.80
DEPLOY_PORT=3333
DEPLOY_USER=root
```

## 故障排查

### 问题 1：部署失败

**症状**：`git push` 被阻止，显示"部署失败"

**解决**：
1. 查看错误信息，定位问题
2. 修复问题后重新提交
3. 或使用 `git push --no-verify` 跳过部署

### 问题 2：服务未启动

**症状**：验证步骤失败

**解决**：
```bash
# SSH 登录服务器
ssh root@120.26.212.80

# 检查服务
pm2 list
pm2 logs game

# 手动重启
pm2 restart game
```

### 问题 3：回滚不工作

**症状**：部署失败但没有回滚

**解决**：
```bash
# SSH 登录服务器
ssh root@120.26.212.80

# 手动回滚
cd /var/www
rm -rf game
mv game.backup game
cd game/server
pm2 restart game
```

## 高级用法

### 自定义部署脚本

编辑 `scripts/auto-deploy.js`，可以：
- 添加更多测试
- 修改部署目录
- 添加通知（邮件、Slack 等）
- 集成其他工具

### 多环境部署

创建不同的部署脚本：
```bash
scripts/
├── auto-deploy.js          # 生产环境
├── auto-deploy-staging.js  # 测试环境
└── auto-deploy-dev.js      # 开发环境
```

### 添加测试

在 `auto-deploy.js` 的步骤 7 中添加：
```javascript
const testCmd = `
  cd /var/www/game
  npm test  # 如果有测试脚本
  curl -s http://127.0.0.1:3333/api/health
`;
```

## 最佳实践

1. **小步提交**：频繁提交小改动，便于定位问题
2. **写好提交信息**：清晰描述修改内容
3. **本地测试**：提交前先在本地测试
4. **监控日志**：部署后检查 `pm2 logs game`
5. **定期备份**：定期备份数据库（未来实施）

## NPM 脚本参考

```json
{
  "dev": "vite",                    // 本地开发
  "build": "vite build",            // 构建生产版本
  "preview": "vite preview",        // 预览构建结果
  "deploy": "node scripts/auto-deploy.js",        // 自动部署
  "deploy:force": "node scripts/step_by_step_deploy.js",  // 强制部署
  "check": "node scripts/quick_check.js",         // 检查服务器状态
  "setup-hooks": "node scripts/setup-git-hooks.js"  // 设置 Git Hooks
}
```

## 安全建议

> [!WARNING]
> **生产环境安全**
> - 不要将密码提交到 Git
> - 使用 SSH 密钥替代密码认证
> - 限制服务器 SSH 访问 IP

建议配置：
1. 使用 `.env` 文件存储敏感信息
2. 将 `.env` 添加到 `.gitignore`
3. 配置 SSH 密钥认证
4. 使用跳板机或 VPN

## 监控和通知（待实现）

未来可以集成：
- [ ] 钉钉/企业微信通知
- [ ] 邮件通知
- [ ] Slack 集成
- [ ] 部署历史记录
- [ ] 性能监控集成

## 相关文档

- [部署经验总结](./DEPLOYMENT.md)
- [项目重构计划](./brain/implementation_plan.md)
- [Git Hooks 文档](https://git-scm.com/docs/githooks)

---

**最后更新**: 2026-01-19  
**维护者**: 项目团队
