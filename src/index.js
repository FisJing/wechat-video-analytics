/**
 * 微信视频号数据抓取系统 - 主入口
 */

const path = require('path');
const fs = require('fs');
const Navigator = require('./core/navigator.js');
const VideoScanner = require('./core/video-scanner.js');
const DataExtractor = require('./core/extractor.js');
const StatsStorage = require('./utils/storage.js');
const { getOCRHelper } = require('./utils/ocr.js');

class WeChatVideoStatsFetcher {
    constructor(accountName) {
        // 加载账号配置
        const configPath = path.join(__dirname, `../accounts/${accountName}/config.json`);

        if (!fs.existsSync(configPath)) {
            throw new Error(`账号配置不存在: ${configPath}`);
        }

        this.accountConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.accountName = accountName;

        // 初始化模块
        this.navigator = new Navigator(this.accountConfig);
        this.storage = new StatsStorage(this.accountConfig.outputDir);
        this.ocr = getOCRHelper();
    }

    /**
     * 运行抓取任务
     */
    async run() {
        console.log('========================================');
        console.log('微信视频号数据抓取系统');
        console.log('========================================');
        console.log(`账号: ${this.accountConfig.name}`);
        console.log(`设备: ${this.accountConfig.deviceId}`);
        console.log(`类型: ${this.accountConfig.userId === 0 ? '机主微信' : '分身微信'}`);
        console.log('========================================\n');

        try {
            // 阶段1: 导航到个人主页
            console.log('[阶段1] 导航到个人主页...');
            console.log('  ⏳ 等待 2 秒...');
            await this.sleep(2000);

            await this.navigator.navigateToMyVideos();
            console.log('  ✅ 阶段1完成');
            console.log('  ⏳ 等待 2 秒...\n');
            await this.sleep(2000);

            // 阶段2: 扫描视频列表
            console.log('[阶段2] 扫描视频列表...');
            console.log('  ⏳ 等待 2 秒...');
            await this.sleep(2000);

            const scanner = new VideoScanner(
                this.navigator.positions,
                this.navigator.adb.bind(this.navigator),
                this.navigator.statsConfig
            );
            const videos = await scanner.scanAllVideos();

            if (videos.length === 0) {
                console.log('未发现任何视频');
                return;
            }

            console.log('  ✅ 阶段2完成');
            console.log('  ⏳ 等待 2 秒...\n');
            await this.sleep(2000);

            // 阶段3: 提取每个视频的数据
            console.log('[阶段3] 提取视频数据...');
            console.log('  ⏳ 等待 2 秒...\n');
            await this.sleep(2000);

            const extractor = new DataExtractor(this.navigator.positions.statsBar);

            const videosWithStats = [];
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                console.log(`\n  [视频 ${i + 1}/${videos.length}] 开始处理...`);
                console.log(`    ⏳ 等待 2 秒...`);
                await this.sleep(2000);

                try {
                    // 点击视频进入详情页
                    console.log(`    👆 点击视频位置 (${video.x}, ${video.y})`);
                    this.navigator.tap(video.x, video.y);
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);

                    // 尝试向上滑动，让数据栏显示出来
                    console.log(`    📜 向上滑动显示数据栏`);
                    this.navigator.adb('shell input swipe 540 1800 540 1000 300');
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);

                    // 截图
                    console.log(`    📸 截图保存中...`);
                    const screenshot = this.navigator.screenshotWithTag(`video_${i}`);
                    console.log(`    ✅ 截图已保存: ${screenshot}`);
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);

                    // 提取标题
                    console.log(`    🔍 正在识别视频标题...`);
                    const title = await extractor.extractTitle(screenshot);

                    // 提取数据
                    console.log(`    🔍 正在识别视频数据...`);
                    const stats = await extractor.extractStats(screenshot);

                    videosWithStats.push({
                        ...video,
                        title: title,
                        ...stats,
                        fetchTime: new Date().toISOString()
                    });

                    console.log(`    ✅ 标题: ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`);
                    console.log(`    ✅ 点赞: ${stats.likes}, 评论: ${stats.comments}, 收藏: ${stats.favorites}`);
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);

                    // 返回列表
                    console.log(`    🔙 返回视频列表`);
                    await this.navigator.goBack();
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);

                } catch (error) {
                    console.error(`    ✗ 失败: ${error.message}`);
                    // 尝试返回列表
                    await this.navigator.goBack();
                    console.log(`    ⏳ 等待 2 秒...`);
                    await this.sleep(2000);
                }
            }

            // 阶段4: 保存数据
            console.log('\n[阶段4] 保存数据...');
            console.log('  ⏳ 等待 2 秒...');
            await this.sleep(2000);

            const outputPath = this.storage.saveToExcel(videosWithStats);
            this.storage.saveHistory(videosWithStats);

            console.log('  ✅ 阶段4完成');

            console.log('\n========================================');
            console.log('✓ 抓取完成');
            console.log(`  共抓取: ${videosWithStats.length} 个视频`);
            console.log(`  输出文件: ${outputPath}`);
            console.log('========================================\n');

            // 终止OCR worker
            await this.ocr.terminate();

            return {
                success: true,
                count: videosWithStats.length,
                outputPath
            };

        } catch (error) {
            console.error('\n✗ 抓取失败:', error);
            await this.ocr.terminate();
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 睡眠
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 主函数
async function main() {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let accountName = 'xin';  // 默认账号

    // 查找 --account 参数
    const accountIndex = args.indexOf('--account');
    if (accountIndex !== -1 && args[accountIndex + 1]) {
        accountName = args[accountIndex + 1];
    }

    // 运行抓取
    const fetcher = new WeChatVideoStatsFetcher(accountName);
    await fetcher.run();
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}

module.exports = WeChatVideoStatsFetcher;
