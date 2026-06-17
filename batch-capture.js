/**
 * 自动化批量抓取微信视频数据
 * 使用百度OCR提高标题识别准确率
 */

const { exec } = require('child_process');
const BaiduOCR = require('./baidu-ocr-helper.js');
const { cleanVideoTitle } = require('./simple-title-cleaner.js');
const fs = require('fs');
const path = require('path');

class VideoBatchCapture {
    constructor(deviceId, maxVideos = 10, keepScreenshots = false) {
        this.deviceId = deviceId;
        this.maxVideos = maxVideos;
        this.keepScreenshots = keepScreenshots; // 是否保留截图
        this.ocr = null;
        this.allVideos = [];
        this.videoIndex = 1;
        this.shouldStop = false; // 停止标志
    }

    /**
     * 处理停止信号
     */
    setupStopHandler() {
        // 处理SIGTERM信号（Linux/Mac）
        process.on('SIGTERM', () => {
            console.log('\n收到停止信号，正在停止抓取...');
            this.shouldStop = true;
        });

        // 处理SIGINT信号（Ctrl+C）
        process.on('SIGINT', () => {
            console.log('\n收到中断信号，正在停止抓取...');
            this.shouldStop = true;
        });

        // Windows系统可能不会正确传递信号，添加定期检查
        if (process.platform === 'win32') {
            const stopCheckInterval = setInterval(() => {
                // 检查父进程是否还存在
                try {
                    // 如果父进程已经退出，停止抓取
                    if (!process.ppid || process.ppid === 1) {
                        console.log('\n检测到父进程已退出，正在停止抓取...');
                        this.shouldStop = true;
                        clearInterval(stopCheckInterval);
                    }
                } catch (e) {
                    // 忽略错误
                }
            }, 500); // 每500ms检查一次
        }
    }

    /**
     * 加载百度OCR配置
     */
    loadBaiduConfig() {
        const configFile = path.join(__dirname, 'baidu-ocr.config.json');

        if (!fs.existsSync(configFile)) {
            console.error('✗ 未找到百度OCR配置文件！');
            console.log('请先配置百度OCR:');
            console.log('1. 复制 baidu-ocr.config.example.json 为 baidu-ocr.config.json');
            console.log('2. 填入您的API_KEY和SECRET_KEY');
            console.log('详细说明请查看：百度OCR配置指南.md');
            process.exit(1);
        }

        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return config;
    }

