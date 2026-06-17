/**
 * 自动获取界面文本 - 无需OCR
 * 使用UIAutomator dump获取所有UI元素的文本
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class AutoTextExtractor {
    constructor(deviceId) {
        this.deviceId = deviceId;
    }

    /**
     * 获取界面所有文本
     */
    async getTexts() {
        console.log('正在获取界面文本...');

        try {
            // 使用uiautomator dump获取UI元素
            await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/ui.xml`);

            // 拉取到本地
            const localFile = path.join(__dirname, '../../temp_ui.xml');
            await execAsync(`adb -s ${this.deviceId} pull /sdcard/ui.xml "${localFile}"`);

            // 读取XML
            const xml = fs.readFileSync(localFile, 'utf8');

            // 提取所有text属性
            const texts = [];
            const textMatches = xml.match(/text="[^"]*"/g);

            if (textMatches) {
                textMatches.forEach(match => {
                    const text = match.replace('text="', '').replace('"', '').trim();
                    if (text && text.length > 0) {
                        texts.push(text);
                    }
                });
            }

            // 提取所有content-desc属性
            const descMatches = xml.match(/content-desc="[^"]*"/g);
            if (descMatches) {
                descMatches.forEach(match => {
                    const desc = match.replace('content-desc="', '').replace('"', '').trim();
                    if (desc && desc.length > 0 && !texts.includes(desc)) {
                        texts.push(desc);
                    }
                });
            }

            console.log(`✓ 获取到 ${texts.length} 个文本元素`);
            return texts;

        } catch (error) {
            console.error('获取文本失败:', error.message);
            return [];
        }
    }

    /**
     * 提取视频标题（智能识别）
     */
    async extractVideoTitle() {
        const texts = await this.getTexts();

        console.log('\n========== 所有文本 ==========');
        texts.forEach((text, i) => {
            console.log(`[${i}] ${text}`);
        });
        console.log('================================\n');

        // 智能识别标题
        let title = '';

        // 1. 查找包含产品型号的文本
        for (const text of texts) {
            if (/[A-Z]{2,}\d+[A-Z0-9\-]/.test(text) && /[一-龥]/.test(text)) {
                title = text;
                break;
            }
        }

        // 2. 如果没找到，找包含中文的最长文本
        if (!title) {
            const chineseTexts = texts.filter(t => /[一-龥]/.test(t) && t.length > 5);
            if (chineseTexts.length > 0) {
                title = chineseTexts.sort((a, b) => b.length - a.length)[0];
            }
        }

        return title;
    }
}

module.exports = AutoTextExtractor;
