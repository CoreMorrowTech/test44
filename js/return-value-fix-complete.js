/**
 * 完整的返回值显示修复方案
 * 解决异步命令返回值不显示和同步命令在异步命令后不返回值的问题
 */

console.log('[返回值修复] 加载完整的返回值显示修复方案...');

// 修复方案的核心函数
function applyReturnValueFix() {
    
    // 1. 确保异步命令的数据回调能正确处理返回值
    if (typeof window.setupAsyncCommandCallback === 'function') {
        const originalSetupAsyncCommandCallback = window.setupAsyncCommandCallback;
        
        window.setupAsyncCommandCallback = function(connectionInstance, command, channel, commandName) {
            try {
                console.log(`[返回值修复] 为异步命令 ${commandName} 设置数据回调`);
                
                if (typeof connectionInstance.setDataCallback === 'function') {
                    // 设置数据回调函数来处理异步命令的持续返回数据
                    connectionInstance.setDataCallback((data) => {
                        console.log(`[返回值修复] 异步命令 ${commandName} 收到数据:`, data);
                        
                        // 直接处理异步命令的返回数据，使用专门的异步处理函数
                        if (typeof window.handleAsyncCommandResult === 'function') {
                            window.handleAsyncCommandResult(command, channel, data, []);
                        } else {
                            // 如果没有专门的异步处理函数，使用通用处理
                            handleReturnValueDisplay(command, channel, data, true);
                        }
                    });
                    
                    console.log(`[返回值修复] 已为异步命令 ${commandName} 设置数据回调`);
                } else {
                    console.warn(`[返回值修复] 连接实例不支持数据回调功能`);
                }
            } catch (error) {
                console.error(`[返回值修复] 设置异步命令 ${commandName} 数据回调失败:`, error);
            }
        };
        
        console.log('[返回值修复] setupAsyncCommandCallback函数已修复');
    }
    
    // 2. 添加通用的返回值显示处理函数
    window.handleReturnValueDisplay = function(command, channel, result, isAsyncData = false) {
        if (result && result.error) {
            console.error(`[返回值修复] 命令执行失败: ${result.error}`);
            if (typeof window.showErrorInOutputFields === 'function') {
                window.showErrorInOutputFields(command, channel, result.error);
            }
            return;
        }

        const logPrefix = isAsyncData ? '[异步数据]' : '[同步结果]';
        console.log(`${logPrefix} 处理命令 ${command.name} 的返回值:`, result);

        // 确保command.returns存在
        if (!command.returns || !Array.isArray(command.returns)) {
            console.warn(`${logPrefix} 命令 ${command.name} 没有返回值配置`);
            return;
        }

        let dataProcessed = false;

        // 方法1: 直接从result对象中按名称映射返回值
        if (result && typeof result === 'object' && !result.error && !result.data) {
            command.returns.forEach(ret => {
                if (result[ret.name] !== undefined) {
                    const success = updateOutputFieldSafely(command.name, ret.name, channel, result[ret.name], ret.type, isAsyncData);
                    if (success) {
                        dataProcessed = true;
                        console.log(`${logPrefix} 成功设置字段 ${ret.name}: ${result[ret.name]}`);
                    }
                }
            });
        }

        // 方法2: 如果返回的是数组数据，按位置映射到返回值字段
        if (!dataProcessed && result.data && Array.isArray(result.data)) {
            command.returns.forEach((ret, index) => {
                if (result.data[index] !== undefined) {
                    const success = updateOutputFieldSafely(command.name, ret.name, channel, result.data[index], ret.type, isAsyncData);
                    if (success) {
                        dataProcessed = true;
                    }
                }
            });
        }

        // 方法3: 如果返回的是对象，按名称映射
        if (!dataProcessed && result.data && typeof result.data === 'object') {
            command.returns.forEach(ret => {
                if (result.data[ret.name] !== undefined) {
                    const success = updateOutputFieldSafely(command.name, ret.name, channel, result.data[ret.name], ret.type, isAsyncData);
                    if (success) {
                        dataProcessed = true;
                    }
                }
            });
        }

        // 方法4: 通用处理，尝试多种可能的数据路径
        if (!dataProcessed) {
            command.returns.forEach(ret => {
                let value = result[ret.name] || 
                           (result.data && result.data[ret.name]) ||
                           (result.result && result.result[ret.name]);
                
                if (value !== undefined) {
                    const success = updateOutputFieldSafely(command.name, ret.name, channel, value, ret.type, isAsyncData);
                    if (success) {
                        dataProcessed = true;
                        console.log(`${logPrefix} 通用处理成功设置字段 ${ret.name}: ${value}`);
                    }
                }
            });
        }

        // 方法5: 特殊处理常见的异步数据字段
        if (!dataProcessed && isAsyncData && result) {
            const commonFields = ['VOLTAGE', 'CURRENT', 'CHANNEL', 'STATUS', 'VALUE'];
            command.returns.forEach(ret => {
                const upperRetName = ret.name.toUpperCase();
                if (commonFields.includes(upperRetName)) {
                    let value = result[ret.name] || result[upperRetName] || result[ret.name.toLowerCase()];
                    if (value !== undefined) {
                        const success = updateOutputFieldSafely(command.name, ret.name, channel, value, ret.type, isAsyncData);
                        if (success) {
                            dataProcessed = true;
                            console.log(`${logPrefix} 常见字段匹配成功设置 ${ret.name}: ${value}`);
                        }
                    }
                }
            });
        }

        if (!dataProcessed) {
            console.warn(`${logPrefix} 无法处理命令 ${command.name} 的返回数据:`, result);
        }
    };
    
    // 3. 安全的输出字段更新函数
    window.updateOutputFieldSafely = function(commandName, fieldName, channel, value, type, isAsyncData) {
        try {
            const fieldId = `${commandName}_${fieldName}_output_${channel}`;
            const field = document.getElementById(fieldId);
            
            if (!field) {
                console.warn(`[返回值修复] 未找到输出字段: ${fieldId}`);
                return false;
            }
            
            // 格式化显示值
            let displayValue = value;
            if (type === 'float' && typeof value === 'number') {
                displayValue = value.toFixed(6); // 显示6位小数
            } else if (type === 'int' && typeof value === 'string') {
                displayValue = parseInt(value) || value;
            }
            
            // 更新字段值
            field.value = displayValue;
            
            // 设置颜色以区分异步和同步数据
            if (isAsyncData) {
                field.style.color = '#fd7e14'; // 异步数据用橙色
                field.style.backgroundColor = '#fff3cd'; // 添加背景色
                setTimeout(() => {
                    field.style.backgroundColor = '';
                }, 500);
            } else {
                field.style.color = '#495057'; // 同步数据用默认颜色
            }
            
            console.log(`[返回值修复] 成功更新字段 ${fieldId}: ${displayValue}`);
            return true;
            
        } catch (error) {
            console.error(`[返回值修复] 更新字段失败:`, error);
            return false;
        }
    };
    
    // 4. 修复executeAsyncCommand函数（如果存在）
    if (typeof window.executeAsyncCommand === 'function') {
        const originalExecuteAsyncCommand = window.executeAsyncCommand;
        
        window.executeAsyncCommand = function(commandName, params, command, channel) {
            console.log(`[返回值修复] 执行异步命令: ${commandName}`);
            
            try {
                // 获取当前连接的通信实例
                const currentConnection = getCurrentActiveConnection();
                if (!currentConnection) {
                    console.error('[返回值修复] 未找到活跃连接');
                    return;
                }

                const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
                if (!connectionInstance) {
                    console.error('[返回值修复] 未找到连接实例');
                    return;
                }

                // 记录异步命令启动
                if (typeof window.recordAsyncCommandStart === 'function') {
                    window.recordAsyncCommandStart(commandName, { channel, params });
                }

                console.log(`[返回值修复] 执行异步命令: ${commandName}(${params.join(', ')})`);

                // 设置数据回调来处理异步返回值
                window.setupAsyncCommandCallback(connectionInstance, command, channel, commandName);

                // 执行异步命令
                let result;
                if (typeof connectionInstance.executeCommandJSONAsync === 'function') {
                    // 使用异步执行方法
                    connectionInstance.executeCommandJSONAsync(commandName, params);
                    console.log(`[返回值修复] 异步命令 ${commandName} 已启动（使用异步方法）`);
                } else {
                    // 使用普通方法执行异步命令
                    result = connectionInstance.executeCommandJSON(commandName, params);
                    console.log(`[返回值修复] 异步命令 ${commandName} 执行结果:`, result);
                    
                    // 立即处理返回值（如果有的话）
                    if (result && !result.error) {
                        window.handleReturnValueDisplay(command, channel, result, true);
                    }
                }

                // 更新UI状态
                if (typeof window.updateAsyncCommandUI === 'function') {
                    window.updateAsyncCommandUI(commandName, channel, true);
                }

            } catch (error) {
                console.error(`[返回值修复] 执行异步命令 ${commandName} 失败:`, error);
                
                if (typeof window.recordAsyncCommandComplete === 'function') {
                    window.recordAsyncCommandComplete(commandName);
                }
                
                if (command && command.returns && typeof window.showErrorInOutputFields === 'function') {
                    window.showErrorInOutputFields(command, channel, error.message);
                }
            }
        };
        
        console.log('[返回值修复] executeAsyncCommand函数已修复');
    }
    
    console.log('[返回值修复] 完整的返回值显示修复方案已应用');
}

// 立即应用修复
applyReturnValueFix();

// 添加测试函数
window.testReturnValueFix = function() {
    console.log('[返回值修复] 开始测试返回值显示修复...');
    
    // 测试通用返回值显示函数
    const testCommand = {
        name: 'testCommand',
        returns: [
            { name: 'VOLTAGE', type: 'float' },
            { name: 'CHANNEL', type: 'int' },
            { name: 'STATUS', type: 'str' }
        ]
    };
    
    const testResult = {
        VOLTAGE: 3.14159,
        CHANNEL: 1,
        STATUS: 'OK'
    };
    
    console.log('[返回值修复] 测试同步数据处理...');
    window.handleReturnValueDisplay(testCommand, 1, testResult, false);
    
    console.log('[返回值修复] 测试异步数据处理...');
    window.handleReturnValueDisplay(testCommand, 1, testResult, true);
    
    console.log('[返回值修复] 测试完成');
};

console.log('[返回值修复] 完整的返回值显示修复方案加载完成');
console.log('[返回值修复] 使用 testReturnValueFix() 进行测试');
console.log('[返回值修复] 现在异步和同步命令的返回值都应该能正确显示了');