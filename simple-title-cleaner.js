/**
 * 简单实用的标题清理函数
 */
function cleanVideoTitle(titleLine) {
    if (!titleLine) return '';

    let cleaned = titleLine;

    // 1. 移除等号、方括号等特殊符号
    cleaned = cleaned.replace(/[=\[\]]/g, '');

    // 2. 移除程序生成的前缀
    cleaned = cleaned.replace(/^(render_|LARGE-)/i, '');

    // 3. 如果标题包含中文和完整的产品信息，直接返回（不拆分）
    // 检测是否为完整标题：包含中文且长度合理
    const hasChinese = /[一-龥]/.test(cleaned);
    const hasProductInfo = /[A-Z]+\d+[A-Z0-9\-]*/i.test(cleaned);

    if (hasChinese && hasProductInfo && cleaned.length > 10) {
        // 这是一个完整的标题，保留原样
        return cleaned.trim();
    }

    // 4. 如果只有产品型号或英文，进行拆分处理
    const parts = [];

    // 提取产品型号（格式：字母+数字+字母/数字，如Z560Y, D3L2F）
    const modelMatch = cleaned.match(/[A-Z]+\d+[A-Z0-9\-]*/i);
    if (modelMatch && modelMatch[0].length <= 15) {
        parts.push(modelMatch[0]);
    }

    // 提取所有中文（过滤掉单个字）
    const chineseMatches = cleaned.match(/[一-龥]{2,}/g);
    if (chineseMatches) {
        parts.push(...chineseMatches);
    }

    // 如果没有提取到内容，返回原始（简单清理）
    if (parts.length === 0) {
        return cleaned.replace(/[^\w一-龥\-.]/g, '').substring(0, 100);
    }

    // 组合结果
    return parts.join(' ');
}

// 导出
if (typeof module !== 'undefined') {
    module.exports = { cleanVideoTitle };
}
