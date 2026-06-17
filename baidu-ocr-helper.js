/**
 * 百度OCR识别 - 更高的准确率
 * 需要先注册百度智能云账号并创建OCR应用
 * 文档：https://cloud.baidu.com/doc/OCR/s/1k3h7y3db
 */

const axios = require('axios');
const fs = require('fs');

class BaiduOCR {
    constructor(apiKey, secretKey) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.accessToken = null;
    }

    /**
     * 获取access_token
     */
    async getAccessToken() {
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`;

        const response = await axios.post(url);
        this.accessToken = response.data.access_token;
        return this.accessToken;
    }

    /**
     * 通用文字识别（高精度版）
     */
    async recognizeText(imagePath) {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        // 读取图片并转base64
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');

        const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${this.accessToken}`;

        const response = await axios.post(url, `image=${encodeURIComponent(imageBase64)}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // 提取文字
        const words = response.data.words_result.map(item => item.words);
        return words.join('\n');
    }
}

module.exports = BaiduOCR;

/*
使用示例：

const BaiduOCR = require('./baidu-ocr-helper.js');

const ocr = new BaiduOCR(
    '您的API_KEY',
    '您的SECRET_KEY'
);

ocr.recognizeText('video_1.png').then(text => {
    console.log('识别结果:', text);
});

*/
