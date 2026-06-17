/**
 * 快速修正单个视频标题
 */

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'output', 'all_videos_data.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// 显示当前数据
console.log('\n当前视频标题：\n');
data.forEach((v, i) => {
    console.log(`[${v.videoIndex}] ${v.videoTitle || '(空)'} - 播放:${v.playCount}`);
});

console.log('\n使用方法：');
console.log('node manual-corrector.js  // 交互式修正所有标题');
console.log('\n或直接编辑文件：output/all_videos_data.json');