    /**
     * 清理截图文件
     */
    cleanScreenshots() {
        console.log('\n【清理截图文件】');

        let cleanedCount = 0;

        for (let i = 1; i <= this.videoIndex; i++) {
            const screenshotFile = `video_${i}.png`;
            if (fs.existsSync(screenshotFile)) {
                try {
                    fs.unlinkSync(screenshotFile);
                    cleanedCount++;
                } catch (error) {
                    console.log(`  ✗ 删除失败: ${screenshotFile} - ${error.message}`);
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`✓ 已清理 ${cleanedCount} 个截图文件`);
        } else {
            console.log('✓ 无需清理，没有截图文件');
        }
    }

    /**
     * 执行ADB命令
     */
    async adb(cmd) {
        return new Promise((resolve, reject) => {
            exec(`adb -s ${this.deviceId} ${cmd}`, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });
    }

    /**
     * 解析数字（支持"1.2万"、"5.3亿"等格式）
     */
    parseNumber(text) {
        // 清理文本，只保留数字、小数点和中文单位
        const cleaned = text.replace(/[^\d.万千百十亿]/g, '');

        // 匹配数字和单位
        const match = cleaned.match(/([\d.]+)\s*([万千百十亿])?/);

        if (!match) return 0;

        let num = parseFloat(match[1]);

        // 单位转换
        if (match[2] === '千') num *= 1000;
        if (match[2] === '万') num *= 10000;
        if (match[2] === '亿') num *= 100000000;

        return Math.round(num);
    }

    /**
     * 点击
     */
    async tap(x, y) {
        await this.adb(`shell input tap ${x} ${y}`);
        await this.sleep(2000);
    }

    /**
     * 滑动
     */
    async swipe(x1, y1, x2, y2, duration = 300) {
        await this.adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
        await this.sleep(2000);
    }

    /**
     * 截图
     */
    async screenshot(filename) {
        const remotePath = `/sdcard/${filename}`;
        await this.adb(`shell screencap -p ${remotePath}`);
        await this.adb(`pull ${remotePath} ${filename}`);
        return filename;
    }

    /**
     * OCR识别并提取数据（使用百度OCR）
     */
    async extractData(imagePath) {
        const text = await this.ocr.recognizeText(imagePath);
        const lines = text.split('\n');

        const data = {
            videoIndex: this.videoIndex,
            videoTitle: '',
            playCount: 0,
            playCompleteRate: '',
            avgPlayDuration: '',
            likeCount: 0,
            commentCount: 0,
            recommendCount: 0, // 推荐数（点赞右边的推荐数据）
            publishTime: '',
            reviewStatus: '正常', // 审核状态：正常/审核不过关
            captureTime: new Date().toISOString()
        };

        // 提取视频标题 - 在"数据分析"之后
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检测"数据"和"分析"或"更多数据"
            if ((line.includes('数据') && (line.includes('分') && line.includes('析'))) ||
                (line.includes('更多') && line.includes('数据'))) {

                // 收集关键词后10行内的所有可能的标题行
                const titleCandidates = [];

                for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
                    const titleLine = lines[j].trim();

                    // 跳过空行和特定的非标题行
                    if (titleLine === '' ||
                        titleLine.includes('数据诊断') ||
                        titleLine.includes('播放数据') ||
                        titleLine.includes('互动数据') ||
                        titleLine.includes('观看留存') ||
                        titleLine.match(/^\d{4}年\d{2}月\d{2}日/)) { // 跳过日期行
                        continue;
                    }

                    // 收集长度>5且不含特定关键词的行
                    if (titleLine.length > 5 &&
                        !titleLine.includes('播放') &&
                        !titleLine.includes('sx') &&
                        !titleLine.match(/^\d{2}:\d{2}/)) {

                        titleCandidates.push({
                            text: titleLine,
                            length: titleLine.length,
                            index: j
                        });
                    }
                }

                // 选择最长的标题行（通常最长的就是完整标题）
                if (titleCandidates.length > 0) {
                    titleCandidates.sort((a, b) => b.length - a.length);
                    const bestTitle = titleCandidates[0].text;

                    // 清理标题：使用简化的清理函数
                    const cleanedTitle = cleanVideoTitle(bestTitle);
                    data.videoTitle = cleanedTitle;

                    if (titleCandidates.length > 1) {
                        console.log(`  发现${titleCandidates.length}个可能的标题，已选择最长的: "${cleanedTitle}"`);
                    }
                }

                break;
            }
        }

        // 提取各项数据
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 播放量
            if (line.includes('播放') && line.includes('量') && !line.includes('平均')) {
                // 情况1：数据在下一行（如 "播放量\n5 20.00%"）
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();

                    // 检查下一行是否是"完播率"标签（如果是，说明数据分开两行）
                    if (nextLine.includes('完播率')) {
                        // 播放量数据在i+2行
                        if (i + 2 < lines.length) {
                            const playCountLine = lines[i + 2].trim();
                            data.playCount = this.parseNumber(playCountLine);
                        }
                        // 完播率数据在i+3行
                        if (i + 3 < lines.length) {
                            const playRateLine = lines[i + 3].trim();
                            data.playCompleteRate = playRateLine;
                        }
                    } else {
                        // 数据在同一行或下一行
                        const parts = nextLine.split(/\s+/);
                        if (parts.length >= 1) data.playCount = this.parseNumber(parts[0]);
                        if (parts.length >= 2) data.playCompleteRate = parts[1];
                    }
                }
            }

