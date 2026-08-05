# 微信视频号数据抓取系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![ADB](https://img.shields.io/badge/ADB-automation-orange.svg)](https://developer.android.com/studio)
[![Baidu OCR](https://img.shields.io/badge/Baidu_OCR-API-blue.svg)](https://cloud.baidu.com/product/ocr)

一个基于Node.js和ADB的微信视频号数据自动抓取系统，支持批量抓取视频数据、Web管理界面、百度OCR识别等功能。

## ✨ 功能特性

- 🚀 **自动化抓取**：自动打开微信、导航到个人主页、提取视频数据
- 📊 **Web管理界面**：通过浏览器启动抓取任务、查看数据、导出Excel
- 🎯 **批量抓取**：支持批量抓取多个视频的完整数据
- 🔍 **百度OCR识别**：使用百度OCR提高标题识别准确率
- 📱 **多设备支持**：支持真机ADB连接、多账号管理
- 💾 **数据导出**：自动生成Excel和JSON格式数据文件
- 🎨 **数据可视化**：Web界面包含数据趋势图表
- 🛑 **优雅停止**：支持中途停止抓取并保存已抓取数据
- 🔔 **审核状态检测**：自动识别审核不过关的视频

## 🚀 快速开始

### 前置要求

- Node.js 14+
- ADB（Android Debug Bridge）
- 安卓手机（已开启USB调试）
- 百度OCR API密钥（[申请地址](https://cloud.baidu.com/product/ocr)）

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/FisJing/wechat-video-analytics.git
cd wechat-video-analytics
```

2. **安装依赖**
```bash
npm install
```

3. **配置百度OCR**

复制配置示例文件：
```bash
cp baidu-ocr.config.example.json baidu-ocr.config.json
```

编辑 `baidu-ocr.config.json`，填入您的百度OCR API密钥：
```json
{
  "apiKey": "您的API_KEY",
  "secretKey": "您的SECRET_KEY"
}
```

4. **连接设备**
```bash
# 连接设备（替换为您的手机IP）
adb connect 192.168.31.163:5555

# 验证连接
adb devices
```

5. **启动Web服务器**
```bash
# 复制启动脚本示例
cp start.bat.example start.bat

# 编辑 start.bat，修改设备IP地址

# 运行
start.bat

# 或直接运行
node web-server/server-stats.js
```

6. **访问Web界面**

打开浏览器访问：http://localhost:3002

## 📖 使用说明

### Web界面使用

1. 打开 http://localhost:3002
2. 选择要使用的设备
3. 选择微信类型（机主微信/微信分身）
4. 设置要抓取的视频数量
5. 点击"开始抓取"
6. 等待抓取完成，查看数据
7. 点击"导出Excel"下载数据

### 命令行使用

```bash
# 抓取10个视频（默认）
node batch-capture.js 192.168.31.163:5555 10

# 抓取20个视频
node batch-capture.js 192.168.31.163:5555 20

# 保留截图文件
node batch-capture.js 192.168.31.163:5555 10 --keep-screenshots
```

### 数据字段说明

抓取的数据包含以下字段：

| 字段 | 说明 |
|------|------|
| 序号 | 视频编号 |
| 视频标题 | 视频标题（OCR识别） |
| 播放量 | 视频播放次数 |
| 完播率 | 视频完播率 |
| 平均播放时长 | 平均播放时长（秒） |
| 点赞数 | 点赞数量 |
| 评论数 | 评论数量 |
| 推荐数 | 推荐数量 |
| 发布时间 | 视频发布时间 |
| 审核状态 | 正常/审核不过关 |
| 抓取时间 | 数据抓取时间 |

## 📁 项目结构

```
wechat-video-stats/
├── batch-capture.js        # 批量抓取核心脚本
├── baidu-ocr-helper.js     # 百度OCR封装
├── simple-title-cleaner.js # 标题清理工具
├── web-server/             # Web服务器
│   ├── server-stats.js     # 服务端代码
│   └── web/
│       └── index.html      # Web界面
├── output/                 # 输出目录（不提交到Git）
├── config/                 # 配置文件
└── accounts/               # 账号配置
```

## ⚠️ 注意事项

- **隐私安全**：本工具仅供个人使用，请勿用于商业目的或侵犯他人隐私
- **使用频率**：避免过于频繁的抓取，以免触发微信的限制
- **数据准确性**：OCR识别可能存在误差，建议手动核对重要数据
- **微信版本**：微信版本更新可能导致界面变化，需要及时调整坐标配置

## 🐛 故障排查

### 设备连接失败

```bash
# 检查ADB连接
adb devices

# 重新连接
adb connect 设备IP:端口
```

### OCR识别不准确

- 检查百度OCR配置是否正确
- 确认API额度是否充足

## 📝 更新日志

### v2.0.0 (2026-06-17)
- ✨ 新增Web管理界面
- ✨ 集成百度OCR提高识别准确率
- ✨ 支持批量抓取和自动停止
- ✨ 添加审核状态检测

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [百度AI开放平台](https://cloud.baidu.com/) - OCR识别服务
- [Node.js](https://nodejs.org/) - JavaScript运行环境
- [Express](https://expressjs.com/) - Web框架

---

⭐ 如果这个项目对您有帮助，请给个Star支持一下！
