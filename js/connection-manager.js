/**
 * 连接管理功能
 */

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

        // 更新按钮状态
        button.style.backgroundColor = '#28a745'; // 绿色表示已连接
        button.textContent = 'Connected';

        // 更新同行的断开按钮状态
        const disconnectBtn = button.parentElement.querySelector('button:last-child');
        if (disconnectBtn) {
            disconnectBtn.style.backgroundColor = '#c80025';
            disconnectBtn.style.cursor = 'pointer';
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

    } catch (error) {
        console.error(`断开连接失败: ${error.message}`);
    }
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