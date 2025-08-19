/**
 * 异步命令返回值显示修复脚本
 * 解决异步命令返回值不显示和同步命令在异步命令后不返回值的问题
 */

// 全局变量来跟踪异步命令状态
let activeAsyncCommands = new Map(); // 存储活跃的异步命令信息
let asyncDataCallbacks = new Map();  // 存储异步命令的数据回调

/**
 * 修复异步命令执行函数
 * @param {string} commandName - 命令名称
 * @param {Array} params - 参数数组
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 */
function executeAsyncCommandFixed(commandName, params, command, channel) {
    try {
        console.log(`[异步修复] 执行异步命令: ${commandName}(${params.join(', ')})`);
        
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            console.error('[异步修复] 未找到活跃连接');
            return;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            console.error('[异步修复] 未找到连接实例');
            return;
        }

        // 记录异步命令启动
        recordAsyncCommandStart(commandName, { channel, params });
        
        // 存储异步命令信息
        activeAsyncCommands.set(commandName, {
            command: command,
            channel: channel,
            params: params,
            startTime: Date.now()
        });

        // 设置专门的数据回调来处理异步返回值
        setupAsyncDataCallback(connectionInstance, commandName, command, channel);

        // 执行异步命令
        let result;
        if (typeof connectionInstance.executeCommandJSONAsync === 'function') {
            // 使用异步执行方法
            connectionInstance.executeCommandJSONAsync(commandName, params);
            console.log(`[异步修复] 异步命令 ${commandName} 已启动（使用异步方法）`);
            
            // 创建一个模拟的启动结果
            result = {
                status: 'async_started',
                message: `异步命令 ${commandName} 已启动`,
                command: commandName,
                asyncMode: true
            };
        } else {
            // 使用普通方法执行异步命令
            result = connectionInstance.executeCommandJSON(commandName, params);
            console.log(`[异步修复] 异步命令 ${commandName} 执行结果:`, result);
        }

        // 处理异步命令的启动结果
        if (result && result.status === 'async_started') {
            console.log(`[异步修复] 异步命令 ${commandName} 已启动，等待数据回调`);
        } else if (result && !result.error) {
            // 如果立即有返回值，也要显示
            console.log(`[异步修复] 异步命令 ${commandName} 立即返回结果，显示到输出框`);
            handleCommandResultFixed(command, channel, result, params, true);
        }

        // 更新UI状态
        updateAsyncCommandUI(commandName, channel, true);

    } catch (error) {
        console.error(`[异步修复] 执行异步命令 ${commandName} 失败:`, error);
        
        // 清理状态
        activeAsyncCommands.delete(commandName);
        recordAsyncCommandComplete(commandName);
        
        // 显示错误信息
        if (command && command.returns) {
            showErrorInOutputFields(command, channel, error.message);
        }
    }
}

/**
 * 设置异步数据回调
 * @param {Object} connectionInstance - 连接实例
 * @param {string} commandName - 命令名称
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 */
function setupAsyncDataCallback(connectionInstance, commandName, command, channel) {
    try {
        // 检查连接实例是否支持数据回调
        if (typeof connectionInstance.setDataCallback === 'function') {
            
            // 创建专门的回调函数
            const asyncCallback = (data) => {
                console.log(`[异步修复] 异步命令 ${commandName} 收到数据:`, data);
                
                // 检查数据是否与当前异步命令相关
                if (isDataForAsyncCommand(data, commandName, command)) {
                    console.log(`[异步修复] 数据与异步命令 ${commandName} 相关，处理返回值`);
                    handleCommandResultFixed(command, channel, data, [], true);
                } else {
                    console.log(`[异步修复] 数据与异步命令 ${commandName} 不相关，忽略`);
                }
            };
            
            // 存储回调函数引用
            asyncDataCallbacks.set(commandName, asyncCallback);
            
            // 设置数据回调
            connectionInstance.setDataCallback(asyncCallback);
            
            console.log(`[异步修复] 已为异步命令 ${commandName} 设置数据回调`);
        } else {
            console.warn(`[异步修复] 连接实例不支持数据回调功能，异步命令 ${commandName} 的持续数据可能无法显示`);
        }
    } catch (error) {
        console.error(`[异步修复] 设置异步命令 ${commandName} 数据回调失败:`, error);
    }
}

