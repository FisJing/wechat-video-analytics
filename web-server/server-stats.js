/**
 * 视频数据收集Web服务
 * 端口: 3002
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3002;

// 静态文件
app.use(express.static(path.join(__dirname, 'web')));
app.use(express.json());

// 数据目录
const DATA_DIR = path.join(__dirname, '../output');
const ACCOUNTS = ['xin', 'zheng'];

// 存储当前抓取进程
let fetchProcess = null;

// ============ API 接口 ============

// 获取设备列表（从视频发布系统获取配置）
app.get('/api/devices', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const http = require('http');

        // 先从视频发布系统获取设备配置
        const deviceConfig = await new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/device-config',
                method: 'GET',
                timeout: 3000
            };

            const request = http.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({});
                    }
                });
            });

            request.on('error', () => resolve({}));
            request.on('timeout', () => { request.destroy(); resolve({}); });
            request.end();
        });

        exec('adb devices -l', (error, stdout, stderr) => {
            if (error) {
                res.json({ success: false, error: '获取设备列表失败' });
                return;
            }

            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
            const devices = [];

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2 && parts[1] === 'device') {
                    const deviceId = parts[0];
                    let model = 'Unknown';
                    let brand = 'Unknown';

                    // 解析设备信息
                    for (let i = 2; i < parts.length; i++) {
                        if (parts[i].includes('model:')) {
                            model = parts[i].split(':')[1];
                        }
                        if (parts[i].includes('device:')) {
                            brand = parts[i].split(':')[1];
                        }
                    }

                    // 从视频发布系统配置获取别名
                    let alias = deviceConfig[deviceId]?.alias || '';

                    devices.push({
                        id: deviceId,
                        name: alias || model || deviceId,
                        status: 'online',
                        model: model,
                        brand: brand
                    });
                }
            }

            res.json({ success: true, devices: devices });
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取最新批量抓取的数据
app.get('/api/batch-data', (req, res) => {
    try {
        const dataFile = path.join(DATA_DIR, 'all_videos_data.json');

        if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            res.json({ success: true, data: data, count: data.length });
        } else {
            res.json({ success: true, data: [], count: 0 });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取最新批量抓取的数据
app.get('/api/batch-data', (req, res) => {
    try {
        const dataFile = path.join(DATA_DIR, 'all_videos_data.json');

        if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            res.json({ success: true, data: data, count: data.length });
        } else {
            res.json({ success: true, data: [], count: 0 });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 下载CSV
app.get('/api/download-csv', (req, res) => {
    try {
        const csvFile = path.join(DATA_DIR, 'all_videos_data.csv');

        if (fs.existsSync(csvFile)) {
            res.download(csvFile);
        } else {
            res.status(404).json({ success: false, error: 'CSV文件不存在，请先抓取数据' });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取所有账号的最新数据
app.get('/api/stats', (req, res) => {
    try {
        const allStats = {};

        for (const account of ACCOUNTS) {
            const accountDir = path.join(DATA_DIR, account);
            if (fs.existsSync(accountDir)) {
                // 查找最新的Excel文件
                const files = fs.readdirSync(accountDir)
                    .filter(f => f.startsWith('stats_') && f.endsWith('.xlsx'))
                    .sort()
                    .reverse();

                if (files.length > 0) {
                    const latestFile = files[0];
                    const filePath = path.join(accountDir, latestFile);
                    const workbook = XLSX.readFile(filePath);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet);

                    allStats[account] = {
                        file: latestFile,
                        count: data.length,
                        data: data,
                        updateTime: fs.statSync(filePath).mtime
                    };
                }
            }
        }

        res.json({ success: true, data: allStats });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取单个账号的历史数据
app.get('/api/history/:account', (req, res) => {
    try {
        const account = req.params.account;
        const historyFile = path.join(DATA_DIR, account, 'history.json');

        if (fs.existsSync(historyFile)) {
            const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            res.json({ success: true, data: history });
        } else {
            res.json({ success: true, data: {} });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 启动抓取任务
app.post('/api/fetch/:account', async (req, res) => {
    try {
        const account = req.params.account;
        const { deviceId, wechatType, videoCount, keepScreenshots } = req.body || {};

        // 如果已有抓取进程在运行，先停止
        if (fetchProcess) {
            fetchProcess.kill('SIGTERM');
            fetchProcess = null;
        }

        // 通知前端开始抓取
        io.emit('fetch-start', { account, videoCount, time: new Date().toISOString() });

        // 异步执行抓取 - 使用新的批量抓取脚本
        const { exec } = require('child_process');
        let command;

        if (deviceId && videoCount) {
            // 使用新的批量抓取脚本
            command = `node "${path.join(__dirname, '../batch-capture.js')}" ${deviceId} ${videoCount}`;
            if (keepScreenshots) {
                command += ' --keep-screenshots';
            }
        } else {
            // 兼容旧方式
            command = `node "${path.join(__dirname, '../src/index.js')}" --account ${account}`;
            if (deviceId) command += ` --device ${deviceId}`;
            if (wechatType !== undefined) command += ` --wechat-type ${wechatType}`;
        }

        fetchProcess = exec(command, { cwd: path.join(__dirname, '..') });

        let output = '';

        fetchProcess.stdout.on('data', (data) => {
            output += data;
            io.emit('fetch-log', { account, data: data.toString() });
        });

        fetchProcess.stderr.on('data', (data) => {
            io.emit('fetch-error', { account, error: data.toString() });
        });

        fetchProcess.on('close', (code) => {
            io.emit('fetch-complete', {
                account,
                code,
                time: new Date().toISOString()
            });
            fetchProcess = null;
        });

        res.json({ success: true, message: `开始抓取 ${account} 账号数据` });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 停止抓取任务
app.post('/api/stop', (req, res) => {
    try {
        if (fetchProcess) {
            // Windows系统需要强制终止进程
            const pid = fetchProcess.pid;
            console.log(`正在停止抓取进程 PID: ${pid}`);

            // 方法1: 尝试优雅停止（发送信号）
            fetchProcess.kill('SIGTERM');

            // 方法2: Windows上使用taskkill强制停止
            if (process.platform === 'win32') {
                setTimeout(() => {
                    try {
                        // 如果进程还在运行，强制终止
                        if (fetchProcess) {
                            const { execSync } = require('child_process');
                            execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
                            console.log(`已强制终止进程 PID: ${pid}`);
                        }
                    } catch (e) {
                        // 进程可能已经停止，忽略错误
                    }
                }, 1000); // 等待1秒，给进程优雅退出的时间
            }

            fetchProcess = null;
            res.json({ success: true, message: '抓取任务已停止' });
        } else {
            res.json({ success: true, message: '没有正在运行的任务' });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 更新设备配置（代理到3000端口）
app.put('/api/device-config/:deviceId', async (req, res) => {
    try {
        const http = require('http');
        const deviceId = req.params.deviceId;

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/device-config/${encodeURIComponent(deviceId)}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const request = http.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    res.json(result);
                } catch (error) {
                    res.json({ success: false, error: '解析响应失败' });
                }
            });
        });

        request.on('error', (error) => {
            res.json({ success: false, error: '无法连接到视频发布系统' });
        });

        request.on('timeout', () => {
            request.destroy();
            res.json({ success: false, error: '连接超时' });
        });

        // 发送请求体
        request.write(JSON.stringify(req.body));
        request.end();
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取日志文件列表
app.get('/api/logs/:account', (req, res) => {
    try {
        const account = req.params.account;
        const logsDir = path.join(DATA_DIR, account, 'logs');

        if (fs.existsSync(logsDir)) {
            const files = fs.readdirSync(logsDir)
                .filter(f => f.endsWith('.log') || f.endsWith('.png'))
                .map(f => ({
                    name: f,
                    time: fs.statSync(path.join(logsDir, f)).mtime,
                    size: fs.statSync(path.join(logsDir, f)).size
                }))
                .sort((a, b) => b.time - a.time);

            res.json({ success: true, data: files });
        } else {
            res.json({ success: true, data: [] });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 查看日志内容
app.get('/api/logs/:account/:file', (req, res) => {
    try {
        const { account, file } = req.params;
        const logFile = path.join(DATA_DIR, account, 'logs', file);

        if (fs.existsSync(logFile)) {
            if (file.endsWith('.log')) {
                const content = fs.readFileSync(logFile, 'utf8');
                res.json({ success: true, data: content });
            } else if (file.endsWith('.png')) {
                res.sendFile(logFile);
            }
        } else {
            res.json({ success: false, error: '文件不存在' });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ============ WebSocket 实时通信 ============

io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] 客户端连接: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`[${new Date().toISOString()}] 客户端断开: ${socket.id}`);
    });
});

// ============ 启动服务器 ============

server.listen(PORT, () => {
    console.log('========================================');
    console.log('📊 视频数据收集服务已启动');
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📁 数据目录: ${DATA_DIR}`);
    console.log('========================================');
});
