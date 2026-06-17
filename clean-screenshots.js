/**
 * 清理截图文件脚本
 * 手动清理所有 video_*.png 截图文件
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  截图文件清理工具');
console.log('========================================\n');

// 查找所有截图文件
const currentDir = __dirname;
const files = fs.readdirSync(currentDir);
const screenshots = files.filter(f => f.match(/^video_\d+\.png$/));

if (screenshots.length === 0) {
    console.log('✓ 当前目录没有截图文件需要清理\n');
    process.exit(0);
}

console.log(`找到 ${screenshots.length} 个截图文件：`);
screenshots.forEach((f, i) => {
    const stats = fs.statSync(path.join(currentDir, f));
    const size = (stats.size / 1024).toFixed(1);
    console.log(`  ${i + 1}. ${f} (${size} KB)`);
});

console.log('\n是否要删除这些文件？');
console.log('输入 Y 确认删除，其他键取消');

// 从命令行读取输入
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        let deleted = 0;
        screenshots.forEach(f => {
            try {
                fs.unlinkSync(path.join(currentDir, f));
                deleted++;
                console.log(`✓ 已删除: ${f}`);
            } catch (error) {
                console.log(`✗ 删除失败: ${f} - ${error.message}`);
            }
        });
        console.log(`\n✓ 共清理 ${deleted} 个截图文件`);
    } else {
        console.log('\n✗ 已取消删除');
    }
    rl.close();
});
