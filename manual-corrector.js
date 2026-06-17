/**
 * 手动修正视频标题工具
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const dataFile = path.join(__dirname, 'output', 'all_videos_data.json');

async function manualCorrect() {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    console.log('\n========================================');
    console.log('  视频标题手动修正工具');
    console.log('========================================\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
        rl.question(prompt, resolve);
    });

    for (let i = 0; i < data.length; i++) {
        const video = data[i];

        console.log(`\n【视频 ${video.videoIndex}】`);
        console.log(`当前标题: ${video.videoTitle || '(空)'}`);
        console.log(`播放量: ${video.playCount}`);
        console.log(`点赞: ${video.likeCount}, 评论: ${video.commentCount}, 收藏: ${video.collectCount}`);

        const input = await question('请输入正确标题（直接回车跳过）: ');

        if (input.trim()) {
            video.videoTitle = input.trim();
            console.log(`✓ 已更新: ${video.videoTitle}`);
        }
    }

    rl.close();

    // 保存
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✓ 所有修改已保存！');
}

manualCorrect().catch(console.error);
