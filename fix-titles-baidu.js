/**
 * 使用百度OCR重新提取视频标题
 * 准确率95%+
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 百度OCR配置
let API_KEY = '';
let SECRET_KEY = '';
let ACCESS_TOKEN = '';

// 加载配置
function loadConfig() {
    const configFile = path.join(__dirname, 'baidu-ocr.config.json');

    if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        API_KEY = config.apiKey;
        SECRET_KEY = config.secretKey;
        return true;
    }

    return false;
}

// 获取Access Token
async function getAccessToken() {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;

    try {
        const response = await axios.post(url);
        ACCESS_TOKEN = response.data.access_token;
        console.log('✓ Access Token获取成功');
        return ACCESS_TOKEN;
    } catch (error) {
        console.error('✗ 获取Access Token失败:', error.response?.data || error.message);
        throw error;
    }
}

// 使用百度OCR识别图片
async function recognizeWithBaidu(imagePath) {
    if (!ACCESS_TOKEN) {
        await getAccessToken();
    }

    try {
        // 读取图片并转base64
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');

        // 调用百度OCR API（高精度版本）
        const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${ACCESS_TOKEN}`;

        const response = await axios.post(url, `image=${encodeURIComponent(imageBase64)}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // 提取文字
        const words = response.data.words_result.map(item => item.words);
        return words.join('\n');

    } catch (error) {
        console.error('✗ OCR识别失败:', error.response?.data || error.message);
        return '';
    }
}

// 提取视频标题（从百度OCR识别结果）
function extractTitleFromText(text) {
    const lines = text.split('\n');

    // 查找"数据分析"或"更多数据"之后的内容
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('数据') && (line.includes('分') && line.includes('析'))) {
            // 标题在之后1-5行，查找最完整的一行
            const titleLines = [];

            for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
                const titleLine = lines[j].trim();

                // 跳过空行、播放相关、时间相关、数据相关的内容
                if (!titleLine ||
                    titleLine.includes('播放') ||
                    titleLine.includes('年') ||
                    titleLine.includes('数据') ||
                    titleLine.includes('更多')) {
                    continue;
                }

                // 收集可能的标题行（至少包含产品型号或中文）
                if (titleLine.length > 5 && (/[A-Z]{2,}\d/i.test(titleLine) || /[一-龥]/.test(titleLine))) {
                    titleLines.push(titleLine);
                }
            }

            // 找到最长且包含中文的行作为标题
            if (titleLines.length > 0) {
                // 优先选择包含中文的标题
                const chineseTitles = titleLines.filter(t => /[一-龥]/.test(t));

                if (chineseTitles.length > 0) {
                    // 返回最长的中文标题
                    return chineseTitles.sort((a, b) => b.length - a.length)[0];
                }

                // 如果没有中文，返回最长的标题
                return titleLines.sort((a, b) => b.length - a.length)[0];
            }
        }
    }

    return '';
}

// 主函数
async function main() {
    console.log('\n========================================');
    console.log('  百度OCR提取视频标题');
    console.log('========================================\n');

    // 加载配置
    if (!loadConfig()) {
        console.error('✗ 未找到配置文件！');
        console.log('\n请按以下步骤配置：');
        console.log('1. 复制 baidu-ocr.config.example.json 为 baidu-ocr.config.json');
        console.log('2. 编辑 baidu-ocr.config.json，填入您的API_KEY和SECRET_KEY');
        console.log('3. 重新运行此脚本');
        console.log('\n详细说明请查看：百度OCR配置指南.md');
        process.exit(1);
    }

    // 读取现有数据
    const dataFile = path.join(__dirname, 'output', 'all_videos_data.json');
    if (!fs.existsSync(dataFile)) {
        console.error('✗ 数据文件不存在，请先抓取视频数据');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 获取Access Token
    await getAccessToken();

    // 处理每个视频
    for (let i = 0; i < data.length; i++) {
        const video = data[i];
        const screenshotFile = path.join(__dirname, `video_${video.videoIndex}.png`);

        if (fs.existsSync(screenshotFile)) {
            console.log(`\n[${video.videoIndex}] 处理视频 ${video.videoIndex}...`);

            // 使用百度OCR识别
            const text = await recognizeWithBaidu(screenshotFile);

            if (text) {
                // 提取标题
                const title = extractTitleFromText(text);
                video.videoTitle = title;
                console.log(`  ✓ 标题: ${title}`);
            } else {
                console.log(`  ✗ 识别失败`);
            }

            // 等待一下，避免请求过快
            await new Promise(resolve => setTimeout(resolve, 200));

        } else {
            console.log(`[${video.videoIndex}] 截图不存在，跳过`);
        }
    }

    // 保存更新后的数据
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n========================================');
    console.log('✓ 标题已更新！');
    console.log(`✓ 数据已保存到: ${dataFile}`);
    console.log('========================================\n');
}

main().catch(console.error);
