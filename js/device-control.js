/**
 * 设备控制界面管理
 */

// 存储当前设备控制界面状态
let currentDeviceInterface = null;
let currentDeviceConnection = null; // 存储当前设备控制界面对应的连接信息
let deviceConfig = null;
let commandConfig = null;

/**
 * 打开设备控制界面
 * @param {string} connectionKey - 连接键值
 */
async function openDeviceControlInterface(connectionKey) {
    try {
        // 获取连接信息
        const connection = activeConnections.get(connectionKey);
        if (!connection) {
            console.error('连接不存在:', connectionKey);
            return;
        }

        // 加载配置文件
        await loadDeviceConfigs();

        // 隐藏主界面
        hideMainInterface();

        // 生成设备控制界面
        generateDeviceControlInterface(connection);

        console.log(`打开设备控制界面: ${connection.deviceName}`);
    } catch (error) {
        console.error('打开设备控制界面失败:', error);
    }
}

/**
 * 加载设备配置文件
 */
async function loadDeviceConfigs() {
    try {
        // 加载device.json
        const deviceResponse = await fetch('device.json');
        deviceConfig = await deviceResponse.json();

        // 加载config.json
        const configResponse = await fetch('config.json');
        commandConfig = await configResponse.json();

        console.log('配置文件加载成功');
    } catch (error) {
        console.error('加载配置文件失败:', error);
        throw error;
    }
}

/**
 * 隐藏主界面
 */
function hideMainInterface() {
    const elementsToHide = [
        '.title',
        '.subtitle',
        '.frame',
        '.frame2',
        '.search-box',
        '.search-btn',
        '.close-btn'
    ];

    elementsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
}

/**
 * 显示主界面
 */
function showMainInterface() {
    const elementsToShow = [
        '.title',
        '.subtitle',
        '.frame',
        '.frame2',
        '.search-box',
        '.search-btn',
        '.close-btn'
    ];

    elementsToShow.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = '';
        }
    });
}

/**
 * 生成设备控制界面
 * @param {Object} connection - 连接信息
 */
function generateDeviceControlInterface(connection) {
    // 查找设备配置
    const device = deviceConfig.commands.find(cmd => cmd.name === connection.deviceName);
    if (!device) {
        console.error('未找到设备配置:', connection.deviceName);
        return;
    }

    // 创建设备控制界面容器
    const controlInterface = document.createElement('div');
    controlInterface.id = 'device-control-interface';
    controlInterface.style.cssText = `
        position: absolute;
        top: 18%;
        left: 2%;
        width: 96%;
        height: 78%;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        overflow: hidden;
    `;

    // 创建选项卡容器
    const tabContainer = createTabContainer(device, connection);
    controlInterface.appendChild(tabContainer);

    // 创建内容区域
    const contentArea = createContentArea(device, connection);
    controlInterface.appendChild(contentArea);

    // 添加到页面
    document.body.appendChild(controlInterface);
    currentDeviceInterface = controlInterface;
    currentDeviceConnection = connection; // 存储当前连接信息

    // 默认显示第一个选项卡
    if (device.function.length > 0) {
        showTabContent(device.function[0].name, device, connection);
    }
}

/**
 * 创建选项卡容器
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {HTMLElement} 选项卡容器
 */
