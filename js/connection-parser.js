/**
 * 连接信息解析功能
 */

/**
 * 解析串口连接信息
 * @param {string} connectionInfo - 连接信息字符串
 * @returns {Object|null} 解析后的连接参数
 */
function parseCOMInfo(connectionInfo) {
    try {
        const parts = connectionInfo.split(' ');
        const port = parts[0]; // COM1, COM2, etc.
        const baudrate = parseInt(parts[1].replace('dps', '')); // 115200dps -> 115200
        const dataBits = parseInt(parts[2]); // 8 data bits -> 8
        const stopBits = parseFloat(parts[4]); // 1 stop bit -> 1
        const parity = parts[6] === 'No' ? 'none' : parts[6].toLowerCase(); // No parity -> none

        return {
            port,
            baudrate,
            dataBits,
            stopBits,
            parity
        };
    } catch (error) {
        console.error('解析串口信息失败:', error);
        return null;
    }
}

/**
 * 解析UDP连接信息
 * @param {string} connectionInfo - 连接信息字符串
 * @returns {Object|null} 解析后的连接参数
 */
function parseUDPInfo(connectionInfo) {
    try {
        // 示例: "UDP, Local IP: 192.168.0.100:7010 UDP, Target IP: 192.168.0.101:7010"
        const localMatch = connectionInfo.match(/Local IP:\s*(\d+\.\d+\.\d+\.\d+):(\d+)/);
        const targetMatch = connectionInfo.match(/Target IP:\s*(\d+\.\d+\.\d+\.\d+):(\d+)/);

        if (!localMatch || !targetMatch) {
            throw new Error('UDP信息格式不正确');
        }

        return {
            localIP: localMatch[1],
            localPort: parseInt(localMatch[2]),
            targetIP: targetMatch[1],
            targetPort: parseInt(targetMatch[2])
        };
    } catch (error) {
        console.error('解析UDP信息失败:', error);
        return null;
    }
}