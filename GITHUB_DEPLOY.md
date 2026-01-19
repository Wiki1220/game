# 通过 GitHub 部署指南

## 步骤 1: 初始化 Git 仓库（如果还没有）

```bash
git init
git add .
git commit -m "Initial commit"
```

## 步骤 2: 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建一个新仓库（public 或 private 都可以）
3. 复制仓库地址（例如：`https://github.com/username/xiangqi-game.git`）

## 步骤 3: 推送代码到 GitHub

```bash
git remote add origin https://github.com/username/xiangqi-game.git
git branch -M main
git push -u origin main
```

## 步骤 4: 从 GitHub 部署到服务器

```bash
node scripts/deploy_from_github.js https://github.com/username/xiangqi-game.git
```

## 说明

- 如果仓库是 private，需要在服务器上配置 SSH 密钥或使用 Personal Access Token
- 脚本会自动：
  - 在服务器上安装 Git（如果未安装）
  - 克隆代码仓库
  - 安装依赖
  - 构建前端
  - 启动游戏

## 后续更新

当您需要更新游戏时，只需：

1. 本地修改代码
2. 提交并推送到 GitHub：
   ```bash
   git add .
   git commit -m "Update game"
   git push
   ```
3. 重新运行部署脚本

或者创建一个更新脚本在服务器上执行 `git pull` 和重启。
