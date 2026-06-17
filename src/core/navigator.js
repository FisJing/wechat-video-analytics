/**
 * 微信导航控制模块
 * 负责打开微信、进入视频号、定位到个人主页
 */

const BaseFetcher = require('./base.js');

class Navigator extends BaseFetcher {
    constructor(config) {
        super(config);
    }

    /**
     * 启动微信应用
     */
    async openWeChat() {
        this.log('🚀 启动微信...');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 强制停止微信
        this.log('  📱 强制关闭微信');
        this.adb('shell am force-stop com.tencent.mm');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 启动微信（支持分身）
        const userId = this.config.userId;
        this.log(`  ▶️ 启动微信 (用户ID: ${userId})`);
        this.adb(`shell am start --user ${userId} -n com.tencent.mm/.ui.LauncherUI`);

        // 等待微信启动
        this.log('  ⏳ 等待微信启动 (4秒)...');
        await this.sleep(4000);

        this.log('✅ 微信已启动');
        this.log('  ⏳ 等待 2 秒...\n');
        await this.sleep(2000);
    }

    /**
     * 进入视频号
     */
    async navigateToVideoChannel() {
        this.log('📺 进入视频号...');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 步骤1: 点击"发现"Tab
        this.log('  👆 点击"发现" Tab');
        this.tap(...this.positions.discover);
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 步骤2: 点击"视频号"入口
        this.log('  👆 点击"视频号"入口');
        this.tap(...this.positions.videoChannel);
        this.log('  ⏳ 等待 3 秒...');
        await this.sleep(3000);

        this.log('✅ 已进入视频号');
        this.log('  ⏳ 等待 2 秒...\n');
        await this.sleep(2000);
    }

    /**
     * 进入个人主页
     */
    async navigateToProfile() {
        this.log('👤 进入个人主页...');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 点击个人头像（右上角）
        this.log('  👆 点击个人头像 (右上角)');
        this.tap(...this.positions.personal);
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        this.log('✅ 已进入个人主页');
        this.log('  ⏳ 等待 2 秒...\n');
        await this.sleep(2000);
    }

    /**
     * 进入个人视频主页（作品列表）
     */
    async navigateToVideoList() {
        this.log('🎬 进入个人视频主页...');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        // 点击"个人页面"
        this.log('  👆 点击"个人页面"');
        const personalPage = this.positions.personalPage || [400, 1090];
        this.tap(...personalPage);
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        this.log('✅ 已进入个人视频主页');
        this.log('  ⏳ 等待 2 秒...\n');
        await this.sleep(2000);
    }

    /**
     * 点击第一个视频
     */
    async clickFirstVideo() {
        this.log('▶️ 点击第一个视频...');
        this.log('  ⏳ 等待 2 秒...');
        await this.sleep(2000);

        const firstVideo = this.positions.firstVideo || [150, 1600];
        this.log(`  👆 点击位置 (${firstVideo[0]}, ${firstVideo[1]})`);
        this.tap(...firstVideo);
        this.log('  ⏳ 等待 3 秒...');
        await this.sleep(3000);

        this.log('✅ 已进入视频详情页');
        this.log('  ⏳ 等待 2 秒...\n');
        await this.sleep(2000);
    }

    /**
     * 完整的导航流程
     */
    async navigateToMyVideos() {
        this.log('========== 开始导航 ==========');

        // 1. 检查设备连接
        if (!this.checkDeviceConnection()) {
            throw new Error('设备未连接');
        }

        // 2. 打开微信
        await this.openWeChat();

        // 3. 进入视频号
        await this.navigateToVideoChannel();

        // 4. 进入个人主页
        await this.navigateToProfile();

        // 5. 进入个人视频主页
        await this.navigateToVideoList();

        // 6. 截图确认
        const screenshot = this.screenshotWithTag('video_list');
        this.log(`截图保存: ${screenshot}`);

        this.log('========== 导航完成 ==========');
    }

    /**
     * 返回上一页
     */
    async goBack() {
        this.tap(...this.positions.backButton);
        await this.sleep(1500);
    }
}

module.exports = Navigator;
