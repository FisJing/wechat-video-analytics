# 发布到GitHub完整步骤指南

## 📋 发布前检查清单

### ✅ 已完成
- [x] 创建 `.gitignore` 文件（排除敏感信息）
- [x] 创建 `start.bat.example` 示例文件
- [x] 更新 `README.md`（适合开源）
- [x] 创建 `LICENSE` 文件（MIT许可证）

### 🔍 还需要手动检查的

#### 1. 检查代码中的敏感信息

在以下文件中检查是否有硬编码的敏感信息：
- [ ] `batch-capture.js` - 检查是否有IP地址、密钥等
- [ ] `web-server/server-stats.js` - 检查是否有本地路径
- [ ] `unified-starter.js` - 检查是否有本地路径
- [ ] 所有 `.bat` 文件 - 已被 `.gitignore` 排除，但确认不要上传

#### 2. 检查配置文件

确保以下配置文件**不要**包含真实数据：
- [x] `baidu-ocr.config.json` - 已被 `.gitignore` 排除
- [x] `baidu-ocr.config.example.json` - 示例文件，可以上传

#### 3. 清理临时文件

运行以下命令清理临时文件：
```bash
# 删除所有截图
del /Q *.png

# 删除临时文件
del /Q temp_*
del /Q video_*
del /Q *.flow
del /Q *.xml

# 删除测试文件（可选）
del /Q test-*.js
del /Q debug-*.js
```

## 🚀 发布步骤

### 步骤1：初始化Git仓库

```bash
# 在项目根目录执行
git init

# 添加所有文件（.gitignore会自动排除不需要的文件）
git add .

# 查看将要提交的文件
git status

# 确认无误后提交
git commit -m "Initial commit: 微信视频号数据抓取系统"
```

### 步骤2：在GitHub创建仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - Repository name: `wechat-video-stats`（或您喜欢的名字）
   - Description: `微信视频号数据自动抓取系统 - 支持批量抓取、Web界面、百度OCR识别`
   - 选择 Public（公开）或 Private（私有）
   - **不要**勾选 "Add a README file"（我们已经有了）
   - **不要**勾选 "Add .gitignore"（我们已经有了）
   - License: 选择 MIT（我们已经有了）

3. 点击 "Create repository"

### 步骤3：推送代码到GitHub

GitHub会显示推送命令，按照提示操作：

```bash
# 添加远程仓库（替换为您的GitHub用户名）
git remote add origin https://github.com/您的用户名/wechat-video-stats.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

### 步骤4：验证发布

1. 访问您的仓库页面：`https://github.com/您的用户名/wechat-video-stats`
2. 检查以下内容：
   - [ ] README.md 是否正确显示
   - [ ] LICENSE 文件是否存在
   - [ ] 是否没有敏感信息（IP地址、密钥等）
   - [ ] 文件结构是否正确

## ⚠️ 重要提示

### 不要上传的文件

以下文件**绝对不要**上传到GitHub：
- ❌ `baidu-ocr.config.json` - 包含API密钥
- ❌ `output/` 目录 - 包含抓取的数据
- ❌ `*.png` 文件 - 截图文件
- ❌ `*.bat` 文件 - 包含本地路径（除 `start.bat.example`）
- ❌ `node_modules/` - 依赖文件（用户自己安装）
- ❌ `*.traineddata` - OCR训练数据（文件太大）

这些文件已经被 `.gitignore` 排除，Git会自动忽略它们。

## 🎉 完成！

现在您的项目已经准备好发布到GitHub了！

记得：
1. 在README中更新您的GitHub用户名
2. 在LICENSE中更新您的名字
3. 定期维护和更新项目

祝您的项目获得更多Star！⭐
