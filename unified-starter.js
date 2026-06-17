/**
 * 微信视频号统一启动器
 * 在一个窗口中启动所有三个服务
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 设备列表（需要自动重连的设备）
const DEVICES = [
    '192.168.31.163:5555',
    '192.168.31.167:5555'
];

// 服务配置
const services = [
    {
        name: '📺 视频发布',
        port: 3000,
        path: 'C:/Users/Lremi/Desktop/微信视频号矩阵发布系统/group-control/server.js',
        color: '\x1b[36m' // 青色
    },
    {
        name: '👍 点赞互动',
        port: 3001,
        path: 'C:/Users/Lremi/Desktop/wechat-视频互动/server.js',
        color: '\x1b[32m' // 绿色
    },
    {
        name: '📊 视频收集',
        port: 3002,
        path: 'C:/Users/Lremi/Desktop/wechat-视频抓取/web-server/server-stats.js',
        color: '\x1b[33m' // 黄色
    }
];

const processes = [];

console.log('\x1b[36m%s\x1b[0m', '========================================');
console.log('\x1b[36m%s\x1b[0m', '  微信视频号系统 - 统一启动');
console.log('\x1b[36m%s\x1b[0m', '========================================');
console.log('');

// 自动重连ADB设备
async function reconnectDevices() {
    console.log('\x1b[33m%s\x1b[0m', '[自动重连] 正在检查ADB设备连接状态...\n');

    for (const deviceId of DEVICES) {
        try {
            // 尝试连接设备
            await new Promise((resolve, reject) => {
                exec(`adb connect ${deviceId}`, (error, stdout, stderr) => {
                    if (error) {
                        console.log('\x1b[31m%s\x1b[0m', `  ✗ ${deviceId} - 连接失败`);
                        resolve();
                    } else {
                        if (stdout.includes('connected')) {
                            console.log('\x1b[32m%s\x1b[0m', `  ✓ ${deviceId} - 已连接`);
                        } else {
                            console.log('\x1b[33m%s\x1b[0m', `  ⚠ ${deviceId} - ${stdout.trim()}`);
                        }
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', `  ✗ ${deviceId} - 错误: ${error.message}`);
        }
    }

    console.log('');
}

// 启动前先重连设备
reconnectDevices().then(() => {

// 启动所有服务
services.forEach((service, index) => {
    console.log(`正在启动 ${service.name} (端口 ${service.port})...`);

    const proc = spawn('node', [service.path], {
        cwd: path.dirname(service.path),
        shell: true
    });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(service.color, `[${service.name}]`, '\x1b[0m', line);
            }
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log('\x1b[31m', `[${service.name} ERROR]`, '\x1b[0m', line);
            }
        });
    });

    proc.on('close', (code) => {
        console.log('\x1b[31m', `[${service.name}] 进程退出，代码: ${code}`, '\x1b[0m');
    });

    processes.push(proc);
});

// 等待所有服务启动
setTimeout(() => {
    console.log('');
    console.log('\x1b[36m%s\x1b[0m', '========================================');
    console.log('\x1b[32m%s\x1b[0m', '✅ 所有服务已启动！');
    console.log('\x1b[36m%s\x1b[0m', '========================================');
    console.log('');
    console.log('请在浏览器访问：');
    services.forEach(service => {
        console.log(service.color, `  ${service.name}: http://localhost:${service.port}`, '\x1b[0m');
    });
    console.log('');
    console.log('\x1b[33m%s\x1b[0m', '按 Ctrl+C 停止所有服务');
    console.log('');
}, 3000);

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在停止所有服务...');
    processes.forEach(proc => {
        proc.kill('SIGTERM');
    });
    setTimeout(() => {
        console.log('所有服务已停止');
        process.exit(0);
    }, 1000);
});

}); // reconnectDevices().then() 结束