/**
 * 检查数据是否属于指定的异步命令
 * @param {Object} data - 接收到的数据
 * @param {string} commandName - 命令名称
 * @param {Object} command - 命令配置
 * @returns {boolean} 是否相关
 */
function isDataForAsyncCommand(data, commandName, command) {
    try {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // 方法1：检查是否包含命令的返回值字段
        const hasReturnField = command.returns.some(ret => {
            return data.hasOwnProperty(ret.name) || 
                   (data.data && data.data.hasOwnProperty(ret.name));
        });
        
        if (hasReturnField) {
            console.log(`[异步修复] 数据包含命令 ${commandName} 的返回值字段`);
            return true;
        }
        
        // 方法2：特殊情况检查（例如电压监控命令）
        if (commandName.includes('Voltage') && (data.VOLTAGE !== undefined || data.CHANNEL !== undefined)) {
            console.log(`[异步修复] 检测到电压相关数据，匹配命令 ${commandName}`);
            return true;
        }
        
        // 方法3：检查数据结构特征
        if (data.status && data.status.includes('async')) {
            console.log(`[异步修复] 检测到异步状态数据，匹配命令 ${commandName}`);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('[异步修复] 检查数据关联性失败:', error);
        return false;
    }
}

/**
 * 修复的命令结果处理函数
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {Array} params - 执行参数
 * @param {boolean} isAsyncData - 是否是异步数据
 */
function handleCommandResultFixed(command, channel, result, params, isAsyncData = false) {
    if (result && result.error) {
        console.error(`[结果修复] 命令执行失败: ${result.error}`);
        showErrorInOutputFields(command, channel, result.error);
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
        console.log(`${logPrefix} 使用方法1处理返回值`);
        command.returns.forEach(ret => {
            if (result[ret.name] !== undefined) {
                const success = updateOutputField(command.name, ret.name, channel, result[ret.name], ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                    console.log(`${logPrefix} 成功设置字段 ${ret.name}: ${result[ret.name]}`);
                }
            }
        });
    }

    // 方法2: 如果返回的是数组数据，按位置映射到返回值字段
    if (!dataProcessed && result.data && Array.isArray(result.data)) {
        console.log(`${logPrefix} 使用方法2处理返回值（数组）`);
        command.returns.forEach((ret, index) => {
            if (result.data[index] !== undefined) {
                const success = updateOutputField(command.name, ret.name, channel, result.data[index], ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                }
            }
        });
    }

    // 方法3: 如果返回的是对象，按名称映射
    if (!dataProcessed && result.data && typeof result.data === 'object') {
        console.log(`${logPrefix} 使用方法3处理返回值（对象）`);
        command.returns.forEach(ret => {
            if (result.data[ret.name] !== undefined) {
                const success = updateOutputField(command.name, ret.name, channel, result.data[ret.name], ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                }
            }
        });
    }

    // 如果没有处理任何数据，记录调试信息
    if (!dataProcessed) {
        console.warn(`${logPrefix} 未能处理命令 ${command.name} 的返回数据，尝试通用处理`);
        
        // 尝试通用处理：查找任何可能的返回值
        command.returns.forEach(ret => {
            // 尝试多种可能的数据路径
            let value = result[ret.name] || 
                       (result.data && result.data[ret.name]) ||
                       (result.result && result.result[ret.name]);
            
            if (value !== undefined) {
                const success = updateOutputField(command.name, ret.name, channel, value, ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                    console.log(`${logPrefix} 通用处理成功设置字段 ${ret.name}: ${value}`);
                }
            }
        });
    }

    if (!dataProcessed) {
        console.warn(`${logPrefix} 完全无法处理命令 ${command.name} 的返回数据:`, result);
    }
}

/**
 * 更新输出字段
 * @param {string} commandName - 命令名称
 * @param {string} fieldName - 字段名称
 * @param {number} channel - 通道号
 * @param {*} value - 值
 * @param {string} type - 数据类型
 * @param {boolean} isAsyncData - 是否是异步数据
 * @returns {boolean} 是否成功更新
 */
function updateOutputField(commandName, fieldName, channel, value, type, isAsyncData) {
    try {
        const fieldId = `${commandName}_${fieldName}_output_${channel}`;
        const field = document.getElementById(fieldId);
        
        if (!field) {
            console.warn(`[字段更新] 未找到输出字段: ${fieldId}`);
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
        field.style.color = isAsyncData ? '#fd7e14' : '#495057'; // 异步数据用橙色
        
        // 添加闪烁效果表示数据更新
        if (isAsyncData) {
            field.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                field.style.backgroundColor = '';
            }, 500);
        }
        
        console.log(`[字段更新] 成功更新字段 ${fieldId}: ${displayValue}`);
        return true;
        
    } catch (error) {
        console.error(`[字段更新] 更新字段失败:`, error);
        return false;
    }
}

