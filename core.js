/**
 * 通信封装核心模块
 * 直接使用 app.cpp 导出的 ExecuteCommandJSON 方法
 */

const ffi = require('ffi-napi');
const ref = require('ref-napi');
const path = require('path');
const fs = require('fs');

// 获取 DLL 路径的辅助函数
function getDllPath() {
    const possiblePaths = [
        path.join(__dirname, '../DLL/app.dll'),
        path.join(__dirname, '../x64/Release/app.dll'),
        path.join(__dirname, '../x64/Debug/app.dll'),
        'E:\\C++\\NewDll\\DLL\\x64\\Debug\\3App.dll'
    ];
    
    for (const dllPath of possiblePaths) {
        if (fs.existsSync(dllPath)) {
            return dllPath;
        }
    }
    return null;
}

// 获取配置文件路径的辅助函数
function getConfigPath() {
    const possiblePaths = [
        path.join(__dirname, '../config.json'),
        path.join(__dirname, 'config.json'),
        'E:\\C++\\NewDll\\DLL\\x64\\Debug\\config.json'
    ];
    
    for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
            return configPath;
        }
    }
    return null;
}

/**
 * 通信基类
 */
class CommunicationBase {
    constructor(dllPath = null, configPath = null) {
        this.dllPath = dllPath || getDllPath();
        this.configPath = configPath || getConfigPath();
        this.dll = null;
        this.obj = null;
        this._setupDll();
        this._createCommunicationObject();
    }

    /**
     * 设置 DLL 函数
     */
    _setupDll() {
        try {
            if (!this.dllPath || !fs.existsSync(this.dllPath)) {
                throw new Error(`DLL 文件未找到: ${this.dllPath}`);
            }

            // 加载 DLL
            this.dll = ffi.Library(this.dllPath, {
                'CreateCommunicationObject': ['pointer', []],
                'DestroyCommunicationObject': ['void', ['pointer']],
                'CallInitUDP': ['int', ['pointer', 'string', 'int', 'string', 'int']],
                'CallInitCOM': ['int', ['pointer', 'string', 'int', 'int', 'float', 'string']],
                'CallSelectProtocol': ['void', ['pointer', 'int']],
                'CallExecuteCommandJSON': ['string', ['pointer', 'string']]
            });

            console.log(`✓ DLL 加载成功: ${this.dllPath}`);
        } catch (error) {
            throw new Error(`DLL 设置失败: ${error.message}`);
        }
    }

    /**
     * 创建通信对象
     */
    _createCommunicationObject() {
        this.obj = this.dll.CreateCommunicationObject();
        if (!this.obj || this.obj.isNull()) {
            throw new Error('创建通信对象失败');
        }
    }

