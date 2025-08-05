/**
 * 主要初始化和全局变量
 */

// 引入core-koffi.js模块
const { COM, UDP } = require('./core-koffi.js');

// 全局变量存储连接实例
let connectionInstances = new Map();

// 全局变量存储当前语言状态
let currentLanguage = 'en'; // Default language is English

// 设备模型到图片的映射
const deviceImageMap = {
    'Device Model 1': '1.png',
    'Device Model 2': 'E53.D3E-J缩略图.jpg',
    'Device Model 3': '3.png',
    'Device Model 4': '4.png'
};

// 页面关闭时清理所有连接
window.addEventListener('beforeunload', function () {
    connectionInstances.forEach((connection, key) => {
        try {
            connection.close();
            console.log(`清理连接: ${key}`);
        } catch (error) {
            console.error(`清理连接失败: ${error.message}`);
        }
    });
    connectionInstances.clear();
});