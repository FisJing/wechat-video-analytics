/**
 * 一步一步执行的视频数据抓取流程
 * 每一步都会暂停并等待用户确认
 */

const Navigator = require('./src/core/navigator.js');
const DataExtractor = require('./src/core/extractor.js');
const StatsStorage = require('./src/utils/storage.js');
const fs = require('fs');
const readline = require('readline');

// 创建命令行交互接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 等待用户按回车继续
function waitForEnter(prompt) {
    return new Promise((resolve) => {
        rl.question(`\n👉 ${prompt} (按回车继续)`, () => {
            resolve();
        });
    });
}

// 延时函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function stepByStepFlow() {
    console.log('\n========================================');
    console.log('微信视频号数据抓取 - 分步执行模式');
    console.log('========================================\n');

    const accountConfig = JSON.parse(
        fs.readFileSync('./accounts/xin/config.json', 'utf8')
    );

    const navigator = new Navigator(accountConfig);
    const extractor = new DataExtractor(navigator.positions.statsBar);
    const storage = new StatsStorage(accountConfig.outputDir);

    const allVideos = [];
    let videoIndex = 0;

    try {
        // ==================== 步骤 0 ====================
        console.log('【步骤 0】强制关闭微信');
        console.log('  目的: 确保微信处于关闭状态，从头开始');
        await waitForEnter('执行: adb shell am force-stop com.tencent.mm');

        navigator.adb('shell am force-stop com.tencent.mm');
        await sleep(2000);
        console.log('  ✓ 微信已关闭');

        // ==================== 步骤 1 ====================
        console.log('\n【步骤 1】启动微信');
        console.log('  目的: 打开微信应用');
        await waitForEnter('执行: adb shell am start com.tencent.mm/.ui.LauncherUI');

        await navigator.openWeChat();
        await sleep(3000);
        console.log('  ✓ 微信已启动');

        // ==================== 步骤 2 ====================
        console.log('\n【步骤 2】点击"发现"');
        console.log('  目的: 进入发现页面');
        console.log('  坐标: (675, 2300)');
        await waitForEnter('执行点击');

        navigator.tap(675, 2300);
        await sleep(2000);
        console.log('  ✓ 已进入"发现"页面');

        // ==================== 步骤 3 ====================
        console.log('\n【步骤 3】点击"视频号"');
        console.log('  目的: 进入视频号页面');
        console.log('  坐标: (326, 500)');
        await waitForEnter('执行点击');

        navigator.tap(326, 500);
        await sleep(2000);
        console.log('  ✓ 已进入视频号');

        // ==================== 步骤 4 ====================
        console.log('\n【步骤 4】点击个人头像');
        console.log('  目的: 进入个人中心');
        console.log('  坐标: (1000, 120)');
        await waitForEnter('执行点击');

        navigator.tap(1000, 120);
        await sleep(2000);
        console.log('  ✓ 已点击个人头像');

        // ==================== 步骤 5 ====================
        console.log('\n【步骤 5】点击个人页面');
        console.log('  目的: 进入个人视频列表页面');
        console.log('  坐标: (400, 1090)');
        console.log('  等待: 5秒 (等待页面加载)');
        await waitForEnter('执行点击');

        navigator.tap(400, 1090);
        console.log('  等待页面加载...');
        await sleep(5000);
        console.log('  ✓ 已进入个人页面');

        // ==================== 步骤 6 ====================
        console.log('\n【步骤 6】点击第一个视频');
        console.log('  目的: 进入第一个视频的播放页面');
        console.log('  坐标: (150, 1600)');
        console.log('  等待: 5秒 (等待视频加载)');
        await waitForEnter('执行点击');

        navigator.tap(150, 1600);
        console.log('  等待视频加载...');
        await sleep(5000);
        console.log('  ✓ 已进入第一个视频');

        // ==================== 循环抓取阶段 ====================
        console.log('\n========================================');
        console.log('开始循环抓取数据');
        console.log('========================================\n');

        let continueLoop = true;
        let noNewVideoCount = 0;
        const maxNoNewCount = 3;

        while (continueLoop) {
            videoIndex++;
            console.log(`\n========== 【视频 ${videoIndex}】 ==========\n`);

            // ==================== 步骤 7 ====================
            console.log(`【步骤 7】点击数据分析按钮`);
            console.log(`  目的: 打开当前视频的数据分析界面`);
            console.log(`  坐标: (120, 2270)`);
            await waitForEnter('执行点击');

            navigator.tap(120, 2270);
            await sleep(2000);
            console.log(`  ✓ 已进入数据分析界面`);

            // ==================== 步骤 8 ====================
            console.log(`\n【步骤 8】提取视频数据`);
            console.log(`  目的: 截图并识别视频的各项数据`);
            await waitForEnter('执行截图和OCR识别');

            const screenshot = navigator.screenshotWithTag(`video_${videoIndex}_data`);
            console.log(`  ✓ 截图已保存: ${screenshot}`);

            console.log(`  正在进行OCR识别...`);
            const title = await extractor.extractTitle(screenshot);
            console.log(`  📝 视频标题: ${title}`);

            const stats = await extractor.extractStats(screenshot);

            const videoData = {
                序号: videoIndex,
                视频标题: title,
                播放量: stats.views || 0,
                完播率: stats.completionRate || 0,
                平均播放时长: stats.avgPlayTime || 0,
                点赞: stats.likes || 0,
                收藏: stats.favorites || 0,
                评论: stats.comments || 0,
                新增关注: stats.newFollowers || 0,
                抓取时间: new Date().toISOString()
            };

            console.log(`\n  📊 数据提取结果:`);
            console.log(`    播放量: ${videoData.播放量}`);
            console.log(`    完播率: ${videoData.完播率}%`);
            console.log(`    平均播放时长: ${videoData.平均播放时长}`);
            console.log(`    点赞: ${videoData.点赞}`);
            console.log(`    收藏: ${videoData.收藏}`);
            console.log(`    评论: ${videoData.评论}`);
            console.log(`    新增关注: ${videoData.新增关注}`);

            allVideos.push(videoData);

            console.log(`\n  等待3秒...`);
            await sleep(3000);

            // ==================== 步骤 9 ====================
            console.log(`\n【步骤 9】点击返回按钮`);
            console.log(`  目的: 返回个人视频播放界面`);
            console.log(`  坐标: (50, 160)`);
            await waitForEnter('执行点击');

            navigator.tap(50, 160);
            await sleep(2000);
            console.log(`  ✓ 已返回视频播放界面`);

            // ==================== 步骤 10 ====================
            console.log(`\n【步骤 10】滑动到下一个视频`);
            console.log(`  目的: 向上滑动，切换到下一个视频`);
            console.log(`  滑动: (540, 2000) → (540, 500)`);
            await waitForEnter('执行滑动');

            navigator.adb('shell input swipe 540 2000 540 500 300');
            await sleep(2000);
            console.log(`  ✓ 已滑动到下一个视频`);

            // ==================== 询问是否继续 ====================
            console.log(`\n当前已抓取 ${allVideos.length} 个视频的数据`);
            const answer = await new Promise((resolve) => {
                rl.question('\n是否继续抓取下一个视频? (y/n): ', (ans) => {
                    resolve(ans.toLowerCase());
                });
            });

            if (answer !== 'y' && answer !== 'yes') {
                continueLoop = false;
                console.log('\n用户选择停止抓取');
            }

            // 检查是否到底
            if (stats.views === 0 && stats.likes === 0) {
                noNewVideoCount++;
                if (noNewVideoCount >= maxNoNewCount) {
                    console.log('\n⚠️ 连续多次未检测到数据，可能已到底');
                    continueLoop = false;
                }
            } else {
                noNewVideoCount = 0;
            }
        }

        // ==================== 保存数据 ====================
        console.log('\n========================================');
        console.log('抓取完成，保存数据');
        console.log('========================================\n');

        console.log(`共抓取 ${allVideos.length} 个视频的数据`);

        if (allVideos.length > 0) {
            const outputPath = storage.saveToExcel(allVideos);
            console.log(`\n✓ 数据已保存到: ${outputPath}`);
        }

    } catch (error) {
        console.error('\n✗ 执行失败:', error.message);
        console.error(error.stack);
    } finally {
        rl.close();
    }

    return { total: allVideos.length, videos: allVideos };
}

// 运行
stepByStepFlow().then(result => {
    console.log('\n程序结束');
    process.exit(0);
}).catch(error => {
    console.error('程序异常:', error);
    process.exit(1);
});
