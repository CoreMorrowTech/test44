/**
 * 连接管理功能
 */

// 存储所有活跃连接的信息
let activeConnections = new Map();

/**
 * 连接设备函数
 * @param {string} deviceId - 设备ID
 * @param {string} connectionType - 连接类型 (RS-232, RS-422, USB-VCP, LAN-UDP)
 * @param {string} connectionInfo - 连接信息字符串
 * @param {HTMLElement} button - 连接按钮元素
 */
function connectDevice(deviceId, connectionType, connectionInfo, button) {
    try {
        const connectionKey = `${deviceId}-${connectionType}`;

        // 如果已经连接，先断开
        if (connectionInstances.has(connectionKey)) {
            disconnectDevice(deviceId, connectionType, button);
        }

        let connection = null;

        if (connectionType === 'LAN-UDP') {
            // 解析UDP连接信息
            const udpInfo = parseUDPInfo(connectionInfo);
            if (!udpInfo) {
                throw new Error('UDP连接信息格式错误');
            }

            connection = new UDP(
                udpInfo.targetIP,
                udpInfo.targetPort,
                udpInfo.localIP,
                udpInfo.localPort
            );

            console.log(`✓ UDP连接成功: ${udpInfo.localIP}:${udpInfo.localPort} -> ${udpInfo.targetIP}:${udpInfo.targetPort}`);

        } else {
            // 串口连接 (RS-232, RS-422, USB-VCP)
            const comInfo = parseCOMInfo(connectionInfo);
            if (!comInfo) {
                throw new Error('串口连接信息格式错误');
            }

            connection = new COM(
                comInfo.port,
                comInfo.baudrate,
                comInfo.dataBits,
                comInfo.stopBits,
                comInfo.parity
            );

            console.log(`✓ 串口连接成功: ${comInfo.port}, ${comInfo.baudrate}bps`);
        }

        // 存储连接实例
        connectionInstances.set(connectionKey, connection);

        // 获取设备名称和地址信息
        const deviceElement = document.getElementById(deviceId);
        let deviceName = 'Device Model 1'; // 默认设备名称
        let deviceAddress = '8'; // 默认地址
        
        if (deviceElement) {
            try {
                // 方法1: 查找设备型号信息 - 查找只包含"Product Model: xxx"的div
                const modelDivs = deviceElement.querySelectorAll('div');
                for (let div of modelDivs) {
                    const text = div.textContent?.trim() || '';
                    // 精确匹配只包含Product Model信息的div
                    const modelMatch = text.match(/^Product Model:\s*(.+)$/);
                    if (modelMatch && !text.includes('Product Number') && !text.includes('Device Address')) {
                        deviceName = modelMatch[1].trim();
                        break;
                    }
                }
                
                // 方法2: 查找设备地址 - 查找Device Address对应的input
                const addressInputs = deviceElement.querySelectorAll('input');
                for (let input of addressInputs) {
                    const parentText = input.parentElement?.textContent || '';
                    if (parentText.includes('Device Address:') && input.value) {
                        deviceAddress = input.value.trim();
                        break;
                    }
                }
                
                console.log(`提取的设备信息: 名称="${deviceName}", 地址="${deviceAddress}"`);
                
            } catch (error) {
                console.warn('提取设备信息时出错，使用默认值:', error);
                // 使用默认值
                deviceName = 'Device Model 1';
                deviceAddress = '8';
            }
        }

        // 存储活跃连接信息
        activeConnections.set(connectionKey, {
            deviceId: deviceId,
            connectionType: connectionType,
            connectionInfo: connectionInfo,
            connectionKey: connectionKey,
            button: button,
            deviceName: deviceName,
            deviceAddress: deviceAddress
        });

        // 更新按钮状态
        button.style.backgroundColor = '#28a745'; // 绿色表示已连接
        button.textContent = 'Connected';

        // 更新同行的断开按钮状态
        const disconnectBtn = button.parentElement.querySelector('button:last-child');
        if (disconnectBtn) {
            disconnectBtn.style.backgroundColor = '#c80025';
            disconnectBtn.style.cursor = 'pointer';
        }

        // 更新Connection菜单显示所有连接
        if (typeof updateConnectionMenu === 'function') {
            updateConnectionMenu();
        }

        console.log(`设备 ${deviceId} 通过 ${connectionType} 连接成功`);

    } catch (error) {
        console.error(`连接失败: ${error.message}`);
        // 不使用弹窗，直接在控制台显示错误
        console.log(`连接失败: ${error.message}`);
    }
}

/**
 * 断开设备连接函数
 * @param {string} deviceId - 设备ID
 * @param {string} connectionType - 连接类型
 * @param {HTMLElement} button - 断开按钮元素
 */
function disconnectDevice(deviceId, connectionType, button) {
    try {
        const connectionKey = `${deviceId}-${connectionType}`;
        const connection = connectionInstances.get(connectionKey);

        if (connection) {
            // 关闭连接
            connection.close();
            connectionInstances.delete(connectionKey);

            console.log(`设备 ${deviceId} 的 ${connectionType} 连接已断开`);
        }

        // 更新按钮状态
        button.style.backgroundColor = '#ccc';
        button.style.cursor = 'default';

        // 更新同行的连接按钮状态
        const connectBtn = button.parentElement.querySelector('button:nth-child(3)');
        if (connectBtn) {
            connectBtn.style.backgroundColor = '#c80025';
            connectBtn.textContent = 'Connect';
        }

        // 从活跃连接中移除该连接
        if (activeConnections.has(connectionKey)) {
            activeConnections.delete(connectionKey);
            console.log(`已从活跃连接中移除: ${connectionKey}`);
            
            // 更新Connection菜单
            if (typeof updateConnectionMenu === 'function') {
                updateConnectionMenu();
            }
        }

    } catch (error) {
        console.error(`断开连接失败: ${error.message}`);
    }
}

/**
 * 断开指定连接（从Connection菜单调用）
 * @param {string} connectionKey - 连接键值
 */
function disconnectSpecificConnection(connectionKey) {
    const connection = activeConnections.get(connectionKey);
    if (connection) {
        const { deviceId, connectionType, button } = connection;
        
        // 找到对应的断开按钮
        const disconnectBtn = button.parentElement.querySelector('button:last-child');
        if (disconnectBtn) {
            disconnectDevice(deviceId, connectionType, disconnectBtn);
        } else {
            // 如果找不到断开按钮，直接调用断开逻辑
            disconnectDevice(deviceId, connectionType, button);
        }
    }
}

/**
 * 断开所有活跃连接
 */
function disconnectAllConnections() {
    const connections = Array.from(activeConnections.values());
    connections.forEach(connection => {
        disconnectSpecificConnection(connection.connectionKey);
    });
}

/**
 * 修改连接信息函数
 * @param {HTMLElement} inputField - 输入框元素
 */
function modifyConnection(inputField) {
    // 使输入框可编辑
    inputField.focus();
    inputField.select();
}