function createTabContainer(device, connection) {
    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = `
        width: 100%;
        height: 50px;
        background-color: #333;
        display: flex;
        align-items: center;
    `;

    // 为每个功能创建选项卡
    device.function.forEach((func, index) => {
        const tab = document.createElement('div');
        tab.className = 'device-tab';
        tab.textContent = func.name;
        tab.style.cssText = `
            padding: 10px 20px;
            background-color: ${index === 0 ? '#c80025' : '#666'};
            color: white;
            cursor: pointer;
            border-right: 1px solid #555;
            font-size: 14px;
        `;

        tab.onclick = () => {
            // 更新选项卡样式
            document.querySelectorAll('.device-tab').forEach(t => {
                t.style.backgroundColor = '#666';
            });
            tab.style.backgroundColor = '#c80025';

            // 显示对应内容
            showTabContent(func.name, device, connection);
        };

        tabContainer.appendChild(tab);
    });

    // 添加关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        margin-left: auto;
        margin-right: 20px;
        padding: 5px 15px;
        background-color: #c80025;
        color: white;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
    `;
    closeBtn.onclick = closeDeviceControlInterface;
    tabContainer.appendChild(closeBtn);

    return tabContainer;
}

/**
 * 创建内容区域
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {HTMLElement} 内容区域
 */
function createContentArea(device, connection) {
    const contentArea = document.createElement('div');
    contentArea.id = 'device-content-area';
    contentArea.style.cssText = `
        width: 100%;
        height: calc(100% - 50px);
        background-color: white;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
    `;

    return contentArea;
}

/**
 * 显示选项卡内容
 * @param {string} functionName - 功能名称
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 */
function showTabContent(functionName, device, connection) {
    const contentArea = document.getElementById('device-content-area');
    if (!contentArea) return;

    // 查找对应的命令配置
    const command = commandConfig.commands.find(cmd => cmd.name === functionName);
    if (!command) {
        contentArea.innerHTML = `<p>未找到命令配置: ${functionName}</p>`;
        return;
    }

    // 生成控制界面
    contentArea.innerHTML = generateControlInterface(command, device, connection);
}

/**
 * 生成控制界面HTML
 * @param {Object} command - 命令配置
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {string} HTML字符串
 */
function generateControlInterface(command, device, connection) {
    let html = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <!-- 左侧设备信息区域 -->
            <div style="position: relative; width: 200px; height: 300px; margin-right: 10px;">
                <div style="background-image: url('${deviceImageMap[device.name] || '3.png'}'); width: 100%; height: 150px; background-size: contain; background-color: #efefef; background-position: center center; background-repeat: no-repeat; margin: 0px auto; border: 1px solid #ccc;"></div>
                <button style="position: absolute; right: 0%; top: 4%; background-image: url('-.png'); width: 18.86%; height: 2.17vh; background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #efefef; border: 0px solid #000; cursor: pointer;" onclick="closeDeviceControlInterface()"></button>
                <div style="margin-top: 3%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Model: ${device.name}</div>
                <div style="margin-top: 0%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Number: <input type="text" value="2024010978" style="width: 50%; text-align: left; border: 1px solid #efefef; font-size: 0.8vw; background-color: #efefef;"></div>

            </div>
            
            <!-- 右侧控制表格区域 -->
            <div style="flex: 1;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="background-color: #e9ecef; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>
                            <th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">ADDRESS</th>
                            <th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>
    `;

    // 添加参数列标题（除了ADDRESS和CHANNEL）
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
            html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${param.name}</th>`;
        }
    });

    // 添加返回值列标题
    command.returns.forEach(ret => {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${ret.name}</th>`;
    });

    html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">EXE</th></tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        const rowBgColor = channel % 2 === 0 ? '#f8f9fa' : 'white';
        html += `<tr style="background-color: ${rowBgColor};">`;

        // 通道号
        html += `<td style="padding: 12px; text-align: center; background-color: #6c9bd1; color: white; font-weight: bold;">Channel${channel}</td>`;

        // ADDRESS（自动填充）
        html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${connection.deviceAddress}</td>`;

        // CHANNEL（自动填充）
        html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${channel}</td>`;

        // 其他参数输入框
        command.params.forEach(param => {
            if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
                html += `<td style="padding: 8px;">`;
                html += generateInputField(param, channel, command.name);
                html += `</td>`;
            }
        });

        // 返回值显示框
        command.returns.forEach(ret => {
            html += `<td style="padding: 8px;">`;
            html += generateOutputField(ret, channel, command.name);
            html += `</td>`;
        });

        // 执行按钮
        html += `<td style="padding: 8px; text-align: center;">`;
        html += `<button onclick="executeCommand('${command.name}', ${channel})" style="background-color: #28a745; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#218838'" onmouseout="this.style.backgroundColor='#28a745'">EXE</button>`;
        html += `</td>`;

        html += `</tr>`;
    }

    html += `</tbody></table>
            </div>
        </div>`;

    return html;
}

/**
 * 生成输入字段
 * @param {Object} param - 参数配置
 * @param {number} channel - 通道号
 * @param {string} commandName - 命令名称
 * @returns {string} HTML字符串
 */
function generateInputField(param, channel, commandName) {
    const fieldId = `${commandName}_${param.name}_${channel}`;

    if (param.allowvalue && param.allowvalue.length > 0) {
        // 下拉选择框
        let html = `<select id="${fieldId}" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; background-color: white; font-size: 14px;">`;
        param.allowvalue.forEach(value => {
            html += `<option value="${value}">${value}</option>`;
        });
        html += `</select>`;
        return html;
    } else {
        // 文本输入框
        const placeholder = param.description || param.name;
        return `<input type="text" id="${fieldId}" placeholder="${placeholder}" style="width: 100%; padding: 8px; border: none; border-bottom: 2px solid #6c9bd1; border-radius: 0; font-size: 14px; background: transparent; outline: none; transition: border-bottom-color 0.2s;" onfocus="this.style.borderBottomColor='#4a90e2'; this.style.boxShadow='0 2px 0 0 rgba(74,144,226,0.3)'" onblur="this.style.borderBottomColor='#6c9bd1'; this.style.boxShadow='none'">`;
    }
}

/**
 * 生成输出字段
 * @param {Object} ret - 返回值配置
 * @param {number} channel - 通道号
 * @param {string} commandName - 命令名称
 * @returns {string} HTML字符串
 */
function generateOutputField(ret, channel, commandName) {
    const fieldId = `${commandName}_${ret.name}_output_${channel}`;
    return `<input type="text" id="${fieldId}" readonly style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; background-color: #f8f9fa; font-size: 14px; color: #495057; font-weight: 500;">`;
}

/**
 * 执行命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 */
