/**
 * 数据存储模块
 * 负责将抓取的数据保存为Excel文件
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class StatsStorage {
    constructor(outputDir) {
        this.outputDir = outputDir;

        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    /**
     * 保存数据到Excel
     */
    saveToExcel(videos, filename = null) {
        // 生成文件名（带日期）
        if (!filename) {
            const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
            filename = `stats_${date}.xlsx`;
        }

        const outputPath = path.join(this.outputDir, filename);

        // 准备数据
        const data = videos.map((v, i) => ({
            '序号': v['序号'] || i + 1,
            '视频标题': v['视频标题'] || v.title || '未识别',
            '播放量': v['播放量'] || v.views || 0,
            '完播率': v['完播率'] || 0,
            '平均播放时长': v['平均播放时长'] || 0,
            '点赞': v['点赞'] || v.likes || 0,
            '收藏': v['收藏'] || v.favorites || 0,
            '评论': v['评论'] || v.comments || 0,
            '新增关注': v['新增关注'] || 0,
            '抓取时间': v['抓取时间'] || v.fetchTime || new Date().toISOString()
        }));

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // 设置列宽
        ws['!cols'] = [
            { wch: 8 },   // 序号
            { wch: 40 },  // 视频标题
            { wch: 12 },  // 播放量
            { wch: 12 },  // 完播率
            { wch: 15 },  // 平均播放时长
            { wch: 12 },  // 点赞
            { wch: 12 },  // 收藏
            { wch: 12 },  // 评论
            { wch: 12 },  // 新增关注
            { wch: 20 }   // 抓取时间
        ];

        // 添加工作表
        XLSX.utils.book_append_sheet(wb, ws, '视频数据');

        // 写入文件
        XLSX.writeFile(wb, outputPath);

        console.log(`✓ 数据已保存: ${outputPath}`);
        console.log(`  共 ${videos.length} 条记录`);

        return outputPath;
    }

    /**
     * 加载已有的数据
     */
    loadExisting(filename) {
        const filePath = path.join(this.outputDir, filename);

        if (!fs.existsSync(filePath)) {
            return [];
        }

        try {
            const wb = XLSX.readFile(filePath);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            return data;
        } catch (error) {
            console.error('加载现有数据失败:', error);
            return [];
        }
    }

    /**
     * 合并新旧数据（增量更新）
     */
    mergeData(oldVideos, newVideos) {
        const merged = [];
        const oldMap = new Map();

        // 建立旧数据的映射
        for (const v of oldVideos) {
            const key = v['视频标识'] || v.hash;
            if (key) {
                oldMap.set(key, v);
            }
        }

        // 合并数据
        for (const newVideo of newVideos) {
            const key = newVideo.hash || newVideo.id;
            const oldVideo = oldMap.get(key);

            if (oldVideo) {
                // 已存在的视频，更新数据
                merged.push({
                    ...newVideo,
                    deltaLikes: (newVideo.likes || 0) - (oldVideo['点赞'] || 0),
                    deltaComments: (newVideo.comments || 0) - (oldVideo['评论'] || 0),
                    lastFetchTime: oldVideo['抓取时间']
                });
            } else {
                // 新视频
                merged.push({
                    ...newVideo,
                    deltaLikes: 0,
                    deltaComments: 0
                });
            }
        }

        return merged;
    }

    /**
     * 保存抓取历史
     */
    saveHistory(videos, date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const historyFile = path.join(this.outputDir, 'history.json');

        let history = {};
        try {
            if (fs.existsSync(historyFile)) {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            }
        } catch (error) {
            // 忽略错误
        }

        history[dateStr] = {
            count: videos.length,
            timestamp: date.toISOString()
        };

        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    }
}

module.exports = StatsStorage;
