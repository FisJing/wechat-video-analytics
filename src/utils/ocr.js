/**
 * OCR识别工具模块
 * 使用Tesseract.js进行文字识别
 */

const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

class OCRHelper {
    constructor() {
        this.worker = null;
        this.initialized = false;
    }

    /**
     * 初始化OCR worker
     */
    async init() {
        if (this.initialized) return;

        console.log('初始化OCR引擎...');
        // 支持中文、英文、俄语
        this.worker = await Tesseract.createWorker('chi_sim+eng+rus', 1, {
            logger: m => {
                if (m.status === 'loading language traineddata') {
                    console.log('  加载语言包:', Math.round(m.progress * 100) + '%');
                }
            }
        });
        this.initialized = true;
        console.log('✓ OCR引擎初始化完成（支持中文/英文/俄语）');
    }

    /**
     * 识别图像中的文字
     */
    async recognize(imagePath) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            // 使用优化参数提高中文识别准确度
            const { data: { text, confidence } } = await this.worker.recognize(imagePath, {
                tessedit_ocr_engine_mode: '1', // 使用LSTM OCR引擎
                tessedit_pageseg_mode: '6', // 假设为统一文本块
            }, {
                text: true,
                blocks: false,
                hocr: false,
                tsv: false
            });

            // 如果识别置信度太低，记录警告
            if (confidence < 70) {
                console.warn(`  ⚠ 识别置信度较低: ${confidence.toFixed(1)}%`);
            }

            return text;
        } catch (error) {
            console.error('OCR识别失败:', error);
            return '';
        }
    }

    /**
     * 识别图像区域中的文字
     */
    async recognizeRegion(imagePath, region) {
        const image = await Jimp.read(imagePath);
        const cropped = image.clone().crop(
            region.x,
            region.y,
            region.width,
            region.height
        );

        const buffer = await cropped.getBufferAsync(Jimp.MIME_PNG);
        const { data: { text } } = await this.worker.recognize(buffer);
        return text;
    }

    /**
     * 解析数字（支持"1.2万"、"5.3亿"等格式）
     */
    parseNumber(text) {
        // 清理文本，只保留数字、小数点和中文单位
        const cleaned = text.replace(/[^\d.万千百十亿]/g, '');

        // 匹配数字和单位
        const match = cleaned.match(/([\d.]+)\s*([万千百十亿])?/);

        if (!match) return 0;

        let num = parseFloat(match[1]);

        // 单位转换
        if (match[2] === '千') num *= 1000;
        if (match[2] === '万') num *= 10000;
        if (match[2] === '亿') num *= 100000000;

        return Math.round(num);
    }

    /**
     * 终止worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.initialized = false;
        }
    }
}

// 单例模式
let ocrInstance = null;

function getOCRHelper() {
    if (!ocrInstance) {
        ocrInstance = new OCRHelper();
    }
    return ocrInstance;
}

module.exports = { OCRHelper, getOCRHelper };
