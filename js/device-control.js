/**
 * 设备控制界面管理
 */

// 存储当前设备控制界面状态
let currentDeviceInterface = null;
let currentDeviceConnection = null; // 存储当前设备控制界面对应的连接信息
let deviceConfig = null;
let commandConfig = null;

// 异步线程管理相关状态
let asyncThreadManager = {
    runningCommands: new Map(), // 存储正在运行的异步命令
    statusUpdateTimer: null,    // 状态更新定时器
    statusElement: null,        // 状态显示元素
    isEnabled: false           // 是否启用异步管理
};

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
        const fs = require('fs');
        const path = require('path');

        // 获取配置文件路径
        function getConfigFilePath(filename) {
            let app = null;
            try {
                app = require('electron').app;
            } catch (error) {
                console.log('无法访问 electron.app，使用备用路径检测');
            }

            const appPath = app ? app.getAppPath() : __dirname;
            const resourcesPath = app ? process.resourcesPath : path.dirname(__dirname);

            const possiblePaths = [
                // 开发环境路径
                path.join(__dirname, '..', filename),
                path.join(__dirname, filename),

                // 打包后的路径 - extraFiles 会将文件复制到应用根目录
                path.join(path.dirname(resourcesPath), filename),
                path.join(resourcesPath, filename),

                // 备用路径
                path.join(path.dirname(appPath), filename),
                path.join(process.cwd(), filename),
            ];

            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    console.log(`找到配置文件: ${filePath}`);
                    return filePath;
                }
            }
            console.log(`未找到配置文件 ${filename}，检查的路径:`, possiblePaths);
            return null;
        }

        // 加载device.json
        const devicePath = getConfigFilePath('device.json');
        if (!devicePath) {
            throw new Error('未找到 device.json 文件');
        }
        const deviceData = fs.readFileSync(devicePath, 'utf8');
        deviceConfig = JSON.parse(deviceData);

        // 加载config.json
        const configPath = getConfigFilePath('x64\\Debug\\config.json');
        if (!configPath) {
            throw new Error('未找到 config.json 文件');
        }
        const configData = fs.readFileSync(configPath, 'utf8');
        commandConfig = JSON.parse(configData);

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

    // 创建异步线程管理面板
    const asyncPanel = createAsyncThreadManagementPanel();
    controlInterface.appendChild(asyncPanel);

    // 创建内容区域
    const contentArea = createContentArea(device, connection);
    controlInterface.appendChild(contentArea);

    // 启用异步线程管理
    initializeAsyncThreadManager();

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
        tab.textContent = func.displayName || func.name;
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
 * 创建异步线程管理面板
 * @returns {HTMLElement} 异步线程管理面板
 */
function createAsyncThreadManagementPanel() {
    const asyncPanel = document.createElement('div');
    asyncPanel.id = 'async-thread-panel';
    asyncPanel.style.cssText = `
        width: 100%;
        height: 40px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        align-items: center;
        padding: 0 20px;
        box-sizing: border-box;
        font-size: 14px;
    `;

    // 状态显示区域
    const statusArea = document.createElement('div');
    statusArea.style.cssText = `
        display: flex;
        align-items: center;
        margin-right: 20px;
    `;

    const statusLabel = document.createElement('span');
    statusLabel.textContent = '异步状态: ';
    statusLabel.style.cssText = `
        color: #495057;
        margin-right: 8px;
        font-weight: 500;
    `;

    const statusDisplay = document.createElement('span');
    statusDisplay.id = 'async-status-display';
    statusDisplay.textContent = '无异步命令运行';
    statusDisplay.style.cssText = `
        color: #28a745;
        font-weight: 600;
        min-width: 200px;
    `;

    statusArea.appendChild(statusLabel);
    statusArea.appendChild(statusDisplay);

    // 控制按钮区域
    const controlArea = document.createElement('div');
    controlArea.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
    `;

    // 停止所有异步命令按钮
    const stopAllBtn = document.createElement('button');
    stopAllBtn.textContent = '停止所有异步命令';
    stopAllBtn.style.cssText = `
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.2s;
    `;
    stopAllBtn.onmouseover = () => stopAllBtn.style.backgroundColor = '#c82333';
    stopAllBtn.onmouseout = () => stopAllBtn.style.backgroundColor = '#dc3545';
    stopAllBtn.onclick = stopAllAsyncCommands;

    // 刷新状态按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新状态';
    refreshBtn.style.cssText = `
        background-color: #17a2b8;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.2s;
    `;
    refreshBtn.onmouseover = () => refreshBtn.style.backgroundColor = '#138496';
    refreshBtn.onmouseout = () => refreshBtn.style.backgroundColor = '#17a2b8';
    refreshBtn.onclick = refreshAsyncStatus;

    // 确保同步执行按钮
    const ensureSyncBtn = document.createElement('button');
    ensureSyncBtn.textContent = '确保同步执行';
    ensureSyncBtn.style.cssText = `
        background-color: #ffc107;
        color: #212529;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.2s;
    `;
    ensureSyncBtn.onmouseover = () => ensureSyncBtn.style.backgroundColor = '#e0a800';
    ensureSyncBtn.onmouseout = () => ensureSyncBtn.style.backgroundColor = '#ffc107';
    ensureSyncBtn.onclick = ensureSyncExecution;

    controlArea.appendChild(stopAllBtn);
    controlArea.appendChild(refreshBtn);
    controlArea.appendChild(ensureSyncBtn);

    asyncPanel.appendChild(statusArea);
    asyncPanel.appendChild(controlArea);

    // 存储状态显示元素的引用
    asyncThreadManager.statusElement = statusDisplay;

    return asyncPanel;
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
        height: calc(100% - 90px);
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

    // 检查是否是组合选项卡
    const combinedTab = deviceConfig.combinedTabs?.find(tab => tab.name === functionName);
    if (combinedTab) {
        // 生成组合选项卡界面
        contentArea.innerHTML = generateCombinedTabInterface(combinedTab, device, connection);
        return;
    }

    // 检查是否是状态灯
    const statusLight = deviceConfig.statusLights?.find(light => light.name === functionName);
    if (statusLight) {
        // 生成状态灯界面
        contentArea.innerHTML = generateStatusLightInterface(statusLight, device, connection);
        return;
    }

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
    // 获取当前命令的隐藏列配置
    const hiddenColumns = command.hiddenColumns || [];

    // 从device.json的function配置中获取displayName
    const functionConfig = device.function.find(func => func.name === command.name);
    const buttonDisplayName = functionConfig?.displayName || 'EXE';

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
                            <th style="background-color: #e9ecef; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;

    // 添加ADDRESS列标题（如果未隐藏）
    if (!hiddenColumns.includes('ADDRESS')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">ADDRESS</th>`;
    }

    // 添加CHANNEL列标题（如果未隐藏）
    if (!hiddenColumns.includes('CHANNEL')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;
    }

    // 添加参数列标题（除了ADDRESS和CHANNEL，且未隐藏的，优先显示description）
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL' && !hiddenColumns.includes(param.name)) {
            const displayName = param.description || param.name;
            html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${displayName}</th>`;
        }
    });

    // 添加返回值列标题（未隐藏的，优先显示description）
    command.returns.forEach(ret => {
        if (!hiddenColumns.includes(ret.name)) {
            const displayName = ret.description || ret.name;
            html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${displayName}</th>`;
        }
    });

    html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">EXE</th></tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        const rowBgColor = channel % 2 === 0 ? '#f8f9fa' : 'white';
        html += `<tr style="background-color: ${rowBgColor};">`;

        // 通道号
        html += `<td style="padding: 12px; text-align: center; background-color: #6c9bd1; color: white; font-weight: bold;">Channel${channel}</td>`;

        // ADDRESS（自动填充，如果未隐藏）
        if (!hiddenColumns.includes('ADDRESS')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${connection.deviceAddress}</td>`;
        }

        // CHANNEL（自动填充，如果未隐藏）
        if (!hiddenColumns.includes('CHANNEL')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${channel}</td>`;
        }

        // 其他参数输入框（未隐藏的）
        command.params.forEach(param => {
            if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL' && !hiddenColumns.includes(param.name)) {
                html += `<td style="padding: 8px;">`;
                html += generateInputField(param, channel, command.name);
                html += `</td>`;
            }
        });

        // 返回值显示框（未隐藏的）
        command.returns.forEach(ret => {
            if (!hiddenColumns.includes(ret.name)) {
                html += `<td style="padding: 8px;">`;
                html += generateOutputField(ret, channel, command.name);
                html += `</td>`;
            }
        });

        // 执行按钮
        html += `<td style="padding: 8px; text-align: center;">`;
        html += `<button onclick="executeCommand('${command.name}', ${channel})" 
            onmouseover="highlightRelatedFields('${command.name}', ${channel}, true); this.style.backgroundColor='#218838'" 
            onmouseout="highlightRelatedFields('${command.name}', ${channel}, false); this.style.backgroundColor='#6c9bd1'" 
            style="background-color: #6c9bd1; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: background-color 0.2s;">${buttonDisplayName}</button>`;
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
    return `<input type="text" id="${fieldId}" readonly style="width: 100%; padding: 8px; border: none; border-bottom: 2px solid #6c9bd1; border-radius: 0; background: transparent; font-size: 14px; color: #495057; font-weight: 500; outline: none;">`;
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

        // 检查是否是异步命令（timeout=-1或asyncMode=true）
        const isAsyncCommand = command.timeout === -1 || command.asyncMode === true;
        
        if (isAsyncCommand && asyncThreadManager.isEnabled) {
            // 检查是否已有同名异步命令在运行
            if (isAsyncCommandRunning(commandName)) {
                const shouldStop = confirm(`异步命令 '${commandName}' 已在运行，是否停止旧命令并启动新命令？`);
                if (shouldStop) {
                    stopAsyncCommand(commandName);
                    // 等待一下确保停止完成
                    setTimeout(() => {
                        executeAsyncCommand(commandName, params, command, channel);
                    }, 200);
                } else {
                    console.log(`用户取消了重复的异步命令执行: ${commandName}`);
                }
                return;
            } else {
                // 记录异步命令启动并执行
                executeAsyncCommand(commandName, params, command, channel);
                return;
            }
        }

        // 执行同步命令
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
        // command.returns.forEach(ret => {
        //     const fieldId = `${command.name}_${ret.name}_output_${channel}`;
        //     const field = document.getElementById(fieldId);
        //     if (field) {
        //         if (ret.type === 'str') {
        //             field.value = ret.name === 'O' ? 'out' : 'out';
        //         } else if (ret.type === 'int') {
        //             field.value = channel.toString();
        //         } else if (ret.type === 'float') {
        //             field.value = params.find(p => typeof p === 'number' && p % 1 !== 0) || '0.0';
        //         }
        //     }
        // });
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
 * 生成组合选项卡界面
 * @param {Object} combinedTab - 组合选项卡配置
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {string} HTML字符串
 */
