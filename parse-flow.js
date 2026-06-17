/**
 * 解析mitmproxy抓包数据
 * 提取微信视频分析数据
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class FlowParser {
    constructor(flowFile) {
        this.flowFile = flowFile;
        this.videoData = [];
    }

    /**
     * 使用mitmdump工具解析flow文件
     */
    async parse() {
        return new Promise((resolve, reject) => {
            console.log('正在解析抓包数据...');

            const cmd = `mitmproxy\\mitmdump.exe -nr "${this.flowFile}" -t json`;

            exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('解析失败:', error);
                    reject(error);
                    return;
                }

                try {
                    const lines = stdout.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            this.extractVideoData(data);
                        } catch (e) {
                            // 跳过解析失败的行
                        }
                    }

                    this.saveResults();
                    resolve(this.videoData);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    /**
     * 从请求中提取视频数据
     */
    extractVideoData(data) {
        try {
            // 检查是否是视频分析相关的请求
            const url = data.request?.url || '';

            if (url.includes('finder.mp.qq.com') ||
                url.includes('channels.weixin.qq.com') ||
                url.includes('video')) {

                // 提取响应数据
                const responseText = data.response?.content?.text || '';

                if (responseText) {
                    try {
                        const jsonData = JSON.parse(responseText);

                        // 提取视频数据字段
                        const videoInfo = {
                            url: url,
                            timestamp: new Date(data.request?.timestamp_start * 1000).toISOString(),
                            data: jsonData
                        };

                        this.videoData.push(videoInfo);
                        console.log(`✓ 发现视频数据: ${url}`);
                    } catch (e) {
                        // 不是JSON格式，跳过
                    }
                }
            }
        } catch (error) {
            // 忽略错误
        }
    }

    /**
     * 保存结果
     */
    saveResults() {
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFile = path.join(outputDir, 'video_analysis_data.json');
        fs.writeFileSync(outputFile, JSON.stringify(this.videoData, null, 2), 'utf8');

        console.log(`\n✓ 解析完成！`);
        console.log(`✓ 发现 ${this.videoData.length} 条视频数据`);
        console.log(`✓ 数据已保存到: ${outputFile}`);
    }
}

// 运行
const flowFile = process.argv[2] || 'video_traffic.flow';
const parser = new FlowParser(flowFile);

parser.parse()
    .then(data => {
        console.log('\n========== 视频数据摘要 ==========');
        data.forEach((item, index) => {
            console.log(`\n[${index + 1}] ${item.url}`);
            console.log(`时间: ${item.timestamp}`);
            if (item.data) {
                console.log('数据:', JSON.stringify(item.data, null, 2).substring(0, 200) + '...');
            }
        });
    })
    .catch(err => {
        console.error('解析出错:', err);
        process.exit(1);
    });
