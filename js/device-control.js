/**
 * 设备控制界面管理
 */

// 存储当前设备控制界面状态
let currentDeviceInterface = null;
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
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <img src="3.png" style="width: 80px; height: 60px; margin-right: 20px;">
            <div>
                <div style="font-weight: bold;">设备: ${device.name}</div>
                <div style="color: #666;">产品编号: 2024010978</div>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="border: 1px solid #ccc; padding: 10px;">通道</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">ADDRESS</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">CHANNEL</th>
    `;

    // 添加参数列标题（除了ADDRESS和CHANNEL）
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
            html += `<th style="border: 1px solid #ccc; padding: 10px;">${param.name}</th>`;
        }
    });

    // 添加返回值列标题
    command.returns.forEach(ret => {
        html += `<th style="border: 1px solid #ccc; padding: 10px;">${ret.name}</th>`;
    });

    html += `<th style="border: 1px solid #ccc; padding: 10px;">操作</th></tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        html += `<tr>`;
        
        // 通道号
        html += `<td style="border: 1px solid #ccc; padding: 10px; text-align: center; background-color: #e0e0e0;">${channel}通道</td>`;
        
        // ADDRESS（自动填充）
        html += `<td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${connection.deviceAddress}</td>`;
        
        // CHANNEL（自动填充）
        html += `<td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${channel}</td>`;
        
        // 其他参数输入框
        command.params.forEach(param => {
            if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
                html += `<td style="border: 1px solid #ccc; padding: 5px;">`;
                html += generateInputField(param, channel, command.name);
                html += `</td>`;
            }
        });
        
        // 返回值显示框
        command.returns.forEach(ret => {
            html += `<td style="border: 1px solid #ccc; padding: 5px;">`;
            html += generateOutputField(ret, channel, command.name);
            html += `</td>`;
        });
        
        // 执行按钮
        html += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">`;
        html += `<button onclick="executeCommand('${command.name}', ${channel})" style="background-color: #4CAF50; color: white; border: none; padding: 5px 10px; cursor: pointer;">执行</button>`;
        html += `</td>`;
        
        html += `</tr>`;
    }

    html += `</tbody></table>`;
    
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
        let html = `<select id="${fieldId}" style="width: 100%; padding: 5px;">`;
        param.allowvalue.forEach(value => {
            html += `<option value="${value}">${value}</option>`;
        });
        html += `</select>`;
        return html;
    } else {
        // 文本输入框
        const placeholder = param.description || param.name;
        return `<input type="text" id="${fieldId}" placeholder="${placeholder}" style="width: 100%; padding: 5px; border: 1px solid #ccc;">`;
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
    return `<input type="text" id="${fieldId}" readonly style="width: 100%; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">`;
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

        // 收集参数值
        const params = {};
        command.params.forEach(param => {
            if (param.name === 'ADDRESS') {
                // 从连接信息获取地址
                const connection = Array.from(activeConnections.values())[0]; // 简化处理，取第一个连接
                params[param.name] = parseInt(connection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                params[param.name] = channel;
            } else {
                const fieldId = `${commandName}_${param.name}_${channel}`;
                const field = document.getElementById(fieldId);
                if (field) {
                    let value = field.value;
                    // 根据类型转换值
                    if (param.type === 'int') {
                        value = parseInt(value) || 0;
                    } else if (param.type === 'float') {
                        value = parseFloat(value) || 0.0;
                    }
                    params[param.name] = value;
                }
            }
        });

        console.log(`执行命令: ${commandName}`, params);

        // 模拟命令执行结果
        simulateCommandExecution(command, channel, params);

    } catch (error) {
        console.error('执行命令失败:', error);
    }
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

    // 显示主界面
    showMainInterface();

    console.log('设备控制界面已关闭');
}