function generateCombinedTabInterface(combinedTab, device, connection) {
    // 获取所有相关命令的配置
    const commands = combinedTab.commands.map(cmdRef => {
        const command = commandConfig.commands.find(cmd => cmd.name === cmdRef.name);
        return {
            ...command,
            displayName: cmdRef.displayName,
            order: cmdRef.order
        };
    }).sort((a, b) => a.order - b.order);

    // 收集所有命令的隐藏列配置
    const allHiddenColumns = new Set();
    commands.forEach(command => {
        if (command.hiddenColumns) {
            command.hiddenColumns.forEach(col => allHiddenColumns.add(col));
        }
    });

    // 收集所有唯一的参数和返回值（合并命令的输入输出，但排除隐藏列）
    const allParams = new Map();
    const allReturns = new Map();

    commands.forEach(command => {
        command.params.forEach(param => {
            if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL' && !allHiddenColumns.has(param.name)) {
                allParams.set(param.name, param);
            }
        });
        command.returns.forEach(ret => {
            if (!allHiddenColumns.has(ret.name)) {
                allReturns.set(ret.name, ret);
            }
        });
    });

    let html = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <!-- 左侧设备信息区域 -->
            <div style="position: relative; width: 200px; height: 300px; margin-right: 10px;">
                <div style="background-image: url('${deviceImageMap[device.name] || '3.png'}'); width: 100%; height: 150px; background-size: contain; background-color: #efefef; background-position: center center; background-repeat: no-repeat; margin: 0px auto; border: 1px solid #ccc;"></div>
                <button style="position: absolute; right: 0%; top: 4%; background-image: url('-.png'); width: 18.86%; height: 2.17vh; background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #efefef; border: 0px solid #000; cursor: pointer;" onclick="closeDeviceControlInterface()"></button>
                <div style="margin-top: 3%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Model: ${device.name}</div>
                <div style="margin-top: 0%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Number: <input type="text" value="2024010978" style="width: 50%; text-align: left; border: 1px solid #efefef; font-size: 0.8vw; background-color: #efefef;"></div>
            </div>
            
            <!-- 右侧组合控制表格区域 -->
            <div style="flex: 1;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="background-color: #e9ecef; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;

    // 添加ADDRESS列标题（如果未隐藏）
    if (!allHiddenColumns.has('ADDRESS')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">ADDRESS</th>`;
    }

    // 添加CHANNEL列标题（如果未隐藏）
    if (!allHiddenColumns.has('CHANNEL')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;
    }

    // 添加合并的参数列标题（未隐藏的，优先显示description）
    Array.from(allParams.values()).forEach(param => {
        const displayName = param.description || param.name;
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${displayName}</th>`;
    });

    // 添加合并的返回值列标题（未隐藏的，优先显示description）
    Array.from(allReturns.values()).forEach(ret => {
        const displayName = ret.description || ret.name;
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${displayName}</th>`;
    });

    // 添加命令执行列标题（可调整顺序）
    commands.forEach(command => {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${command.displayName} EXE</th>`;
    });

    // 如果有状态灯配置，添加状态灯列（支持自定义列名）
    if (combinedTab.statusLights && combinedTab.statusLights.length > 0) {
        combinedTab.statusLights.forEach(statusLight => {
            const columnName = statusLight.columnName || statusLight.name || '状态';
            html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">${columnName}</th>`;
        });
    }

    html += `</tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        const rowBgColor = channel % 2 === 0 ? '#f8f9fa' : 'white';
        html += `<tr style="background-color: ${rowBgColor};">`;

        // 通道号
        html += `<td style="padding: 12px; text-align: center; background-color: #6c9bd1; color: white; font-weight: bold;">Channel${channel}</td>`;

        // ADDRESS（自动填充，如果未隐藏）
        if (!allHiddenColumns.has('ADDRESS')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${connection.deviceAddress}</td>`;
        }

        // CHANNEL（自动填充，如果未隐藏）
        if (!allHiddenColumns.has('CHANNEL')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${channel}</td>`;
        }

        // 合并的参数输入框（未隐藏的）
        Array.from(allParams.values()).forEach(param => {
            html += `<td style="padding: 8px;">`;
            html += generateCombinedInputField(param, channel, combinedTab.name);
            html += `</td>`;
        });

        // 合并的返回值显示框（未隐藏的）
        Array.from(allReturns.values()).forEach(ret => {
            html += `<td style="padding: 8px;">`;
            html += generateCombinedOutputField(ret, channel, combinedTab.name);
            html += `</td>`;
        });

        // 执行按钮（按顺序排列）
        commands.forEach(command => {
            html += `<td style="padding: 8px; text-align: center;">`;
            html += `<button onclick="executeCombinedCommand('${command.name}', ${channel}, '${combinedTab.name}')" 
                onmouseover="highlightCombinedRelatedFields('${command.name}', ${channel}, '${combinedTab.name}', true); this.style.backgroundColor='#218838'" 
                onmouseout="highlightCombinedRelatedFields('${command.name}', ${channel}, '${combinedTab.name}', false); this.style.backgroundColor='#6c9bd1'" 
                style="background-color: #6c9bd1; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: background-color 0.2s;">${command.displayName}</button>`;
            html += `</td>`;
        });

        // 如果有状态灯配置，添加状态灯按钮
        if (combinedTab.statusLights && combinedTab.statusLights.length > 0) {
            combinedTab.statusLights.forEach(statusLight => {
                html += `<td style="padding: 8px; text-align: center;">`;
                html += `<div style="display: inline-flex; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;

                statusLight.buttons.forEach((button, index) => {
                    const isFirst = index === 0;
                    const isLast = index === statusLight.buttons.length - 1;
                    const borderRadius = isFirst ? '4px 0 0 4px' : (isLast ? '0 4px 4px 0' : '0');

                    html += `<button 
                        id="statusBtn_${statusLight.name}_${channel}_${button.value}"
                        onclick="executeCombinedToggleStatusCommand('${statusLight.setCommand}', ${channel}, '${button.value}', '${statusLight.name}', '${combinedTab.name}')" 
                        style="
                            background-color: ${button.inactiveColor}; 
                            color: #6c757d; 
                            border: none; 
                            padding: 8px 20px; 
                            cursor: pointer; 
                            font-weight: bold; 
                            transition: all 0.2s ease;
                            border-radius: ${borderRadius};
                            border-right: ${isLast ? 'none' : '1px solid #dee2e6'};
                            min-width: 50px;
                            font-size: 16px;
                        ">${button.displayName}</button>`;
                });

                html += `</div></td>`;
            });
        }

        html += `</tr>`;
    }

    html += `</tbody></table>
            </div>
        </div>`;

    return html;
}

