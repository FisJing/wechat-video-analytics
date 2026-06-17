/**
 * 微信视频号数据抓取基础类
 * 继承自现有的WeChatVideoPublisher，扩展数据抓取功能
 */

const path = require('path');
const fs = require('fs');
const WeChatVideoPublisher = require('C:/Users/Lremi/Desktop/auto/wechat-video-publisher/src/publisher.js');

class WeChatStatsFetcher extends WeChatVideoPublisher {
    constructor(accountConfig) {
        super(accountConfig);

        // 加载全局坐标配置
        const positionsPath = path.join(__dirname, '../../config/positions.json');
        this.globalPositions = JSON.parse(fs.readFileSync(positionsPath, 'utf8'));

        // 合并坐标配置（账号配置优先）
        this.positions = {
            ...this.globalPositions.navigation,
            ...this.globalPositions.videoList,
            ...this.globalPositions.actions,
            ...accountConfig.positions
        };

        // 单独保留statsBar对象（包含items数组）
        this.positions.statsBar = this.globalPositions.statsBar;

        // 数据抓取专用配置
        this.statsConfig = {
            maxScrolls: 50,
            scrollDelay: 2000,
            pageLoadDelay: 3000,
            videoProcessDelay: 2000
        };

        // 确保输出目录存在
        if (!fs.existsSync(accountConfig.outputDir)) {
            fs.mkdirSync(accountConfig.outputDir, { recursive: true });
        }

        if (!fs.existsSync(accountConfig.logDir)) {
            fs.mkdirSync(accountConfig.logDir, { recursive: true });
        }
    }

    /**
     * 滑动屏幕（向上滑动，加载更多内容）
     */
    swipeUp() {
        const [x1, y1] = this.positions.scrollStart;
        const [x2, y2] = this.positions.scrollEnd;
        const duration = this.positions.scrollDuration || 300;
        this.adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    }

    /**
     * 带标签的截图
     */
    screenshotWithTag(tag) {
        const timestamp = Date.now();
        const filename = `${this.config.logDir}/${tag}_${timestamp}.png`;
        this.adb(`exec-out screencap -p > "${filename}"`);
        return filename;
    }

    /**
     * 等待页面加载
     */
    async waitForPageLoad(delay = this.statsConfig.pageLoadDelay) {
        await this.sleep(delay);
    }

    /**
     * 检查设备连接
     */
    checkDeviceConnection() {
        try {
            const result = this.adb('devices');
            const lines = result.split('\n');
            const deviceLine = lines.find(line => line.includes(this.config.deviceId));

            if (!deviceLine || !deviceLine.includes('device')) {
                throw new Error(`设备 ${this.config.deviceId} 未连接`);
            }

            console.log(`✓ 设备已连接: ${this.config.deviceId}`);
            return true;
        } catch (error) {
            console.error(`✗ 设备连接检查失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 日志记录
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${this.config.name}] [${level.toUpperCase()}] ${message}\n`;

        // 控制台输出
        console.log(logLine.trim());

        // 写入日志文件
        const logFile = `${this.config.logDir}/fetch.log`;
        fs.appendFileSync(logFile, logLine);
    }

    /**
     * 保存进度
     */
    saveProgress(data) {
        const progressFile = `${this.config.logDir}/progress.json`;
        fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
    }

    /**
     * 加载进度
     */
    loadProgress() {
        const progressFile = `${this.config.logDir}/progress.json`;
        try {
            if (fs.existsSync(progressFile)) {
                return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
            }
        } catch (error) {
            this.log('无法加载进度文件，将从头开始', 'warn');
        }
        return null;
    }
}

module.exports = WeChatStatsFetcher;