    /**
     * 选择协议版本
     */
    selectProtocol(protocolVersion) {
        try {
            this.dll.CallSelectProtocol(this.obj, protocolVersion);
            return true;
        } catch (error) {
            console.log(`协议选择失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 执行 JSON 命令 - 直接调用 app.cpp 导出的方法
     * 
     * @param {string} cmdName - 命令名称
     * @param {Array} params - 参数列表，默认为空数组
     * @param {boolean} silent - 是否静默执行（不打印日志）
     * @returns {Object} 命令执行结果
     */
    executeCommandJSON(cmdName, params = [], silent = false) {
        try {
            const jsonCmd = {
                cmdName: cmdName,
                params: params
            };
            const jsonStr = JSON.stringify(jsonCmd);

            if (!silent) {
                console.log(`执行命令: ${cmdName}, 参数: ${JSON.stringify(params)}`);
            }

            const resultStr = this.dll.CallExecuteCommandJSON(this.obj, jsonStr);
            if (resultStr) {
                const result = JSON.parse(resultStr);
                if (!silent) {
                    console.log(`命令执行成功: ${JSON.stringify(result)}`);
                }
                return result;
            } else {
                const errorMsg = `命令 ${cmdName} 执行失败，返回空结果`;
                if (!silent) {
                    console.log(`错误: ${errorMsg}`);
                }
                return { error: errorMsg };
            }
        } catch (error) {
            const errorMsg = `命令 ${cmdName} 执行异常: ${error.message}`;
            if (!silent) {
                console.log(`错误: ${errorMsg}`);
            }
            return { error: errorMsg };
        }
    }

    /**
     * 关闭通信
     */
    close() {
        if (this.obj && !this.obj.isNull()) {
            this.dll.DestroyCommunicationObject(this.obj);
            this.obj = null;
        }
    }

    /**
     * 析构函数
     */
    destroy() {
        this.close();
    }
}

/**
 * 为 CommunicationBase 添加动态方法调用支持
 */
function addDynamicMethods(instance) {
    return new Proxy(instance, {
        get(target, prop) {
            // 如果属性已存在，直接返回
            if (prop in target) {
                return target[prop];
            }

            // 避免内部属性和方法
            if (typeof prop === 'string' && !prop.startsWith('_') && 
                !['dll', 'obj', 'dllPath', 'configPath'].includes(prop)) {
                
                // 返回动态生成的命令方法
                return function(...args) {
                    return target.executeCommandJSON(prop, args);
                };
            }

            return target[prop];
        }
    });
}

/**
 * COM 串口通信类
 */
class COM extends CommunicationBase {
    /**
     * 初始化 COM 通信
     * 
     * @param {string} port - COM 端口名 (如 "COM3")
     * @param {number} baudrate - 波特率 (如 115200)
     * @param {number} byteSize - 数据位 (默认 8)
     * @param {number} stopBits - 停止位 (默认 1.0)
     * @param {string} parity - 校验位 (默认 "none")
     * @param {string} dllPath - DLL 文件路径 (可选，自动检测)
     * @param {string} configPath - 配置文件路径 (可选，自动检测)
     */
    constructor(port, baudrate, byteSize = 8, stopBits = 1.0, parity = "none", 
                dllPath = null, configPath = null) {
        super(dllPath, configPath);

        // 初始化 COM
        const result = this.dll.CallInitCOM(
            this.obj,
            port,
            baudrate,
            byteSize,
            stopBits,
            parity
        );

        if (result !== 0) {
            throw new Error(`COM 初始化失败，错误代码: ${result}`);
        }

        console.log(`✓ COM 初始化成功: ${port}, ${baudrate}bps, ${byteSize}bits, ${stopBits}stop, ${parity}parity`);

        // 返回带有动态方法的代理对象
        return addDynamicMethods(this);
    }
}

/**
 * UDP 网络通信类
 */
class UDP extends CommunicationBase {
    /**
     * 初始化 UDP 通信
     * 
     * @param {string} remoteIp - 远程 IP 地址
     * @param {number} remotePort - 远程端口
     * @param {string} localIp - 本地 IP 地址
     * @param {number} localPort - 本地端口
     * @param {string} dllPath - DLL 文件路径 (可选，自动检测)
     * @param {string} configPath - 配置文件路径 (可选，自动检测)
     */
    constructor(remoteIp, remotePort, localIp, localPort, 
                dllPath = null, configPath = null) {
        super(dllPath, configPath);

        // 初始化 UDP
        const result = this.dll.CallInitUDP(
            this.obj,
            remoteIp,
            remotePort,
            localIp,
            localPort
        );

        if (result !== 0) {
            throw new Error(`UDP 初始化失败，错误代码: ${result}`);
        }

        console.log(`✓ UDP 初始化成功: ${remoteIp}:${remotePort} -> ${localIp}:${localPort}`);

        // 返回带有动态方法的代理对象
        return addDynamicMethods(this);
    }
}

module.exports = {
    CommunicationBase,
    COM,
    UDP,
    getDllPath,
    getConfigPath
};