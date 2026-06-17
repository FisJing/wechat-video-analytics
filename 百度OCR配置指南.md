# 百度OCR配置指南

## 📝 第一步：注册百度智能云（5分钟）

### 1. 访问百度智能云
```
网址：https://cloud.baidu.com/
```

### 2. 注册/登录
- 点击右上角"注册"
- 使用手机号注册
- 完成实名认证（需要身份证）

### 3. 进入OCR服务
```
首页 → 产品服务 → 人工智能 → 文字识别OCR → 立即使用
```

或直接访问：
```
https://console.bce.baidu.com/ai/#/ai/ocr/overview/index
```

---

## 🔑 第二步：创建应用并获取密钥

### 1. 创建应用
- 点击"创建应用"
- 应用名称：`微信视频标题识别`
- 应用类型：选择"通用文字识别"
- 点击"立即创建"

### 2. 获取密钥
创建成功后，您会看到：
```
API Key:    xxxxxxxxxxxxxxxxxxxx
Secret Key: xxxxxxxxxxxxxxxxxxxx
```

**⚠️ 请复制保存这两个密钥！**

---

## ⚙️ 第三步：配置到系统

### 方法1：使用配置文件（推荐）

1. 创建配置文件：
```bash
# 复制示例文件
copy baidu-ocr.config.example.json baidu-ocr.config.json
```

2. 编辑 `baidu-ocr.config.json`：
```json
{
  "apiKey": "您的API_KEY",
  "secretKey": "您的SECRET_KEY"
}
```

### 方法2：直接修改代码

在 `fix-titles-baidu.js` 中修改：
```javascript
const API_KEY = '您的API_KEY';
const SECRET_KEY = '您的SECRET_KEY';
```

---

## 🚀 第四步：使用百度OCR提取标题

### 1. 安装依赖
```bash
npm install axios
```

### 2. 运行提取脚本
```bash
node fix-titles-baidu.js
```

### 3. 查看结果
提取的标题会自动保存到：
```
output/all_videos_data.json
```

---

## 💰 费用说明

### 免费额度
- **每月1000次免费调用**
- 超出后按次计费

### 使用量估算
| 视频数量 | 调用次数 | 费用 |
|---------|---------|------|
| 100个 | 100次 | 免费 |
| 500个 | 500次 | 免费 |
| 1000个 | 1000次 | 免费 |
| 2000个 | 2000次 | 约10元 |

**个人使用完全够用！**

---

## ✅ 验证配置

运行测试：
```bash
node test-baidu-ocr.js
```

如果看到：
```
✓ 百度OCR配置成功
✓ Access Token获取成功
```

说明配置成功！

---

## 🆘 常见问题

### 问题1：提示"API Key不存在"
**解决：** 检查API_KEY是否正确复制

### 问题2：提示"签名错误"
**解决：** 检查SECRET_KEY是否正确复制

### 问题3：提示"额度不足"
**解决：** 查看控制台是否已用完免费额度

---

## 📞 需要帮助？

如果配置过程中遇到问题，请告诉我：
1. 卡在哪一步
2. 具体的错误提示

我会立即帮您解决！
