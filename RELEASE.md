# CodeLinear 发布指南

## 🚀 快速发布

### 1. 设置环境变量

在命令行中设置你的 GitHub Personal Access Token：

```bash
# Windows CMD
set GITHUB_TOKEN=your_github_token_here

# Windows PowerShell
$env:GITHUB_TOKEN="your_github_token_here"

# 或者创建 .env 文件（不要提交到 git）
echo GITHUB_TOKEN=your_github_token_here > .env
```

### 2. 构建应用

```bash
npm run build:win
```

### 3. 发布到 GitHub

```bash
npm run quick-release
```

## 📋 发布方式

### 方式一：手动发布（推荐）

1. 构建应用：`npm run build:win`
2. 设置环境变量：`set GITHUB_TOKEN=your_token`
3. 快速发布：`npm run quick-release`

### 方式二：GitHub Actions 自动发布

1. 创建并推送标签：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions 会自动构建并发布

### 方式三：版本号自动递增

```bash
npm run version:patch  # 1.0.0 -> 1.0.1
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:major  # 1.0.0 -> 2.0.0
```

## 🔧 配置说明

### GitHub Token 权限

你的 GitHub Personal Access Token 需要以下权限：
- `repo` - 完整的仓库访问权限
- `write:packages` - 上传发布资源

### 仓库配置

配置文件 `update-config.json` 已经设置为：
- 仓库：`CoreMorrowTech/test44`
- API：`https://api.github.com/repos/CoreMorrowTech/test44/releases/latest`

## 📱 应用内更新检查

发布成功后，用户可以：

1. 在应用中点击侧边栏的下载图标
2. 应用会自动检查 GitHub Releases
3. 如果有新版本，会显示更新对话框
4. 用户可以直接下载或跳转到发布页面

## 🐛 故障排除

### Token 相关问题

- 确保 token 有正确的权限
- 检查 token 是否过期
- 确保环境变量设置正确

### 构建问题

- 确保运行了 `npm run build:win`
- 检查 `dist` 目录是否存在 exe 文件
- 确保文件名格式正确

### 网络问题

- 检查网络连接
- 确认 GitHub API 可访问
- 检查防火墙设置

## 📝 发布清单

发布前检查：

- [ ] 更新了版本号
- [ ] 运行了构建命令
- [ ] 设置了 GITHUB_TOKEN 环境变量
- [ ] 测试了应用功能
- [ ] 准备了发布说明

发布后验证：

- [ ] 检查 GitHub Releases 页面
- [ ] 下载并测试安装包
- [ ] 测试应用内更新检查功能
- [ ] 确认下载链接正常工作