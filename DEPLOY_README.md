# 部署说明

## 快速开始

您的项目已经有 Git 仓库。请按以下步骤操作：

### 方案 A: 如果您已有 GitHub 仓库

直接运行：
```bash
# 先推送代码
git add .
git commit -m "Ready for deployment"
git push

# 然后部署到服务器（替换为您的仓库地址）
node scripts/deploy_from_github.js https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### 方案 B: 如果还没有 GitHub 仓库

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 仓库名称：xiangqi-game（或任意名称）
   - 设为 Public（这样服务器可以直接拉取，无需配置密钥）
   - 点击 "Create repository"

2. **推送代码**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/xiangqi-game.git
   git add .
   git commit -m "Initial commit for deployment"
   git push -u origin main
   ```

3. **部署到服务器**
   ```bash
   node scripts/deploy_from_github.js https://github.com/YOUR_USERNAME/xiangqi-game.git
   ```

## 注意事项

- **Public 仓库**：服务器可以直接 clone，无需配置
- **Private 仓库**：需要先在服务器配置 GitHub Personal Access Token 或 SSH 密钥

## 部署过程

脚本会自动：
1. 在服务器上安装 Git
2. 克隆您的代码仓库
3. 安装前端依赖并构建（`npm install && npm run build`）
4. 安装后端依赖（`cd server && npm install --production`）
5. 启动游戏（`pm2 start index.js`）

整个过程大约需要 2-3 分钟。

## 下一步

请告诉我：
1. 您是否已有 GitHub 仓库？如果有，请提供仓库地址
2. 如果没有，我可以帮您创建（您需要提供 GitHub 用户名）
