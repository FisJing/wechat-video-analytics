/**
 * 数据提取器模块
 * 从视频详情页提取点赞、评论等数据
 */

const Jimp = require('jimp');
const { getOCRHelper } = require('../utils/ocr.js');

class DataExtractor {
    constructor(positions) {
        this.positions = positions;
        this.ocr = getOCRHelper();
    }

    /**
     * 提取视频标题
     */
    async extractTitle(screenshotPath) {
        try {
            const image = await Jimp.read(screenshotPath);
            const titleArea = this.positions.titleArea || {
                x: 50,
                y: 150,
                w: 980,
                h: 100
            };

            // 裁剪标题区域
            const titleRegion = image.clone().crop(
                titleArea.x,
                titleArea.y,
                titleArea.w,
                titleArea.h
            );

            // OCR识别
            const buffer = await titleRegion.getBufferAsync(Jimp.MIME_PNG);
            const text = await this.ocr.recognize(buffer);

            // 清理标题文本
            const title = text.trim()
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .substring(0, 100);  // 限制长度

            return title || '无标题';
        } catch (error) {
            console.error('标题提取失败:', error.message);
            return '识别失败';
        }
    }

    /**
     * 从截图提取视频统计数据
     */
    async extractStats(screenshotPath) {
        const image = await Jimp.read(screenshotPath);
        const stats = {};

        // 先尝试多种Y坐标位置
        const possibleYPositions = [2200, 2300, 2100, 2000];

        // 提取每个数据项
        for (const item of this.positions.items) {
            let bestValue = 0;

            // 优先使用新配置格式
            if (item.x && item.y && item.w && item.h) {
                try {
                    const region = image.clone().crop(item.x, item.y, item.w, item.h);
                    const buffer = await region.getBufferAsync(Jimp.MIME_PNG);
                    const text = await this.ocr.recognize(buffer);
                    const value = this.ocr.parseNumber(text);
                    if (value > 0) {
                        stats[item.name] = value;
                        continue;
                    }
                } catch (error) {
                    // 继续尝试旧方法
                }
            }

            // 使用旧方法尝试多个位置
            for (const y of possibleYPositions) {
                try {
                    // 裁剪对应区域（加大宽度）
                    const region = image.clone().crop(
                        item.xOffset - 100,  // 左边距
                        y,                   // Y坐标
                        200,                 // 宽度
                        this.positions.height || 200  // 高度
                    );

                    // OCR识别
                    const buffer = await region.getBufferAsync(Jimp.MIME_PNG);
                    const text = await this.ocr.recognize(buffer);

                    // 解析数字
                    const value = this.ocr.parseNumber(text);

                    // 如果找到非零值，使用这个值
                    if (value > 0) {
                        bestValue = value;
                        break;
                    }

                } catch (error) {
                    // 尝试下一个位置
                    continue;
                }
            }

            stats[item.name] = bestValue;
        }

        return stats;
    }

    /**
     * 检查是否在视频详情页
     */
    async checkIfVideoPage(screenshotPath) {
        // 通过检测特定元素来判断是否在视频详情页
        // 这里可以检测返回按钮、视频播放器等特征
        return true; // 简化处理，假设总是在正确页面
    }
}

module.exports = DataExtractor;
