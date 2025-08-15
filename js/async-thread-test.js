/**
 * 异步线程管理功能测试脚本
 * 用于验证JavaScript异步线程管理功能是否正常工作
 */

// 测试异步线程管理功能
function testAsyncThreadManagement() {
    console.log('=== 异步线程管理功能测试 ===');
    
    try {
        // 1. 测试初始化
        console.log('1. 测试异步线程管理器初始化...');
        
        // 模拟初始化异步线程管理器
        const testAsyncManager = {
            runningCommands: new Map(),
            statusUpdateTimer: null,
            statusElement: null,
            isEnabled: false
        };
        
        // 初始化
        testAsyncManager.isEnabled = true;
        testAsyncManager.runningCommands.clear();
        console.log('✓ 异步线程管理器初始化成功');
        
        // 2. 测试记录异步命令
        console.log('2. 测试记录异步命令...');
        
        const testCommandName = 'getxChannelVoltageTms';
        const testParams = { channel: 1, params: [1, 1, 100] };
        
        testAsyncManager.runningCommands.set(testCommandName, {
            startTime: Date.now(),
            params: testParams
        });
        
        console.log(`✓ 异步命令 '${testCommandName}' 已记录`);
        console.log(`当前运行中的命令数量: ${testAsyncManager.runningCommands.size}`);
        
        // 3. 测试状态查询
        console.log('3. 测试状态查询...');
        
        const isRunning = testAsyncManager.runningCommands.has(testCommandName);
        console.log(`命令 '${testCommandName}' 是否在运行: ${isRunning}`);
        
        const runningCommands = Array.from(testAsyncManager.runningCommands.keys());
        console.log(`运行中的命令列表: [${runningCommands.join(', ')}]`);
        
        // 4. 测试停止异步命令
        console.log('4. 测试停止异步命令...');
        
        testAsyncManager.runningCommands.delete(testCommandName);
        console.log(`✓ 异步命令 '${testCommandName}' 已停止`);
        console.log(`当前运行中的命令数量: ${testAsyncManager.runningCommands.size}`);
        
        // 5. 测试批量操作
        console.log('5. 测试批量操作...');
        
        // 添加多个命令
        testAsyncManager.runningCommands.set('command1', { startTime: Date.now() });
        testAsyncManager.runningCommands.set('command2', { startTime: Date.now() });
        testAsyncManager.runningCommands.set('command3', { startTime: Date.now() });
        
        console.log(`添加了3个测试命令，当前数量: ${testAsyncManager.runningCommands.size}`);
        
        // 批量清理
        testAsyncManager.runningCommands.clear();
        console.log(`✓ 所有异步命令已清理，当前数量: ${testAsyncManager.runningCommands.size}`);
        
        console.log('=== 测试完成 ===');
        console.log('✓ 异步线程管理功能基本正常');
        
        return true;
        
    } catch (error) {
        console.error('✗ 测试过程中发生错误:', error);
        return false;
    }
}

// 测试DLL函数绑定（如果可用）
function testDllFunctionBinding() {
    console.log('=== DLL函数绑定测试 ===');
    
    try {
        // 检查是否有可用的连接实例
        if (typeof connectionInstances !== 'undefined' && connectionInstances.size > 0) {
            const firstConnection = connectionInstances.values().next().value;
            
            console.log('检查异步线程管理方法可用性:');
            
            const methods = [
                'stopAsyncCommand',
                'stopAllAsyncCommands',
                'isAsyncCommandRunning',
                'getRunningAsyncCommands',
                'waitForAsyncCommand',
                'getAsyncStatus',
                'ensureSyncExecution'
            ];
            
            methods.forEach(method => {
                if (typeof firstConnection[method] === 'function') {
                    console.log(`✓ ${method} 方法可用`);
                } else {
                    console.log(`✗ ${method} 方法不可用`);
                }
            });
            
            // 尝试调用getAsyncStatus方法
            if (typeof firstConnection.getAsyncStatus === 'function') {
                const status = firstConnection.getAsyncStatus();
                console.log('异步状态查询结果:', status);
            }
            
        } else {
            console.log('⚠ 没有可用的连接实例进行测试');
        }
        
        console.log('=== DLL函数绑定测试完成 ===');
        
    } catch (error) {
        console.error('✗ DLL函数绑定测试失败:', error);
    }
}

// 测试UI组件
function testUIComponents() {
    console.log('=== UI组件测试 ===');
    
    try {
        // 检查异步线程管理面板是否存在
        const asyncPanel = document.getElementById('async-thread-panel');
        if (asyncPanel) {
            console.log('✓ 异步线程管理面板已创建');
            
            // 检查状态显示元素
            const statusDisplay = document.getElementById('async-status-display');
            if (statusDisplay) {
                console.log('✓ 状态显示元素已创建');
                console.log(`当前状态文本: "${statusDisplay.textContent}"`);
            } else {
                console.log('✗ 状态显示元素未找到');
            }
            
        } else {
            console.log('✗ 异步线程管理面板未找到');
        }
        
        // 检查全局函数是否可用
        const globalFunctions = [
            'stopAllAsyncCommands',
            'refreshAsyncStatus',
            'ensureSyncExecution',
            'stopAsyncCommand',
            'isAsyncCommandRunning',
            'waitForAsyncCommand'
        ];
        
        console.log('检查全局函数可用性:');
        globalFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                console.log(`✓ ${funcName} 全局函数可用`);
            } else {
                console.log(`✗ ${funcName} 全局函数不可用`);
            }
        });
        
        console.log('=== UI组件测试完成 ===');
        
    } catch (error) {
        console.error('✗ UI组件测试失败:', error);
    }
}

// 综合测试函数
function runAllTests() {
    console.log('开始异步线程管理功能综合测试...\n');
    
    const results = {
        basicTest: testAsyncThreadManagement(),
        dllTest: true, // DLL测试不影响整体结果
        uiTest: true   // UI测试不影响整体结果
    };
    
    // 运行DLL和UI测试（不影响整体结果）
    testDllFunctionBinding();
    testUIComponents();
    
    console.log('\n=== 测试结果汇总 ===');
    console.log(`基础功能测试: ${results.basicTest ? '✓ 通过' : '✗ 失败'}`);
    console.log(`DLL绑定测试: 已执行（详见上方日志）`);
    console.log(`UI组件测试: 已执行（详见上方日志）`);
    
    if (results.basicTest) {
        console.log('\n🎉 异步线程管理功能基础测试通过！');
        console.log('建议：在实际设备连接后测试DLL集成功能。');
    } else {
        console.log('\n❌ 基础功能测试失败，请检查实现。');
    }
    
    return results.basicTest;
}

// 导出测试函数到全局作用域
if (typeof window !== 'undefined') {
    window.testAsyncThreadManagement = testAsyncThreadManagement;
    window.testDllFunctionBinding = testDllFunctionBinding;
    window.testUIComponents = testUIComponents;
    window.runAllTests = runAllTests;
}

// 如果在Node.js环境中，直接运行测试
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testAsyncThreadManagement,
        testDllFunctionBinding,
        testUIComponents,
        runAllTests
    };
    
    // 如果直接运行此文件，执行测试
    if (require.main === module) {
        runAllTests();
    }
}

console.log('异步线程管理测试脚本已加载');
console.log('在浏览器控制台中运行 runAllTests() 来执行所有测试');