function executeCommand(commandName, channel) {
    try {
        // 获取命令配置
        const command = commandConfig.commands.find(cmd => cmd.name === commandName);
        if (!command) {
            console.error('未找到命令配置:', commandName);
            return;
        }

        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            console.error('未找到活跃连接');
            return;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            console.error('未找到连接实例');
            return;
        }

        // 收集参数值并构建参数数组
        const params = [];
        command.params.forEach(param => {
            let value;
            if (param.name === 'ADDRESS') {
                // 从连接信息获取地址
                value = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                value = channel;
            } else {
                const fieldId = `${commandName}_${param.name}_${channel}`;
                const field = document.getElementById(fieldId);
                if (field) {
                    value = field.value;
                    // 根据类型转换值
                    if (param.type === 'int') {
                        value = parseInt(value) || 0;
                    } else if (param.type === 'float') {
                        value = parseFloat(value) || 0.0;
                    }
                } else {
                    value = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
                }
            }
            params.push(value);
        });

        console.log(`执行命令: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理执行结果
        handleCommandResult(command, channel, result, params);

    } catch (error) {
        console.error('执行命令失败:', error);
        // 显示错误信息到输出框
        showErrorInOutputFields(command, channel, error.message);
    }
}

/**
 * 获取当前活跃连接（用于设备控制界面）
 * @returns {Object|null} 当前连接信息
 */
function getCurrentActiveConnection() {
    // 返回当前设备控制界面对应的连接信息
    return currentDeviceConnection;
}

/**
 * 处理命令执行结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {Array} params - 执行参数
 */
function handleCommandResult(command, channel, result, params) {
    if (result.error) {
        console.error(`命令执行失败: ${result.error}`);
        showErrorInOutputFields(command, channel, result.error);
        return;
    }

    console.log(`命令 ${command.name} 执行成功:`, result);

    // 将结果显示到输出框
    // 首先检查result是否直接包含返回值（如 {"K":"K","O":"C"}）
    if (result && typeof result === 'object' && !result.error && !result.data) {
        // 直接从result对象中按名称映射返回值
        command.returns.forEach(ret => {
            const fieldId = `${command.name}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result[ret.name] !== undefined) {
                field.value = result[ret.name];
                console.log(`设置输出字段 ${ret.name}: ${result[ret.name]}`);
            }
        });
    } else if (result.data && Array.isArray(result.data)) {
        // 如果返回的是数组数据，按位置映射到返回值字段
        command.returns.forEach((ret, index) => {
            const fieldId = `${command.name}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result.data[index] !== undefined) {
                field.value = result.data[index];
            }
        });
    } else if (result.data && typeof result.data === 'object') {
        // 如果返回的是对象，按名称映射
        command.returns.forEach(ret => {
            const fieldId = `${command.name}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result.data[ret.name] !== undefined) {
                field.value = result.data[ret.name];
            }
        });
    } else {
        // 简单的成功响应，显示默认值
        command.returns.forEach(ret => {
            const fieldId = `${command.name}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field) {
                if (ret.type === 'str') {
                    field.value = ret.name === 'O' ? 'O' : 'K';
                } else if (ret.type === 'int') {
                    field.value = channel.toString();
                } else if (ret.type === 'float') {
                    field.value = params.find(p => typeof p === 'number' && p % 1 !== 0) || '0.0';
                }
            }
        });
    }
}

/**
 * 在输出框中显示错误信息
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {string} errorMessage - 错误信息
 */
function showErrorInOutputFields(command, channel, errorMessage) {
    command.returns.forEach(ret => {
        const fieldId = `${command.name}_${ret.name}_output_${channel}`;
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = `Error: ${errorMessage}`;
            field.style.color = 'red';
            // 3秒后恢复正常颜色
            setTimeout(() => {
                field.style.color = '';
            }, 3000);
        }
    });
}

/**
 * 模拟命令执行
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} params - 参数
 */
function simulateCommandExecution(command, channel, params) {
    // 模拟返回值
    command.returns.forEach(ret => {
        const fieldId = `${command.name}_${ret.name}_output_${channel}`;
        const field = document.getElementById(fieldId);
        if (field) {
            // 生成模拟返回值
            let mockValue = '';
            if (ret.type === 'str') {
                mockValue = ret.name === 'O' ? 'O' : 'K';
            } else if (ret.type === 'int') {
                mockValue = channel.toString();
            } else if (ret.type === 'float') {
                mockValue = (Math.random() * 100).toFixed(2);
            }
            field.value = mockValue;
        }
    });

    console.log(`命令 ${command.name} 执行完成，通道 ${channel}`);
}

/**
 * 关闭设备控制界面
 */
function closeDeviceControlInterface() {
    if (currentDeviceInterface) {
        document.body.removeChild(currentDeviceInterface);
        currentDeviceInterface = null;
    }

    // 清除当前连接信息
    currentDeviceConnection = null;

    // 显示主界面
    showMainInterface();

    console.log('设备控制界面已关闭');
}