            // 平均播放时长 - 只提取秒数
            if (line.includes('平均') && line.includes('播放') && line.includes('时长')) {
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();

                    // 检查下一行是否是"3s以上播放率"标签
                    if (nextLine.includes('播放率') || nextLine.includes('s以上')) {
                        // 平均播放时长数据在i+2行
                        if (i + 2 < lines.length) {
                            const durationLine = lines[i + 2].trim();
                            const match = durationLine.match(/([\d.]+)\s*秒/);
                            if (match) {
                                data.avgPlayDuration = match[1] + '秒';
                            } else {
                                data.avgPlayDuration = durationLine;
                            }
                        }
                    } else {
                        // 数据在下一行
                        const match = nextLine.match(/([\d.]+)\s*秒/);
                        if (match) {
                            data.avgPlayDuration = match[1] + '秒';
                        } else {
                            data.avgPlayDuration = nextLine.split(/\s+/)[0];
                        }
                    }
                }
            }

            // 发布时间
            if (line.includes('年') && line.includes('月') && line.includes('日')) {
                // 提取日期部分（支持多种格式）
                // 格式1: 2026年06月03日
                // 格式2: 2026年06月03日08：05
                // 格式3: 2026年 06月 03日
                const match = line.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
                if (match) {
                    const year = match[1];
                    const month = match[2].padStart(2, '0');
                    const day = match[3].padStart(2, '0');

                    // 尝试提取时间部分（如果有）
                    const timeMatch = line.match(/(\d{1,2})[：:](\d{2})/);
                    if (timeMatch) {
                        const hour = timeMatch[1].padStart(2, '0');
                        const minute = timeMatch[2];
                        data.publishTime = `${year}年${month}月${day}日 ${hour}:${minute}`;
                    } else {
                        data.publishTime = `${year}年${month}月${day}日`;
                    }
                }
            }

            // 互动数据
            if (line.includes('互动') && line.includes('数据')) {
                if (i + 2 < lines.length) {
                    const dataLine1 = lines[i + 2].trim();
                    const parts1 = dataLine1.split(/\s+/);

                    // 点赞数据
                    if (parts1.length >= 1) {
                        data.likeCount = this.parseNumber(parts1[0]);
                    }

                    // 情况A：点赞和推荐在同一行（如 "1  2"）
                    if (parts1.length >= 2) {
                        data.recommendCount = this.parseNumber(parts1[1]);
                    }
                    // 情况B：点赞和推荐分开两行（如 "1" 然后 "1"）
                    else if (i + 3 < lines.length) {
                        const dataLine2 = lines[i + 3].trim();
                        const parts2 = dataLine2.split(/\s+/);

                        // 检查下一行是否是数字（推荐数据）
                        if (parts2.length >= 1 && parts2[0].match(/^\d+/)) {
                            // 检查这行不是"评论"等关键词
                            if (!dataLine2.includes('评论') && !dataLine2.includes('新增')) {
                                data.recommendCount = this.parseNumber(parts2[0]);
                            }
                        }
                    }
                }
            }

            // 评论
            if (line.includes('评论') && line.includes('新增')) {
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    const parts = nextLine.split(/\s+/);
                    if (parts.length >= 1) data.commentCount = this.parseNumber(parts[0]);
                }
            }
        }

        // 判断审核状态：如果所有数据都为0或空，则标记为"审核不过关"
        if (data.playCount === 0 &&
            (!data.playCompleteRate || data.playCompleteRate === '0%' || data.playCompleteRate === '') &&
            (!data.avgPlayDuration || data.avgPlayDuration === '') &&
            data.likeCount === 0 &&
            data.commentCount === 0 &&
            data.recommendCount === 0) {
            data.reviewStatus = '审核不过关';
            console.log('⚠ 检测到该视频无任何数据，标记为审核不过关');
        }

        return data;
    }

    /**
     * 睡眠（支持提前中断）
     */
    async sleep(ms) {
        return new Promise(resolve => {
            if (this.shouldStop) {
                // 如果已经设置了停止标志，立即返回
                resolve();
                return;
            }

            const timer = setTimeout(resolve, ms);

            // 如果设置了停止标志，立即返回
            const checkStop = setInterval(() => {
                if (this.shouldStop) {
                    clearTimeout(timer);
                    clearInterval(checkStop);
                    resolve();
                }
            }, 50); // 每50ms检查一次（更快响应）

            // 正常完成后清理检查器
            setTimeout(() => {
                clearInterval(checkStop);
            }, ms);
        });
    }

    /**
     * 开始批量抓取
     */
    async start() {
        // 设置停止信号处理器
        this.setupStopHandler();

        console.log('========================================');
        console.log('  微信视频数据批量抓取系统');
        console.log('========================================');
        console.log(`设备: ${this.deviceId}`);
        console.log(`计划抓取: ${this.maxVideos} 个视频`);
        console.log('');

        // 初始化百度OCR
        console.log('初始化百度OCR引擎...');
        const config = this.loadBaiduConfig();
        this.ocr = new BaiduOCR(config.apiKey, config.secretKey);
        await this.ocr.getAccessToken();
        console.log('✓ 百度OCR引擎初始化完成\n');

        try {
            // 步骤1-5: 打开到个人视频列表
            console.log('【步骤1】打开微信...');
            await this.adb('shell am start -n com.tencent.mm/.ui.LauncherUI');
            await this.sleep(5000); // 应用启动需要更多时间

            // 检查是否应该停止
            if (this.shouldStop) {
                console.log('\n用户停止了抓取，正在退出...');
                return;
            }

            console.log('【步骤2】点击"发现"...');
            await this.tap(675, 2300);

            if (this.shouldStop) {
                console.log('\n用户停止了抓取，正在退出...');
                return;
            }

            console.log('【步骤3】点击"视频号"...');
            await this.tap(326, 500);
            await this.sleep(5000); // 视频号首页加载需要时间

            if (this.shouldStop) {
                console.log('\n用户停止了抓取，正在退出...');
                return;
            }

            console.log('【步骤4】点击个人界面...');
            await this.tap(1000, 150);

            if (this.shouldStop) {
                console.log('\n用户停止了抓取，正在退出...');
                return;
            }

            console.log('【步骤5】点击个人视频...');
            await this.tap(340, 1100);
            await this.sleep(5000); // 个人视频列表加载需要时间

            // 开始批量抓取
            for (let i = 0; i < this.maxVideos; i++) {
                // 检查是否应该停止
                if (this.shouldStop) {
                    console.log('\n用户停止了抓取，正在保存已抓取的数据...');
                    this.saveAllData();
                    console.log('✓ 已保存 ' + this.allVideos.length + ' 个视频数据');
                    return;
                }

                console.log(`\n========== 第 ${this.videoIndex} 个视频 ==========`);

                // 步骤6: 点击视频
                console.log(`【步骤6】点击第 ${i + 1} 个视频...`);
                await this.tap(160, 1600);
                await this.sleep(3000); // 等待视频详情页加载

                // 检查是否应该停止
                if (this.shouldStop) {
                    console.log('\n用户停止了抓取，正在保存已抓取的数据...');
                    this.saveAllData();
                    console.log('✓ 已保存 ' + this.allVideos.length + ' 个视频数据');
                    return;
                }

                // 步骤7: 点击视频分析
                console.log('【步骤7】点击视频分析...');
                await this.tap(120, 2270);
                console.log('  等待分析页面加载（12秒）...');
                await this.sleep(12000); // WebView加载分析数据需要更多时间

                // 检查是否应该停止
                if (this.shouldStop) {
                    console.log('\n用户停止了抓取，正在保存已抓取的数据...');
                    this.saveAllData();
                    console.log('✓ 已保存 ' + this.allVideos.length + ' 个视频数据');
                    return;
                }

                // 步骤8: 截图并识别
                console.log('【步骤8】等待标题完全加载（5秒）...');
                await this.sleep(5000); // 确保标题完全渲染（特别是长标题）
                console.log('【步骤8】截图并OCR识别...');
                const screenshotFile = `video_${this.videoIndex}.png`;
                await this.screenshot(screenshotFile);

                const data = await this.extractData(screenshotFile);
                this.allVideos.push(data);

                console.log(`✓ 视频名称: ${data.videoTitle}`);
                console.log(`✓ 播放量: ${data.playCount}`);
                console.log(`✓ 点赞: ${data.likeCount}, 评论: ${data.commentCount}, 推荐: ${data.recommendCount}`);
                console.log(`✓ 审核状态: ${data.reviewStatus}`);

                // 步骤9: 返回
                console.log('【步骤9】返回视频列表...');
                await this.tap(50, 180);

                // 步骤10: 滑动到下一个视频
                if (i < this.maxVideos - 1) {
                    // 检查是否应该停止
                    if (this.shouldStop) {
                        console.log('\n用户停止了抓取，正在保存已抓取的数据...');
                        this.saveAllData();
                        console.log('✓ 已保存 ' + this.allVideos.length + ' 个视频数据');
                        return;
                    }

                    console.log('【步骤10】滑动到下一个视频...');
                    await this.swipe(540, 2000, 540, 1000);
                    await this.sleep(5000); // 滑动后新视频加载需要时间
                }

                this.videoIndex++;
            }

            // 保存汇总数据
            this.saveAllData();

        } catch (error) {
            console.error('抓取过程出错:', error);
            // 出错时也保存已抓取的数据
            if (this.allVideos.length > 0) {
                console.log('正在保存已抓取的数据...');
                this.saveAllData();
            }
        } finally {
            // 清理截图文件（除非设置了保留）
            if (!this.keepScreenshots) {
                this.cleanScreenshots();
            } else {
                console.log('\n【保留截图】截图文件已保留在当前目录');
            }
        }
    }

    /**
     * 保存所有数据
     */
    saveAllData() {
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 保存JSON
        const jsonFile = path.join(outputDir, 'all_videos_data.json');
        fs.writeFileSync(jsonFile, JSON.stringify(this.allVideos, null, 2), 'utf8');

        // 保存CSV
        const csvFile = path.join(outputDir, 'all_videos_data.csv');
        const csvContent = this.generateCSV();
        fs.writeFileSync(csvFile, '﻿' + csvContent, 'utf8');

        // 统计审核状态
        const normalCount = this.allVideos.filter(v => v.reviewStatus === '正常').length;
        const rejectedCount = this.allVideos.filter(v => v.reviewStatus === '审核不过关').length;

        console.log('\n========================================');
        console.log('✓ 批量抓取完成！');
        console.log(`✓ 共抓取 ${this.allVideos.length} 个视频`);
        console.log(`✓ 正常视频: ${normalCount} 个`);
        if (rejectedCount > 0) {
            console.log(`⚠ 审核不过关: ${rejectedCount} 个`);
        }
        console.log(`✓ JSON文件: ${jsonFile}`);
        console.log(`✓ CSV文件: ${csvFile}`);
        console.log('========================================');
    }

    /**
     * 生成CSV
     */
    generateCSV() {
        const headers = ['序号', '视频名称', '播放量', '完播率', '平均播放时长', '点赞数', '评论数', '推荐数', '发布时间', '审核状态', '抓取时间'];
        const rows = [headers.join(',')];

        for (const video of this.allVideos) {
            const row = [
                video.videoIndex,
                `"${video.videoTitle}"`,
                video.playCount,
                video.playCompleteRate,
                `"${video.avgPlayDuration}"`,
                video.likeCount,
                video.commentCount,
                video.recommendCount,
                `"${video.publishTime}"`,
                video.reviewStatus,
                video.captureTime
            ];
            rows.push(row.join(','));
        }

        return rows.join('\n');
    }
}

// 运行
const args = process.argv.slice(2);
const deviceId = args[0] || '192.168.31.163:5555';
const maxVideos = parseInt(args[1]) || 10;
const keepScreenshots = args.includes('--keep-screenshots') || args.includes('-k');

const capture = new VideoBatchCapture(deviceId, maxVideos, keepScreenshots);

if (keepScreenshots) {
    console.log('【提示】将保留截图文件');
}

capture.start().catch(console.error);
