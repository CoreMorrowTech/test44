/**
 * 测试 DLL 路径解析
 */

const { getDllPath, getConfigPath } = require('./core-koffi.js');

console.log('=== DLL 路径测试 ===');
console.log('当前工作目录:', process.cwd());
console.log('__dirname:', __dirname);

try {
    const dllPath = getDllPath();
    console.log('找到的 DLL 路径:', dllPath);
    
    const configPath = getConfigPath();
    console.log('找到的配置文件路径:', configPath);
    
    if (dllPath && configPath) {
        console.log('✓ 路径解析成功');
        
        // 尝试创建通信对象
        const { COM } = require('./core-koffi.js');
        console.log('✓ 模块加载成功');
        
    } else {
        console.log('✗ 路径解析失败');
    }
} catch (error) {
    console.error('测试失败:', error.message);
}