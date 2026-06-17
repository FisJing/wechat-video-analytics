const { getOCRHelper } = require('./src/utils/ocr.js');
const fs = require('fs');
const path = require('path');

async function extractVideoData(imagePath) {
    const ocr = getOCRHelper();

    console.log('初始化OCR引擎...');
    await ocr.init();

    console.log('正在识别视频分析数据...');
    const text = await ocr.recognize(imagePath);

    console.log('\n========== 原始识别结果 ==========\n');
    console.log(text);
    console.log('\n==================================\n');

    // 解析数据 - 改进的正则表达式
    const lines = text.split('\n');
    const data = {
        rawText: text,
        videoTitle: '',  // 新增：视频名称
        playCount: 0,
        playCompleteRate: '',
        avgPlayDuration: '',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        collectCount: 0,
        publishTime: ''
    };

    // 提取视频标题
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检测"数据"和"分析"或"更多数据"
        if ((line.includes('数据') && (line.includes('分') && line.includes('析'))) ||
            (line.includes('更多') && line.includes('数据'))) {

            // 标题通常在这之后的下一行（有时候会有空行）
            for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
                const titleLine = lines[j].trim();

                // 过滤掉时间、数字等非标题行，跳过空行
                if (titleLine === '') continue;

                // 找到第一个符合条件的行作为标题
                if (titleLine.length > 5 &&
                    !titleLine.includes('播放') &&
                    !titleLine.includes('sx') &&
                    !titleLine.match(/^\d{2}:\d{2}/)) {
                    data.videoTitle = titleLine;
                    break;
                }
            }
            break;
        }
    }

    // 逐行解析
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 播放量 (格式: "播放 量 完 播 率\n22 38.10%")
        if (line.includes('播放') && line.includes('量')) {
            // 下一行包含数值
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                const parts = nextLine.split(/\s+/);
                if (parts.length >= 1) {
                    data.playCount = ocr.parseNumber(parts[0]);
                }
                if (parts.length >= 2) {
                    data.playCompleteRate = parts[1];
                }
            }
        }

        // 平均播放时长
        if (line.includes('平均') && line.includes('播放')) {
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                data.avgPlayDuration = nextLine;
            }
        }

        // 发布时间
        if (line.includes('年') && line.includes('月') && line.includes('日')) {
            data.publishTime = line;
        }

        // 评论 (格式: "评论 新 增 关 注\n0 0")
        if (line.includes('评论') && line.includes('新增')) {
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                const parts = nextLine.split(/\s+/);
                if (parts.length >= 1) {
                    data.commentCount = ocr.parseNumber(parts[0]);
                }
            }
        }

        // 互动数据 (格式: "互动 数据 ©\nS 四\n1 3")
        // 检测"互动"关键词，然后提取下两行的数字
        if (line.includes('互动') && line.includes('数据')) {
            // 下两行包含互动数据
            if (i + 2 < lines.length) {
                const dataLine = lines[i + 2].trim();
                const parts = dataLine.split(/\s+/);
                if (parts.length >= 1) {
                    data.likeCount = ocr.parseNumber(parts[0]);
                }
                if (parts.length >= 2) {
                    data.collectCount = ocr.parseNumber(parts[1]);
                }
            }
        }
    }

    // 保存数据
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, 'video_data.json');
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

    console.log('✓ 数据已保存到:', outputFile);
    console.log('\n========== 解析结果 ==========');
    console.log('视频名称:', data.videoTitle);
    console.log('播放量:', data.playCount);
    console.log('完播率:', data.playCompleteRate);
    console.log('平均播放时长:', data.avgPlayDuration);
    console.log('点赞数:', data.likeCount);
    console.log('评论数:', data.commentCount);
    console.log('转发数:', data.shareCount);
    console.log('收藏数:', data.collectCount);
    console.log('发布时间:', data.publishTime);

    await ocr.terminate();
    return data;
}

function extractText(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
}

// 运行
const imagePath = process.argv[2] || 'video_analysis_screen.png';
extractVideoData(imagePath).catch(console.error);
