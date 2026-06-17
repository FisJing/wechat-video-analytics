/**
 * 单次OCR提取脚本
 */
const DataExtractor = require('./src/core/extractor.js');
const { getOCRHelper } = require('./src/utils/ocr.js');

async function extractData() {
    const screenshotPath = 'C:/Users/Lremi/Desktop/wechat-视频抓取/output/xin/video_1_data.png';
    const extractor = new DataExtractor({
        y: 2200,
        height: 200,
        items: [
            { name: 'views', label: '播放量', x: 100, y: 400, w: 300, h: 80 },
            { name: 'completionRate', label: '完播率', x: 100, y: 500, w: 300, h: 80 },
            { name: 'avgPlayTime', label: '平均播放时长', x: 100, y: 600, w: 300, h: 80 },
            { name: 'likes', label: '点赞', x: 100, y: 700, w: 300, h: 80 },
            { name: 'favorites', label: '收藏', x: 100, y: 800, w: 300, h: 80 },
            { name: 'comments', label: '评论', x: 100, y: 900, w: 300, h: 80 },
            { name: 'newFollowers', label: '新增关注', x: 100, y: 1000, w: 300, h: 80 }
        ]
    });

    console.log('开始OCR识别...\n');

    try {
        // 提取标题
        console.log('【提取标题】');
        const title = await extractor.extractTitle(screenshotPath);
        console.log(`标题: ${title}\n`);

        // 提取统计数据
        console.log('【提取统计数据】');
        const stats = await extractor.extractStats(screenshotPath);

        console.log(`播放量: ${stats.views || 0}`);
        console.log(`完播率: ${stats.completionRate || 0}%`);
        console.log(`平均播放时长: ${stats.avgPlayTime || 0}`);
        console.log(`点赞: ${stats.likes || 0}`);
        console.log(`收藏: ${stats.favorites || 0}`);
        console.log(`评论: ${stats.comments || 0}`);
        console.log(`新增关注: ${stats.newFollowers || 0}`);

        // 终止OCR
        const ocr = getOCRHelper();
        await ocr.terminate();

    } catch (error) {
        console.error('提取失败:', error);
    }
}

extractData();
