/**
 * 回调功能演示示例
 * 展示如何使用持续监听模式的回调功能
 */

const { COM } = require('./core-koffi');

async function main() {
    // 数据回调函数
    function dataCallback(data) {
        console.log(`收到实时数据: ${JSON.stringify(data)}`);
    }

    // 创建COM通信对象
    const com = new COM("COM9", 1382400, 8, 1, "none");
    com.selectProtocol(1);

    try {
        // 注释掉的方式1和方式2演示（对应Python中注释的部分）
        /*
        // === 方式1: 使用回调函数的持续监听模式 ===
        console.log("=== 方式1: 使用回调函数的持续监听模式 ===");
        
        // 设置数据回调函数
        com.setDataCallback(dataCallback);

        // 执行持续监听命令（timeout=-1的命令）
        const result = com.getxChannelVoltageTms(1, 1, 1000);  // 假设这个命令配置了timeout=-1
        // console.log(`命令执行结果: ${JSON.stringify(result)}`);
        console.log(result['VOLTAGE']);

        // 等待一段时间接收数据
        await sleep(1000);
        const result1 = com.stopAllVoltage_RangeTms(1);
        console.log(result1);
        
        // 停止持续监听
        com.stopContinuousListening();

        // === 方式2: 使用队列获取实时数据 ===
        console.log("\n=== 方式2: 使用队列获取实时数据 ===");
        
        // 不设置回调，使用队列方式
        const result2 = com.getxChannelVoltageTmsAsync(1, 1, 1000);
        console.log(`命令执行结果: ${JSON.stringify(result2)}`);

        // 从队列获取数据
        for (let i = 0; i < 5; i++) {  // 获取5个数据包
            const data = await com.getRealtimeData(1000);  // 1秒超时
            if (data) {
                console.log(`队列数据 ${i + 1}: ${JSON.stringify(data)}`);
            } else {
                console.log(`第 ${i + 1} 次获取数据超时`);
            }
        }
        
        const result3 = com.stopAllVoltage_RangeTms(1);
        console.log(result3);
        */

        // === 方式3: 一体化启动持续监听 ===
        console.log("\n=== 方式3: 一体化启动持续监听 ===");

        // 使用便捷方法启动持续监听
        const result = com.startContinuousListening(
            "getxChannelVoltageTms",
            [1, 1, 0],
            (data) => console.log(`一体化回调: ${JSON.stringify(data)}`)
        );
        console.log(`一体化启动结果: ${JSON.stringify(result)}`);

        // 等待数据
        await sleep(200);  // 2秒
        const result1 = com.stopAllVoltage_RangeTms(1);
        console.log(result1);

        await sleep(20000);  // 20秒

    } catch (error) {
        console.error(`演示过程中发生错误: ${error.message}`);
    } finally {
        // 关闭通信
        com.close();
        console.log("通信已关闭");
    }
}

// 辅助函数：睡眠
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行演示
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };