/**
 * 格式化信息为字符串
 * * - 支持无限数量的参数
 * - 对于 object 参数，优先尝试读取 .msg 或 .message 字段
 * - 如果 object 中不存在上述字段，则将整个 object JSON 格式化为字符串
 * - 对于非 object 参数，直接转换为字符串
 * * @param {string} msg 前置信息（可选，可作为第一个或多个参数的一部分）
 * @param {...*} additionalData 附加数据（可以是任何类型，无限个）
 * @returns {string} 组合后的信息字符串
 */
function formatObjectString(...args) {
    if (args.length === 0) {
        return "";
    }

    // 将所有参数转换为字符串片段
    const formattedParts = args.map(item => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null || item === undefined) {
            // 简单类型或 null/undefined 直接转为字符串（或空字符串）
            return String(item ?? '');
        } 
        
        if (typeof item === 'object') {
            // 检查 object 是否为 null (已在上方处理)
            // 尝试读取 .msg 字段
            if (typeof item.msg === 'string' && item.msg.length > 0) {
                return item.msg;
            }
            // 尝试读取 .message 字段
            if (typeof item.message === 'string' && item.message.length > 0) {
                return item.message;
            }
            
            // 如果都不存在，格式化为 JSON 字符串
            try {
                return JSON.stringify(item);
            } catch (e) {
                // 捕获循环引用等无法 JSON 化的错误，退化为通用描述
                return `[Object Cannot Serialize: ${e.message}]`;
            }
        }
        
        // 其他复杂类型（如 Symbol, Function 等）
        return String(item);
    });

    // 使用空格连接所有部分
    return formattedParts.join(' ');
}

/**
 * 获取当前时间字符串
 * @returns {string} 2025-10-15 11:00:00 的时间字符串
 */
function getCurrentDateTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


/**
 * 提取Windows的文件名称
 * @param {String} path Windows下文件的完整路径 \\
 * @returns {String} 提取好的文件名 如果失败返回完整路径
 */
function getFileNameByWindows (path){
    return path.split(/[\\/]/).pop() || path
}

export {
    formatObjectString, getCurrentDateTime, getFileNameByWindows
}