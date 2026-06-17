/**
 * 视频扫描器模块
 * 扫描视频列表、检测可见视频、滚动加载更多
 */

const Jimp = require('jimp');

class VideoScanner {
    constructor(positions, adb, config) {
        this.positions = positions;
        this.adb = adb;
        this.config = config;
        this.maxScrolls = config.maxScrolls || 999;
        this.scrollDelay = config.scrollDelay || 2000;
        this.noNewVideoThreshold = config.noNewVideoThreshold || 3;
    }

    /**
     * 扫描所有视频
     */
    async scanAllVideos() {
        const allVideos = [];
        const seenHashes = new Set();
        let noNewCount = 0;

        console.log('开始扫描视频列表...');
        console.log(`  最大滚动次数: ${this.maxScrolls}`);
        console.log(`  连续无新视频停止阈值: ${this.noNewVideoThreshold}`);

        for (let scroll = 0; scroll < this.maxScrolls && noNewCount < this.noNewVideoThreshold; scroll++) {
            console.log(`  [滚动 ${scroll + 1}/${this.maxScrolls}]`);

            // 截图当前屏幕
            const screenshotPath = await this.screenshot();
            const videos = await this.detectVisibleVideos(screenshotPath);

            let newCount = 0;
            for (const video of videos) {
                if (!seenHashes.has(video.hash)) {
                    allVideos.push(video);
                    seenHashes.add(video.hash);
                    newCount++;
                }
            }

            console.log(`    发现 ${videos.length} 个视频，新增 ${newCount} 个`);

            if (newCount === 0) {
                noNewCount++;
            } else {
                noNewCount = 0;
            }

            // 滚动加载更多
            if (scroll < this.maxScrolls - 1) {
                await this.scrollUp();
                await this.sleep(this.scrollDelay);
            }
        }

        console.log(`✓ 扫描完成，共发现 ${allVideos.length} 个视频`);
        return allVideos;
    }

    /**
     * 检测当前屏幕可见的视频
     */
    async detectVisibleVideos(screenshotPath) {
        const image = await Jimp.read(screenshotPath);
        const videos = [];

        const { startY, itemHeight, itemWidth, columns } = this.positions;

        // 扫描视频网格（假设每行2个）
        for (let row = 0; row < 5; row++) {  // 最多检测5行
            for (let col = 0; col < columns; col++) {
                const x = col * (itemWidth / columns) + 100;
                const y = startY + row * itemHeight + 200;

                // 裁剪缩略图区域
                try {
                    const thumb = image.clone().crop(
                        x - 50,
                        y - 200,
                        itemWidth / columns - 100,
                        350
                    );

                    // 计算哈希作为唯一标识
                    const hash = await this.computePHash(thumb);

                    videos.push({
                        x,
                        y,
                        hash,
                        row,
                        col
                    });
                } catch (error) {
                    // 可能超出边界，忽略
                    continue;
                }
            }
        }

        return videos;
    }

    /**
     * 计算感知哈希（pHash）
     * 用于唯一标识视频封面
     */
    async computePHash(image) {
        // 缩放到32x32
        const small = image.resize(32, 32);

        // 转灰度
        small.grayscale();

        // 获取像素数据
        const pixels = [];
        small.scan(0, 0, 32, 32, (x, y, idx) => {
            pixels.push(small.bitmap.data[idx]);
        });

        // 计算均值
        const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

        // 生成哈希
        const hash = pixels.map(p => p > avg ? '1' : '0').join('');

        return hash;
    }

    /**
     * 比较两个哈希的相似度
     */
    hammingDistance(hash1, hash2) {
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] !== hash2[i]) {
                distance++;
            }
        }
        return distance;
    }

    /**
     * 截图
     */
    async screenshot() {
        const timestamp = Date.now();
        const filename = `/tmp/screen_${timestamp}.png`;
        this.adb(`exec-out screencap -p > "${filename}"`);
        return filename;
    }

    /**
     * 向上滑动
     */
    async scrollUp() {
        const [x1, y1] = this.positions.scrollStart || [540, 2000];
        const [x2, y2] = this.positions.scrollEnd || [540, 500];
        const duration = this.positions.scrollDuration || 300;
        this.adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    }

    /**
     * 睡眠
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = VideoScanner;