/**
 * 生成组合输入字段
 * @param {Object} param - 参数配置
 * @param {number} channel - 通道号
 * @param {string} tabName - 选项卡名称
 * @returns {string} HTML字符串
 */
function generateCombinedInputField(param, channel, tabName) {
    const fieldId = `${tabName}_${param.name}_${channel}`;

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
 * 生成组合输出字段
 * @param {Object} ret - 返回值配置
 * @param {number} channel - 通道号
 * @param {string} tabName - 选项卡名称
 * @returns {string} HTML字符串
 */
function generateCombinedOutputField(ret, channel, tabName) {
    const fieldId = `${tabName}_${ret.name}_output_${channel}`;
    return `<input type="text" id="${fieldId}" readonly style="width: 100%; padding: 8px; border: none; border-bottom: 2px solid #6c9bd1; border-radius: 0; background: transparent; font-size: 14px; color: #495057; font-weight: 500; outline: none;">`;
}

/**
 * 执行组合命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} tabName - 选项卡名称
 */
function executeCombinedCommand(commandName, channel, tabName) {
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
                const fieldId = `${tabName}_${param.name}_${channel}`;
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

        console.log(`执行组合命令: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理执行结果
        handleCombinedCommandResult(command, channel, result, params, tabName);

    } catch (error) {
        console.error('执行组合命令失败:', error);
        // 显示错误信息到输出框
        showCombinedErrorInOutputFields(command, channel, error.message, tabName);
    }
}

/**
 * 处理组合命令执行结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {Array} params - 执行参数
 * @param {string} tabName - 选项卡名称
 */
function handleCombinedCommandResult(command, channel, result, params, tabName) {
    if (result.error) {
        console.error(`组合命令执行失败: ${result.error}`);
        showCombinedErrorInOutputFields(command, channel, result.error, tabName);
        return;
    }

    console.log(`组合命令 ${command.name} 执行成功:`, result);

    // 将结果显示到输出框
    if (result && typeof result === 'object' && !result.error && !result.data) {
        // 直接从result对象中按名称映射返回值
        command.returns.forEach(ret => {
            const fieldId = `${tabName}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result[ret.name] !== undefined) {
                field.value = result[ret.name];
                console.log(`设置组合输出字段 ${ret.name}: ${result[ret.name]}`);
            }
        });
    } else if (result.data && Array.isArray(result.data)) {
        // 如果返回的是数组数据，按位置映射到返回值字段
        command.returns.forEach((ret, index) => {
            const fieldId = `${tabName}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result.data[index] !== undefined) {
                field.value = result.data[index];
            }
        });
    } else if (result.data && typeof result.data === 'object') {
        // 如果返回的是对象，按名称映射
        command.returns.forEach(ret => {
            const fieldId = `${tabName}_${ret.name}_output_${channel}`;
            const field = document.getElementById(fieldId);
            if (field && result.data[ret.name] !== undefined) {
                field.value = result.data[ret.name];
            }
        });
    } else {
        // 简单的成功响应，显示默认值
        // command.returns.forEach(ret => {
        //     const fieldId = `${tabName}_${ret.name}_output_${channel}`;
        //     const field = document.getElementById(fieldId);
        //     if (field) {
        //         if (ret.type === 'str') {
        //             field.value = ret.name === 'O' ? 'out' : 'out';
        //         } else if (ret.type === 'int') {
        //             field.value = channel.toString();
        //         } else if (ret.type === 'float') {
        //             field.value = params.find(p => typeof p === 'number' && p % 1 !== 0) || '0.0';
        //         }
        //     }
        // });
    }
}

/**
 * 在组合输出框中显示错误信息
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {string} errorMessage - 错误信息
 * @param {string} tabName - 选项卡名称
 */
function showCombinedErrorInOutputFields(command, channel, errorMessage, tabName) {
    command.returns.forEach(ret => {
        const fieldId = `${tabName}_${ret.name}_output_${channel}`;
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

// ===== 异步线程管理功能实现 =====

/**
 * 初始化异步线程管理器
 */
function initializeAsyncThreadManager() {
    asyncThreadManager.isEnabled = true;
    asyncThreadManager.runningCommands.clear();
    
    // 启动状态更新定时器
    startAsyncStatusUpdate();
    
    console.log('异步线程管理器已初始化');
}

/**
 * 执行异步命令
 * @param {string} commandName - 命令名称
 * @param {Array} params - 参数数组
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 */
function executeAsyncCommand(commandName, params, command, channel) {
    try {
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

        // 记录异步命令启动
        recordAsyncCommandStart(commandName, { channel, params });

        console.log(`执行异步命令: ${commandName}(${params.join(', ')})`);

        // 检查是否有异步执行方法
        if (typeof connectionInstance.executeCommandJSONAsync === 'function') {
            // 使用异步执行方法
            connectionInstance.executeCommandJSONAsync(commandName, params);
            console.log(`异步命令 ${commandName} 已启动（使用异步方法）`);
        } else {
            // 使用普通方法执行异步命令
            const result = connectionInstance.executeCommandJSON(commandName, params);
            
            // 处理异步命令的启动结果
            if (result && result.status === 'async_started') {
                console.log(`异步命令 ${commandName} 已启动:`, result);
            } else {
                console.log(`异步命令 ${commandName} 执行结果:`, result);
                // 如果不是真正的异步命令，从记录中移除
                recordAsyncCommandComplete(commandName);
            }
        }

        // 更新UI状态（如果需要）
        updateAsyncCommandUI(commandName, channel, true);

    } catch (error) {
        console.error(`执行异步命令 ${commandName} 失败:`, error);
        // 从记录中移除失败的命令
        recordAsyncCommandComplete(commandName);
        
        // 显示错误信息
        if (command && command.returns) {
            showErrorInOutputFields(command, channel, error.message);
        }
    }
}

/**
 * 更新异步命令的UI状态
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {boolean} isRunning - 是否正在运行
 */
function updateAsyncCommandUI(commandName, channel, isRunning) {
    // 这里可以添加UI更新逻辑，比如禁用/启用按钮等
    // 例如：改变按钮颜色、添加加载动画等
    
    // 查找对应的执行按钮
    const buttons = document.querySelectorAll(`button[onclick*="executeCommand('${commandName}', ${channel})"]`);
    buttons.forEach(button => {
        if (isRunning) {
            button.style.backgroundColor = '#fd7e14'; // 橙色表示运行中
            button.textContent = button.textContent.replace('EXE', '运行中...');
            button.disabled = false; // 保持可点击，用于停止
        } else {
            button.style.backgroundColor = '#6c9bd1'; // 恢复原色
            button.textContent = button.textContent.replace('运行中...', 'EXE');
            button.disabled = false;
        }
    });
}

/**
 * 启动异步状态更新
 */
function startAsyncStatusUpdate() {
    if (asyncThreadManager.statusUpdateTimer) {
        clearInterval(asyncThreadManager.statusUpdateTimer);
    }
    
    // 每2秒更新一次状态
    asyncThreadManager.statusUpdateTimer = setInterval(() => {
        refreshAsyncStatus();
    }, 2000);
    
    // 立即更新一次
    refreshAsyncStatus();
}

/**
 * 停止异步状态更新
 */
function stopAsyncStatusUpdate() {
    if (asyncThreadManager.statusUpdateTimer) {
        clearInterval(asyncThreadManager.statusUpdateTimer);
        asyncThreadManager.statusUpdateTimer = null;
    }
    
    // 重置状态显示
    if (asyncThreadManager.statusElement) {
        asyncThreadManager.statusElement.textContent = '无异步命令运行';
        asyncThreadManager.statusElement.style.color = '#28a745';
    }
}

/**
 * 刷新异步状态显示
 */
function refreshAsyncStatus() {
    if (!asyncThreadManager.isEnabled || !asyncThreadManager.statusElement) {
        return;
    }
    
    try {
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            asyncThreadManager.statusElement.textContent = '未连接';
            asyncThreadManager.statusElement.style.color = '#6c757d';
            return;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            asyncThreadManager.statusElement.textContent = '连接实例不存在';
            asyncThreadManager.statusElement.style.color = '#dc3545';
            return;
        }

        // 检查是否有异步线程管理功能
        if (typeof connectionInstance.getAsyncStatus === 'function') {
            // 调用底层的异步状态查询
            const status = connectionInstance.getAsyncStatus();
            
            if (status && status.running_commands && status.running_commands.length > 0) {
                const commandList = status.running_commands.join(', ');
                asyncThreadManager.statusElement.textContent = 
                    `运行中: ${status.running_commands.length} 个命令 (${commandList})`;
                asyncThreadManager.statusElement.style.color = '#fd7e14';
            } else {
                asyncThreadManager.statusElement.textContent = '无异步命令运行';
                asyncThreadManager.statusElement.style.color = '#28a745';
            }
        } else if (typeof connectionInstance.getRunningAsyncCommands === 'function') {
            // 如果有获取运行中异步命令的方法
            const runningCommands = connectionInstance.getRunningAsyncCommands();
            
            if (runningCommands && runningCommands.length > 0) {
                const commandList = runningCommands.join(', ');
                asyncThreadManager.statusElement.textContent = 
                    `运行中: ${runningCommands.length} 个命令 (${commandList})`;
                asyncThreadManager.statusElement.style.color = '#fd7e14';
            } else {
                asyncThreadManager.statusElement.textContent = '无异步命令运行';
                asyncThreadManager.statusElement.style.color = '#28a745';
            }
        } else {
            // 如果底层不支持异步状态查询，使用本地状态
            const localRunningCommands = Array.from(asyncThreadManager.runningCommands.keys());
            
            if (localRunningCommands.length > 0) {
                const commandList = localRunningCommands.join(', ');
                asyncThreadManager.statusElement.textContent = 
                    `本地跟踪: ${localRunningCommands.length} 个命令 (${commandList})`;
                asyncThreadManager.statusElement.style.color = '#fd7e14';
            } else {
                asyncThreadManager.statusElement.textContent = '无异步命令运行';
                asyncThreadManager.statusElement.style.color = '#28a745';
            }
        }
        
    } catch (error) {
        console.error('刷新异步状态失败:', error);
        asyncThreadManager.statusElement.textContent = `状态获取失败: ${error.message}`;
        asyncThreadManager.statusElement.style.color = '#dc3545';
    }
}

/**
 * 停止所有异步命令
 */
function stopAllAsyncCommands() {
    try {
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            console.error('未找到活跃连接');
            alert('未找到活跃连接');
            return;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            console.error('未找到连接实例');
            alert('未找到连接实例');
            return;
        }

        // 检查是否有异步线程管理功能
        if (typeof connectionInstance.stopAllAsyncCommands === 'function') {
            // 调用底层的停止所有异步命令
            connectionInstance.stopAllAsyncCommands();
            console.log('已调用底层停止所有异步命令');
        } else {
            console.warn('底层不支持停止所有异步命令功能');
        }
        
        // 清理本地状态
        asyncThreadManager.runningCommands.clear();
        
        // 立即刷新状态
        refreshAsyncStatus();
        
        alert('所有异步命令已停止');
        
    } catch (error) {
        console.error('停止所有异步命令失败:', error);
        alert(`停止异步命令失败: ${error.message}`);
    }
}

/**
 * 确保同步执行
 */
function ensureSyncExecution() {
    try {
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            console.error('未找到活跃连接');
            alert('未找到活跃连接');
            return;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            console.error('未找到连接实例');
            alert('未找到连接实例');
            return;
        }

        // 检查是否有异步线程管理功能
        if (typeof connectionInstance.ensureSyncExecution === 'function') {
            // 调用底层的确保同步执行
            const success = connectionInstance.ensureSyncExecution();
            
            if (success) {
                // 清理本地状态
                asyncThreadManager.runningCommands.clear();
                
                // 立即刷新状态
                refreshAsyncStatus();
                
                alert('异步命令已清理，现在可以安全执行同步命令');
            } else {
                alert('清理异步命令失败，同步命令可能出现异常');
            }
        } else {
            // 如果底层不支持，尝试停止所有异步命令
            console.warn('底层不支持确保同步执行功能，尝试停止所有异步命令');
            stopAllAsyncCommands();
        }
        
    } catch (error) {
        console.error('确保同步执行失败:', error);
        alert(`确保同步执行失败: ${error.message}`);
    }
}

/**
 * 停止指定的异步命令
 * @param {string} commandName - 命令名称
 */
function stopAsyncCommand(commandName) {
    try {
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            console.error('未找到活跃连接');
            return false;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            console.error('未找到连接实例');
            return false;
        }

        // 检查是否有异步线程管理功能
        if (typeof connectionInstance.stopAsyncCommand === 'function') {
            // 调用底层的停止指定异步命令
            const success = connectionInstance.stopAsyncCommand(commandName);
            
            if (success) {
                console.log(`异步命令 '${commandName}' 已停止`);
            } else {
                console.warn(`异步命令 '${commandName}' 可能未在运行或停止失败`);
            }
            
            // 从本地状态中移除
            asyncThreadManager.runningCommands.delete(commandName);
            
            // 立即刷新状态
            refreshAsyncStatus();
            
            return success;
        } else {
            console.warn('底层不支持停止指定异步命令功能');
            
            // 只从本地状态中移除
            asyncThreadManager.runningCommands.delete(commandName);
            refreshAsyncStatus();
            
            return true;
        }
        
    } catch (error) {
        console.error(`停止异步命令 '${commandName}' 失败:`, error);
        return false;
    }
}

/**
 * 检查异步命令是否在运行
 * @param {string} commandName - 命令名称
 * @returns {boolean} 是否在运行
 */
function isAsyncCommandRunning(commandName) {
    try {
        // 获取当前连接的通信实例
        const currentConnection = getCurrentActiveConnection();
        if (!currentConnection) {
            return false;
        }

        const connectionInstance = connectionInstances.get(currentConnection.connectionKey);
        if (!connectionInstance) {
            return false;
        }

        // 检查是否有异步线程管理功能
        if (typeof connectionInstance.isAsyncCommandRunning === 'function') {
            // 调用底层的检查异步命令状态
            return connectionInstance.isAsyncCommandRunning(commandName);
        } else {
            // 使用本地状态
            return asyncThreadManager.runningCommands.has(commandName);
        }
        
    } catch (error) {
        console.error(`检查异步命令 '${commandName}' 状态失败:`, error);
        return false;
    }
}

/**
 * 等待异步命令完成
 * @param {string} commandName - 命令名称
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @returns {Promise<boolean>} 是否完成
 */
function waitForAsyncCommand(commandName, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkStatus = () => {
            if (!isAsyncCommandRunning(commandName)) {
                console.log(`异步命令 '${commandName}' 已完成`);
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime >= timeoutMs) {
                console.warn(`等待异步命令 '${commandName}' 完成超时`);
                resolve(false);
                return;
            }
            
            // 继续检查
            setTimeout(checkStatus, 100);
        };
        
        checkStatus();
    });
}

/**
 * 记录异步命令启动
 * @param {string} commandName - 命令名称
 * @param {Object} params - 命令参数
 */
function recordAsyncCommandStart(commandName, params) {
    asyncThreadManager.runningCommands.set(commandName, {
        startTime: Date.now(),
        params: params
    });
    
    console.log(`记录异步命令启动: ${commandName}`);
    refreshAsyncStatus();
}

/**
 * 记录异步命令完成
 * @param {string} commandName - 命令名称
 */
function recordAsyncCommandComplete(commandName) {
    asyncThreadManager.runningCommands.delete(commandName);
    
    console.log(`记录异步命令完成: ${commandName}`);
    refreshAsyncStatus();
}

/**
 * 增强的命令执行函数（支持异步线程管理）
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 */
function executeCommandWithAsyncManagement(commandName, channel) {
    try {
        // 获取命令配置
        const command = commandConfig.commands.find(cmd => cmd.name === commandName);
        if (!command) {
            console.error('未找到命令配置:', commandName);
            return;
        }

        // 检查是否是异步命令（timeout=-1或asyncMode=true）
        const isAsyncCommand = command.timeout === -1 || command.asyncMode === true;
        
        if (isAsyncCommand) {
            // 检查是否已有同名异步命令在运行
            if (isAsyncCommandRunning(commandName)) {
                const shouldStop = confirm(`异步命令 '${commandName}' 已在运行，是否停止旧命令并启动新命令？`);
                if (shouldStop) {
                    stopAsyncCommand(commandName);
                    // 等待一下确保停止完成
                    setTimeout(() => {
                        executeCommand(commandName, channel);
                        recordAsyncCommandStart(commandName, { channel });
                    }, 200);
                }
                return;
            } else {
                // 记录异步命令启动
                recordAsyncCommandStart(commandName, { channel });
            }
        }
        
        // 执行原有的命令执行逻辑
        executeCommand(commandName, channel);
        
    } catch (error) {
        console.error('增强命令执行失败:', error);
        executeCommand(commandName, channel); // 回退到原有逻辑
    }
}

/**
 * 关闭设备控制界面
 */
function closeDeviceControlInterface() {
    // 停止异步状态更新
    stopAsyncStatusUpdate();
    
    // 停止所有异步命令（可选，根据需要决定）
    try {
        if (asyncThreadManager.isEnabled && asyncThreadManager.runningCommands.size > 0) {
            const shouldStopAsync = confirm('检测到有异步命令正在运行，是否在关闭前停止所有异步命令？');
            if (shouldStopAsync) {
                stopAllAsyncCommands();
            }
        }
    } catch (error) {
        console.error('关闭时停止异步命令失败:', error);
    }
    
    // 清理异步管理器状态
    asyncThreadManager.isEnabled = false;
    asyncThreadManager.runningCommands.clear();
    asyncThreadManager.statusElement = null;
    
    if (currentDeviceInterface) {
        document.body.removeChild(currentDeviceInterface);
        currentDeviceInterface = null;
    }

    // 清除当前连接信息
    currentDeviceConnection = null;

    // 显示主界面
    showMainInterface();

    console.log('设备控制界面已关闭，异步线程管理器已清理');
}
/**
 * 生
成状态灯界面
 * @param {Object} statusLight - 状态灯配置
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {string} HTML字符串
 */
function generateStatusLightInterface(statusLight, device, connection) {
    // 获取隐藏列配置
    const hiddenColumns = statusLight.hiddenColumns || [];

    let html = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <!-- 左侧设备信息区域 -->
            <div style="position: relative; width: 200px; height: 300px; margin-right: 10px;">
                <div style="background-image: url('${deviceImageMap[device.name] || '3.png'}'); width: 100%; height: 150px; background-size: contain; background-color: #efefef; background-position: center center; background-repeat: no-repeat; margin: 0px auto; border: 1px solid #ccc;"></div>
                <button style="position: absolute; right: 0%; top: 4%; background-image: url('-.png'); width: 18.86%; height: 2.17vh; background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #efefef; border: 0px solid #000; cursor: pointer;" onclick="closeDeviceControlInterface()"></button>
                <div style="margin-top: 3%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Model: ${device.name}</div>
                <div style="margin-top: 0%; text-align: left; font-size: 0.8vw; background-color: #efefef;">Product Number: <input type="text" value="2024010978" style="width: 50%; text-align: left; border: 1px solid #efefef; font-size: 0.8vw; background-color: #efefef;"></div>
            </div>
            
            <!-- 右侧状态灯控制表格区域 -->
            <div style="flex: 1;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="background-color: #e9ecef; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;

    // 添加ADDRESS列标题（如果未隐藏）
    if (!hiddenColumns.includes('ADDRESS')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">ADDRESS</th>`;
    }

    // 添加CHANNEL列标题（如果未隐藏）
    if (!hiddenColumns.includes('CHANNEL')) {
        html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>`;
    }

    // 添加状态控制列标题
    html += `<th style="background-color: #6c9bd1; color: white; padding: 12px; font-weight: bold; text-align: center;">伺服状态</th>`;

    html += `</tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        const rowBgColor = channel % 2 === 0 ? '#f8f9fa' : 'white';
        html += `<tr style="background-color: ${rowBgColor};">`;

        // 通道号
        html += `<td style="padding: 12px; text-align: center; background-color: #6c9bd1; color: white; font-weight: bold;">Channel${channel}</td>`;

        // ADDRESS（自动填充，如果未隐藏）
        if (!hiddenColumns.includes('ADDRESS')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${connection.deviceAddress}</td>`;
        }

        // CHANNEL（自动填充，如果未隐藏）
        if (!hiddenColumns.includes('CHANNEL')) {
            html += `<td style="padding: 12px; text-align: center; font-weight: bold;">${channel}</td>`;
        }

        // 状态切换按钮组
        html += `<td style="padding: 8px; text-align: center;">`;
        html += `<div style="display: inline-flex; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;

        statusLight.buttons.forEach((button, index) => {
            const isFirst = index === 0;
            const isLast = index === statusLight.buttons.length - 1;
            const borderRadius = isFirst ? '4px 0 0 4px' : (isLast ? '0 4px 4px 0' : '0');

            html += `<button 
                id="statusBtn_${statusLight.name}_${channel}_${button.value}"
                onclick="executeToggleStatusCommand('${statusLight.setCommand}', ${channel}, '${button.value}', '${statusLight.name}')" 
                style="
                    background-color: ${button.inactiveColor}; 
                    color: #6c757d; 
                    border: none; 
                    padding: 8px 20px; 
                    cursor: pointer; 
                    font-weight: bold; 
                    transition: all 0.2s ease;
                    border-radius: ${borderRadius};
                    border-right: ${isLast ? 'none' : '1px solid #dee2e6'};
                    min-width: 50px;
                    font-size: 16px;
                ">${button.displayName}</button>`;
        });

        html += `</div></td>`;

        html += `</tr>`;
    }

    html += `</tbody></table>
            </div>
        </div>`;

    return html;
}

/**
 * 执行状态灯设置命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} value - 设置值（C或O）
 * @param {string} lightName - 状态灯名称
 */
function executeStatusLightCommand(commandName, channel, value, lightName) {
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else if (param.name === 'SERVOSTATUS') {
                paramValue = value;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`执行状态灯命令: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理执行结果
        handleStatusLightResult(command, channel, result, value, lightName);

    } catch (error) {
        console.error('执行状态灯命令失败:', error);
    }
}

/**
 * 读取状态灯状态命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} lightName - 状态灯名称
 */
function readStatusLightCommand(commandName, channel, lightName) {
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`读取状态灯状态: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理读取结果
        handleStatusLightReadResult(command, channel, result, lightName);

    } catch (error) {
        console.error('读取状态灯状态失败:', error);
    }
}

/**
 * 处理状态灯设置命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} setValue - 设置的值
 * @param {string} lightName - 状态灯名称
 */
function handleStatusLightResult(command, channel, result, setValue, lightName) {
    if (result.error) {
        console.error(`状态灯命令执行失败: ${result.error}`);
        return;
    }

    console.log(`状态灯命令 ${command.name} 执行成功:`, result);

    // 获取状态灯配置
    const statusLight = deviceConfig.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 更新状态灯颜色
    const lightElement = document.getElementById(`statusLight_${lightName}_${channel}`);
    if (lightElement) {
        const color = statusLight.statusColors[setValue] || statusLight.statusColors.default;
        lightElement.style.backgroundColor = color;
        lightElement.style.boxShadow = `0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.2)`;
    }
}

/**
 * 处理状态灯读取命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} lightName - 状态灯名称
 */
function handleStatusLightReadResult(command, channel, result, lightName) {
    if (result.error) {
        console.error(`状态灯读取失败: ${result.error}`);
        return;
    }

    console.log(`状态灯读取 ${command.name} 成功:`, result);

    // 获取状态灯配置
    const statusLight = deviceConfig.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 从结果中获取状态值
    let statusValue = null;
    if (result && typeof result === 'object' && !result.error && !result.data) {
        // 直接从result对象中获取SERVOSTATUS
        statusValue = result.SERVOSTATUS;
    } else if (result.data && Array.isArray(result.data)) {
        // 从数组中获取状态值（通常在位置1）
        statusValue = result.data[1];
    } else if (result.data && typeof result.data === 'object') {
        // 从对象中获取状态值
        statusValue = result.data.SERVOSTATUS;
    }

    // 更新状态灯颜色
    if (statusValue) {
        const lightElement = document.getElementById(`statusLight_${lightName}_${channel}`);
        if (lightElement) {
            const color = statusLight.statusColors[statusValue] || statusLight.statusColors.default;
            lightElement.style.backgroundColor = color;
            lightElement.style.boxShadow = `0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.2)`;

            console.log(`状态灯 Channel${channel} 状态更新为: ${statusValue}, 颜色: ${color}`);
        }
    }
}

/**
 * 执行切换状态命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} value - 设置值（C或O）
 * @param {string} lightName - 状态灯名称
 */
function executeToggleStatusCommand(commandName, channel, value, lightName) {
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else if (param.name === 'SERVOSTATUS') {
                paramValue = value;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`执行切换状态命令: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理执行结果
        handleToggleStatusResult(command, channel, result, value, lightName);

    } catch (error) {
        console.error('执行切换状态命令失败:', error);
    }
}

/**
 * 读取切换状态命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} lightName - 状态灯名称
 */
function readToggleStatusCommand(commandName, channel, lightName) {
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`读取切换状态: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理读取结果
        handleToggleStatusReadResult(command, channel, result, lightName);

    } catch (error) {
        console.error('读取切换状态失败:', error);
    }
}

/**
 * 处理切换状态设置命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} setValue - 设置的值
 * @param {string} lightName - 状态灯名称
 */
function handleToggleStatusResult(command, channel, result, setValue, lightName) {
    if (result.error) {
        console.error(`切换状态命令执行失败: ${result.error}`);
        return;
    }

    console.log(`切换状态命令 ${command.name} 执行成功:`, result);

    // 获取状态灯配置
    const statusLight = deviceConfig.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 设置命令成功后，自动执行读取命令来更新按钮状态
    setTimeout(() => {
        autoReadToggleStatus(statusLight.getCommand, channel, lightName);
    }, 100); // 延迟100ms确保设置命令完全执行
}

/**
 * 自动读取切换状态
 * @param {string} commandName - 读取命令名称
 * @param {number} channel - 通道号
 * @param {string} lightName - 状态灯名称
 */
function autoReadToggleStatus(commandName, channel, lightName) {
    try {
        // 获取命令配置
        const command = commandConfig.commands.find(cmd => cmd.name === commandName);
        if (!command) {
            console.error('未找到读取命令配置:', commandName);
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`自动读取切换状态: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理读取结果
        handleToggleStatusReadResult(command, channel, result, lightName);

    } catch (error) {
        console.error('自动读取切换状态失败:', error);
    }
}

/**
 * 处理切换状态读取命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} lightName - 状态灯名称
 */
function handleToggleStatusReadResult(command, channel, result, lightName) {
    if (result.error) {
        console.error(`切换状态读取失败: ${result.error}`);
        return;
    }

    console.log(`切换状态读取 ${command.name} 成功:`, result);

    // 获取状态灯配置
    const statusLight = deviceConfig.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 从结果中获取状态值
    let statusValue = null;
    if (result && typeof result === 'object' && !result.error && !result.data) {
        // 直接从result对象中获取SERVOSTATUS
        statusValue = result.SERVOSTATUS;
    } else if (result.data && Array.isArray(result.data)) {
        // 从数组中获取状态值（通常在位置1）
        statusValue = result.data[1];
    } else if (result.data && typeof result.data === 'object') {
        // 从对象中获取状态值
        statusValue = result.data.SERVOSTATUS;
    }

    // 更新按钮状态
    if (statusValue) {
        updateToggleButtonsState(statusLight, channel, statusValue);
        console.log(`切换按钮 Channel${channel} 状态更新为: ${statusValue}`);
    }
}

/**
 * 更新切换按钮状态
 * @param {Object} statusLight - 状态灯配置
 * @param {number} channel - 通道号
 * @param {string} activeValue - 激活的值
 */
function updateToggleButtonsState(statusLight, channel, activeValue) {
    statusLight.buttons.forEach(button => {
        const btnElement = document.getElementById(`statusBtn_${statusLight.name}_${channel}_${button.value}`);
        if (btnElement) {
            if (button.value === activeValue) {
                // 激活状态
                btnElement.style.backgroundColor = button.activeColor;
                btnElement.style.color = button.textColor;
                btnElement.style.fontWeight = 'bold';
                btnElement.style.boxShadow = '0 2px 8px rgba(108, 155, 209, 0.3)';
            } else {
                // 非激活状态
                btnElement.style.backgroundColor = button.inactiveColor;
                btnElement.style.color = '#6c757d';
                btnElement.style.fontWeight = 'normal';
                btnElement.style.boxShadow = 'none';
            }
        }
    });
}// 
// 将关键函数暴露到全局作用域，供HTML onclick事件使用
window.openDeviceControlInterface = openDeviceControlInterface;
window.closeDeviceControlInterface = closeDeviceControlInterface;
window.executeCommand = executeCommand;
window.executeCombinedCommand = executeCombinedCommand;
window.executeToggleStatusCommand = executeToggleStatusCommand;
window.readToggleStatusCommand = readToggleStatusCommand;
window.executeCombinedToggleStatusCommand = executeCombinedToggleStatusCommand;
window.highlightRelatedFields = highlightRelatedFields;
window.highlightCombinedRelatedFields = highlightCombinedRelatedFields;

// 暴露异步线程管理函数
window.stopAllAsyncCommands = stopAllAsyncCommands;
window.refreshAsyncStatus = refreshAsyncStatus;
window.ensureSyncExecution = ensureSyncExecution;
window.stopAsyncCommand = stopAsyncCommand;
window.isAsyncCommandRunning = isAsyncCommandRunning;
window.waitForAsyncCommand = waitForAsyncCommand;/*
*
 * 执行组合选项卡中的切换状态命令
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} value - 设置值（C或O）
 * @param {string} lightName - 状态灯名称
 * @param {string} tabName - 选项卡名称
 */
function executeCombinedToggleStatusCommand(commandName, channel, value, lightName, tabName) {
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

        // 构建参数数组 - 通用逻辑，不写死参数名
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else if (param.allowvalue && param.allowvalue.includes(value)) {
                // 如果参数有allowvalue配置且包含当前value，则使用value
                // 这样可以处理SERVOSTATUS、ADMODE等所有状态参数
                paramValue = value;
            } else {
                // 否则使用默认值
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`执行组合切换状态命令: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理执行结果
        handleCombinedToggleStatusResult(command, channel, result, value, lightName, tabName);

    } catch (error) {
        console.error('执行组合切换状态命令失败:', error);
    }
}

/**
 * 处理组合选项卡中的切换状态设置命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} setValue - 设置的值
 * @param {string} lightName - 状态灯名称
 * @param {string} tabName - 选项卡名称
 */
function handleCombinedToggleStatusResult(command, channel, result, setValue, lightName, tabName) {
    if (result.error) {
        console.error(`组合切换状态命令执行失败: ${result.error}`);
        return;
    }

    console.log(`组合切换状态命令 ${command.name} 执行成功:`, result);

    // 获取组合选项卡配置
    const combinedTab = deviceConfig.combinedTabs?.find(tab => tab.name === tabName);
    if (!combinedTab) return;

    // 获取状态灯配置
    const statusLight = combinedTab.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 设置命令成功后，自动执行读取命令来更新按钮状态
    setTimeout(() => {
        autoCombinedReadToggleStatus(statusLight.getCommand, channel, lightName, tabName);
    }, 100); // 延迟100ms确保设置命令完全执行
}

/**
 * 自动读取组合选项卡中的切换状态
 * @param {string} commandName - 读取命令名称
 * @param {number} channel - 通道号
 * @param {string} lightName - 状态灯名称
 * @param {string} tabName - 选项卡名称
 */
function autoCombinedReadToggleStatus(commandName, channel, lightName, tabName) {
    try {
        // 获取命令配置
        const command = commandConfig.commands.find(cmd => cmd.name === commandName);
        if (!command) {
            console.error('未找到读取命令配置:', commandName);
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

        // 构建参数数组
        const params = [];
        command.params.forEach(param => {
            let paramValue;
            if (param.name === 'ADDRESS') {
                paramValue = parseInt(currentConnection.deviceAddress);
            } else if (param.name === 'CHANNEL') {
                paramValue = channel;
            } else {
                paramValue = param.type === 'int' ? 0 : (param.type === 'float' ? 0.0 : '');
            }
            params.push(paramValue);
        });

        console.log(`自动读取组合切换状态: ${commandName}(${params.join(', ')})`);

        // 调用真实的executeCommandJSON函数
        const result = connectionInstance.executeCommandJSON(commandName, params);

        // 处理读取结果
        handleCombinedToggleStatusReadResult(command, channel, result, lightName, tabName);

    } catch (error) {
        console.error('自动读取组合切换状态失败:', error);
    }
}

/**
 * 处理组合选项卡中的切换状态读取命令结果
 * @param {Object} command - 命令配置
 * @param {number} channel - 通道号
 * @param {Object} result - 执行结果
 * @param {string} lightName - 状态灯名称
 * @param {string} tabName - 选项卡名称
 */
function handleCombinedToggleStatusReadResult(command, channel, result, lightName, tabName) {
    if (result.error) {
        console.error(`组合切换状态读取失败: ${result.error}`);
        return;
    }

    console.log(`组合切换状态读取 ${command.name} 成功:`, result);

    // 获取组合选项卡配置
    const combinedTab = deviceConfig.combinedTabs?.find(tab => tab.name === tabName);
    if (!combinedTab) return;

    // 获取状态灯配置
    const statusLight = combinedTab.statusLights?.find(light => light.name === lightName);
    if (!statusLight) return;

    // 从结果中获取状态值 - 通用逻辑，根据allowValues动态提取
    let statusValue = null;

    // 方法1: 直接在返回结果中查找匹配allowValues的值
    if (result && typeof result === 'object' && !result.error && !result.data) {
        // 在result对象中查找匹配allowValues的值
        for (const [key, value] of Object.entries(result)) {
            if (statusLight.allowValues.includes(value)) {
                statusValue = value;
                console.log(`从result.${key}中提取状态值: ${value}`);
                break;
            }
        }
    } else if (result.data && typeof result.data === 'object') {
        // 在result.data对象中查找匹配allowValues的值
        for (const [key, value] of Object.entries(result.data)) {
            if (statusLight.allowValues.includes(value)) {
                statusValue = value;
                console.log(`从result.data.${key}中提取状态值: ${value}`);
                break;
            }
        }
    } else if (result.data && Array.isArray(result.data)) {
        // 从数组中查找匹配allowValues的值
        for (let i = 0; i < result.data.length; i++) {
            if (statusLight.allowValues.includes(result.data[i])) {
                statusValue = result.data[i];
                console.log(`从result.data[${i}]中提取状态值: ${statusValue}`);
                break;
            }
        }
    }

    // 更新按钮状态
    if (statusValue) {
        updateCombinedToggleButtonsState(statusLight, channel, statusValue);
        console.log(`组合切换按钮 Channel${channel} 状态更新为: ${statusValue}`);
    } else {
        console.warn(`未能从返回结果中提取有效的状态值，allowValues: ${statusLight.allowValues}, result:`, result);
    }
}

/**
 * 更新组合选项卡中的切换按钮状态
 * @param {Object} statusLight - 状态灯配置
 * @param {number} channel - 通道号
 * @param {string} activeValue - 激活的值
 */
function updateCombinedToggleButtonsState(statusLight, channel, activeValue) {
    statusLight.buttons.forEach(button => {
        const btnElement = document.getElementById(`statusBtn_${statusLight.name}_${channel}_${button.value}`);
        if (btnElement) {
            if (button.value === activeValue) {
                // 激活状态
                btnElement.style.backgroundColor = button.activeColor;
                btnElement.style.color = button.textColor;
                btnElement.style.fontWeight = 'bold';
                btnElement.style.boxShadow = '0 2px 8px rgba(108, 155, 209, 0.3)';
            } else {
                // 非激活状态
                btnElement.style.backgroundColor = button.inactiveColor;
                btnElement.style.color = '#6c757d';
                btnElement.style.fontWeight = 'normal';
                btnElement.style.boxShadow = 'none';
            }
        }
    });
}/**

 * 高亮显示相关字段（普通选项卡）
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {boolean} highlight - 是否高亮
 */
function highlightRelatedFields(commandName, channel, highlight) {
    // 获取命令配置
    const command = commandConfig.commands.find(cmd => cmd.name === commandName);
    if (!command) return;

    // 高亮输入字段
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
            const fieldId = `${commandName}_${param.name}_${channel}`;
            const field = document.getElementById(fieldId);
            if (field) {
                if (highlight) {
                    field.style.transform = 'scale(1.05)';
                    field.style.boxShadow = '0 4px 12px rgba(108, 155, 209, 0.4)';
                    field.style.borderBottomColor = '#4a90e2';
                    field.style.transition = 'all 0.3s ease';
                    field.style.zIndex = '10';
                } else {
                    field.style.transform = 'scale(1)';
                    field.style.boxShadow = 'none';
                    field.style.borderBottomColor = '#6c9bd1';
                    field.style.zIndex = '1';
                }
            }
        }
    });

    // 高亮输出字段
    command.returns.forEach(ret => {
        const fieldId = `${commandName}_${ret.name}_output_${channel}`;
        const field = document.getElementById(fieldId);
        if (field) {
            if (highlight) {
                field.style.transform = 'scale(1.05)';
                field.style.boxShadow = '0 4px 12px rgba(108, 155, 209, 0.4)';
                field.style.borderBottomColor = '#4a90e2';
                field.style.transition = 'all 0.3s ease';
                field.style.zIndex = '10';
            } else {
                field.style.transform = 'scale(1)';
                field.style.boxShadow = 'none';
                field.style.borderBottomColor = '#6c9bd1';
                field.style.zIndex = '1';
            }
        }
    });
}

/**
 * 高亮显示相关字段（组合选项卡）
 * @param {string} commandName - 命令名称
 * @param {number} channel - 通道号
 * @param {string} tabName - 选项卡名称
 * @param {boolean} highlight - 是否高亮
 */
function highlightCombinedRelatedFields(commandName, channel, tabName, highlight) {
    // 获取命令配置
    const command = commandConfig.commands.find(cmd => cmd.name === commandName);
    if (!command) return;

    // 高亮输入字段
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
            const fieldId = `${tabName}_${param.name}_${channel}`;
            const field = document.getElementById(fieldId);
            if (field) {
                if (highlight) {
                    field.style.transform = 'scale(1.05)';
                    field.style.boxShadow = '0 4px 12px rgba(108, 155, 209, 0.4)';
                    field.style.borderBottomColor = '#4a90e2';
                    field.style.transition = 'all 0.3s ease';
                    field.style.zIndex = '10';
                    field.style.position = 'relative';
                } else {
                    field.style.transform = 'scale(1)';
                    field.style.boxShadow = 'none';
                    field.style.borderBottomColor = '#6c9bd1';
                    field.style.zIndex = '1';
                    field.style.position = 'static';
                }
            }
        }
    });

    // 高亮输出字段
    command.returns.forEach(ret => {
        const fieldId = `${tabName}_${ret.name}_output_${channel}`;
        const field = document.getElementById(fieldId);
        if (field) {
            if (highlight) {
                field.style.transform = 'scale(1.05)';
                field.style.boxShadow = '0 4px 12px rgba(108, 155, 209, 0.4)';
                field.style.borderBottomColor = '#4a90e2';
                field.style.transition = 'all 0.3s ease';
                field.style.zIndex = '10';
                field.style.position = 'relative';
            } else {
                field.style.transform = 'scale(1)';
                field.style.boxShadow = 'none';
                field.style.borderBottomColor = '#6c9bd1';
                field.style.zIndex = '1';
                field.style.position = 'static';
            }
        }
    });
}