/**
 * 清理异步命令状态
 * @param {string} commandName - 命令名称
 */
function cleanupAsyncCommand(commandName) {
    try {
        console.log(`[异步修复] 清理异步命令 ${commandName} 的状态`);
        
        // 从活跃命令中移除
        activeAsyncCommands.delete(commandName);
        
        // 清理数据回调
        if (asyncDataCallbacks.has(commandName)) {
            asyncDataCallbacks.delete(commandName);
            
            // 获取连接实例并清除回调
            const currentConnection = getCurrentActiveConnection();
            if (currentConnection) {
                const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
                if (connectionInstance && typeof connectionInstance.setDataCallback === 'function') {
                    connectionInstance.setDataCallback(null);
                    console.log(`[异步修复] 已清除异步命令 ${commandName} 的数据回调`);
                }
            }
        }
        
        // 记录命令完成
        recordAsyncCommandComplete(commandName);
        
    } catch (error) {
        console.error(`[异步修复] 清理异步命令 ${commandName} 状态失败:`, error);
    }
}

/**
 * 修复的停止异步命令函数
 * @param {string} commandName - 命令名称
 */
function stopAsyncCommandFixed(commandName) {
    try {
        console.log(`[异步修复] 停止异步命令: ${commandName}`);
        
        // 调用原有的停止函数
        const success = stopAsyncCommand(commandName);
        
        // 额外的清理工作
        cleanupAsyncCommand(commandName);
        
        return success;
        
    } catch (error) {
        console.error(`[异步修复] 停止异步命令 ${commandName} 失败:`, error);
        return false;
    }
}

/**
 * 获取异步命令状态信息
 */
function getAsyncCommandStatus() {
    const status = {
        activeCommands: Array.from(activeAsyncCommands.keys()),
        callbackCount: asyncDataCallbacks.size,
        details: {}
    };
    
    activeAsyncCommands.forEach((info, commandName) => {
        status.details[commandName] = {
            channel: info.channel,
            startTime: info.startTime,
            duration: Date.now() - info.startTime,
            hasCallback: asyncDataCallbacks.has(commandName)
        };
    });
    
    return status;
}

// 导出修复函数到全局作用域
if (typeof window !== 'undefined') {
    window.executeAsyncCommandFixed = executeAsyncCommandFixed;
    window.handleCommandResultFixed = handleCommandResultFixed;
    window.stopAsyncCommandFixed = stopAsyncCommandFixed;
    window.cleanupAsyncCommand = cleanupAsyncCommand;
    window.getAsyncCommandStatus = getAsyncCommandStatus;
    
    // 替换原有的异步命令执行函数
    if (typeof window.executeAsyncCommand === 'function') {
        window.executeAsyncCommandOriginal = window.executeAsyncCommand;
        window.executeAsyncCommand = executeAsyncCommandFixed;
        console.log('[异步修复] 已替换原有的executeAsyncCommand函数');
    }
}

console.log('[异步修复] 异步命令返回值修复脚本已加载');
console.log('[异步修复] 使用 getAsyncCommandStatus() 查看异步命令状态');