# 部署问题总结与解决方案

## 当前状况

服务器 `120.26.212.80` 访问出现 **502 Bad Gateway** 错误。

### 已确认的事实

1. ✅ **代码已成功推送到 GitHub**：`github.com/Wiki1220/-----.git`
2. ✅ **Git clone 在服务器上成功**：可以从 GitHub 拉取代码
3. ✅ **目录结构正确**：`/var/www/game` 存在
4. ❌ **服务未启动**：端口 80 显示 "Connection refused"
5. ❌ **PM2 进程列表为空**：PM2 启动失败
6. ❌ **systemd 服务也未成功**：服务创建但启动失败

## 可能的问题原因

1. **依赖未安装**：`npm install` 可能失败或不完整
2. **代码错误**：`server/index.js` 可能有语法错误
3. **权限问题**：端口 80 需要 root 权限
4. **路径问题**：工作目录可能不正确

## 建议的解决方案

###方案 1: 使用端口 3000（避免权限问题）

修改部署使用非特权端口：
```bash
node scripts/deploy_port_3000.js
```

访问地址变为：`http://120.26.212.80:3000`

### 方案 2: 完全重新部署（推荐）

运行全新的部署脚本，包含完整的错误检查：
```bash
node scripts/clean_redeploy.js
```

### 方案 3: 手动SSH诊断

如果您熟悉Linux，可以直接SSH到服务器：
```bash
ssh root@120.26.212.80
cd /var/www/game/server
npm install
PORT=80 node index.js
```
查看具体错误信息

## 下一步行动

请告知您希望采用哪个方案，或者如果您能提供服务器的具体错误日志会更有帮助。
