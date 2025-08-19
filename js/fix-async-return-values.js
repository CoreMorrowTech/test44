/**
 * 修复异步命令返回值显示问题
 * 解决异步命令返回值不显示和同步命令在异步命令后不返回值的问题
 */

console.log('[返回值修复] 开始加载异步返回值修复脚本...');

// 修复异步命令的返回值显示问题
function fixAsyncReturnValues() {

    // 1. 修复executeAsyncCommand函数
    if (typeof window.executeAsyncCommand === 'function') {
        const originalExecuteAsyncCommand = window.executeAsyncCommand;

        window.executeAsyncCommand = function (commandName, params, command, channel) {
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
                recordAsyncCommandStart(commandName, { channel, params });

                console.log(`[返回值修复] 执行异步命令: ${commandName}(${params.join(', ')})`);

                // 设置数据回调来处理异步返回值
                setupFixedAsyncCallback(connectionInstance, command, channel, commandName);

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
                        handleFixedCommandResult(command, channel, result, params, true);
                    }
                }

                // 更新UI状态
                updateAsyncCommandUI(commandName, channel, true);

            } catch (error) {
                console.error(`[返回值修复] 执行异步命令 ${commandName} 失败:`, error);
                recordAsyncCommandComplete(commandName);

                if (command && command.returns) {
                    showErrorInOutputFields(command, channel, error.message);
                }
            }
        };

        console.log('[返回值修复] executeAsyncCommand函数已修复');
    }

    // 2. 修复handleCommandResult函数
    if (typeof window.handleCommandResult === 'function') {
        const originalHandleCommandResult = window.handleCommandResult;

        window.handleCommandResult = function (command, channel, result, params) {
            console.log(`[返回值修复] 处理命令结果: ${command.name}`, result);
            handleFixedCommandResult(command, channel, result, params, false);
        };

        console.log('[返回值修复] handleCommandResult函数已修复');
    }
}

/**
 * 设置修复的异步回调
 */
function setupFixedAsyncCallback(connectionInstance, command, channel, commandName) {
    try {
        if (typeof connectionInstance.setDataCallback === 'function') {
            // 设置数据回调函数
            connectionInstance.setDataCallback((data) => {
                console.log(`[返回值修复] 异步命令 ${commandName} 收到数据:`, data);

                // 直接处理异步数据，不做过多的关联性检查
                handleFixedCommandResult(command, channel, data, [], true);
            });

            console.log(`[返回值修复] 已为异步命令 ${commandName} 设置数据回调`);
        } else {
            console.warn(`[返回值修复] 连接实例不支持数据回调功能`);
        }
    } catch (error) {
        console.error(`[返回值修复] 设置异步命令 ${commandName} 数据回调失败:`, error);
    }
}

/**
 * 修复的命令结果处理函数
 */
function handleFixedCommandResult(command, channel, result, params, isAsyncData = false) {
    if (result && result.error) {
        console.error(`[返回值修复] 命令执行失败: ${result.error}`);
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
                const success = updateFixedOutputField(command.name, ret.name, channel, result[ret.name], ret.type, isAsyncData);
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
                const success = updateFixedOutputField(command.name, ret.name, channel, result.data[index], ret.type, isAsyncData);
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
                const success = updateFixedOutputField(command.name, ret.name, channel, result.data[ret.name], ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                }
            }
        });
    }

    // 方法4: 通用处理，尝试多种可能的数据路径
    if (!dataProcessed) {
        console.log(`${logPrefix} 使用通用方法处理返回值`);
        command.returns.forEach(ret => {
            let value = result[ret.name] ||
                (result.data && result.data[ret.name]) ||
                (result.result && result.result[ret.name]);

            if (value !== undefined) {
                const success = updateFixedOutputField(command.name, ret.name, channel, value, ret.type, isAsyncData);
                if (success) {
                    dataProcessed = true;
                    console.log(`${logPrefix} 通用处理成功设置字段 ${ret.name}: ${value}`);
                }
            }
        });
    }

    if (!dataProcessed) {
        console.warn(`${logPrefix} 完全无法处理命令 ${command.name} 的返回数据:`, result);

        // 最后尝试：如果是异步数据且包含常见字段，直接显示
        if (isAsyncData && result) {
            const commonFields = ['VOLTAGE', 'CURRENT', 'CHANNEL', 'STATUS', 'VALUE'];
            command.returns.forEach(ret => {
                if (commonFields.includes(ret.name.toUpperCase()) && result[ret.name.toUpperCase()] !== undefined) {
                    updateFixedOutputField(command.name, ret.name, channel, result[ret.name.toUpperCase()], ret.type, isAsyncData);
                    dataProcessed = true;
                    console.log(`${logPrefix} 通过常见字段匹配设置 ${ret.name}: ${result[ret.name.toUpperCase()]}`);
                }
            });
        }
    }
}

/**
 * 修复的输出字段更新函数
 */
function updateFixedOutputField(commandName, fieldName, channel, value, type, isAsyncData) {
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
        field.style.color = isAsyncData ? '#fd7e14' : '#495057'; // 异步数据用橙色

        // 添加闪烁效果表示数据更新
        if (isAsyncData) {
            field.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                field.style.backgroundColor = '';
            }, 500);
        }

        console.log(`[返回值修复] 成功更新字段 ${fieldId}: ${displayValue}`);
        return true;

    } catch (error) {
        console.error(`[返回值修复] 更新字段失败:`, error);
        return false;
    }
}

// 立即执行修复
fixAsyncReturnValues();

console.log('[返回值修复] 异步返回值修复脚本加载完成');
console.log('[返回值修复] 现在异步命令的返回值应该能正确显示了');