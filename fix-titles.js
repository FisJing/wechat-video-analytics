const { getOCRHelper } = require('./src/utils/ocr.js');
const { cleanVideoTitle } = require('./simple-title-cleaner.js');
const fs = require('fs');
const path = require('path');

async function fixVideoTitles() {
    console.log('正在重新提取视频标题...\n');

    const ocr = getOCRHelper();
    await ocr.init();

    // 读取现有数据
    const dataFile = path.join(__dirname, 'output', 'all_videos_data.json');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 处理每个视频
    for (let i = 0; i < data.length; i++) {
        const video = data[i];
        const screenshotFile = path.join(__dirname, `video_${video.videoIndex}.png`);

        if (fs.existsSync(screenshotFile)) {
            console.log(`[${video.videoIndex}] 处理视频 ${video.videoIndex}...`);

            const text = await ocr.recognize(screenshotFile);
            const lines = text.split('\n');

            // 提取视频标题 - 在"数据分析"之后
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();

                if ((line.includes('数据') && (line.includes('分') && line.includes('析'))) ||
                    (line.includes('更多') && line.includes('数据'))) {

                    for (let k = j + 1; k < Math.min(lines.length, j + 4); k++) {
                        const titleLine = lines[k].trim();
                        if (titleLine === '') continue;

                        if (titleLine.length > 5 &&
                            !titleLine.includes('播放') &&
                            !titleLine.includes('sx') &&
                            !titleLine.match(/^\d{2}:\d{2}/)) {

                            // 使用简化的清理函数
                            const cleanedTitle = cleanVideoTitle(titleLine);
                            video.videoTitle = cleanedTitle;
                            console.log(`  ✓ 标题: ${cleanedTitle}`);
                            break;
                        }
                    }
                    break;
                }
            }
        } else {
            console.log(`[${video.videoIndex}] 截图不存在，跳过`);
        }
    }

    // 保存更新后的数据
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✓ 标题已更新！');
    console.log(`✓ 数据已保存到: ${dataFile}`);

    await ocr.terminate();
}

fixVideoTitles().catch(console.error);
