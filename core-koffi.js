/**
 * 通信封装核心模块 - 使用 koffi 替代 ffi-napi
 * 直接使用 app.cpp 导出的 ExecuteCommandJSON 方法
 */

const koffi = require('koffi');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

// 获取 DLL 路径的辅助函数
function getDllPath() {
    let app = null;
    try {
        app = require('electron').app;
    } catch (error) {
        // 在渲染进程或开发环境中可能无法访问 app
        console.log('无法访问 electron.app，使用备用路径检测');
    }

    // 获取应用程序的安装路径
    const appPath = app ? app.getAppPath() : __dirname;
    const resourcesPath = app ? process.resourcesPath : path.dirname(__dirname);

    const possiblePaths = [
        'E:\\C++\\NewDll\\DLL\\x64\\Debug\\3App.dll'
        // // 开发环境路径
        // path.join(__dirname, '3App.dll'),
        // path.join(__dirname, '../3App.dll'),

        // // 打包后的路径 - extraFiles 会将 DLL 复制到应用根目录
        // path.join(path.dirname(resourcesPath), '3App.dll'),
        // path.join(resourcesPath, '3App.dll'),

        // // 备用路径
        // path.join(path.dirname(appPath), '3App.dll'),
        // path.join(process.cwd(), '3App.dll'),
    ];

    for (const dllPath of possiblePaths) {
        if (fs.existsSync(dllPath)) {
            console.log(`找到DLL文件: ${dllPath}`);
            return dllPath;
        }
    }
    console.log('未找到DLL文件，检查的路径:', possiblePaths);
    return null;
}

// 获取配置文件路径的辅助函数
function getConfigPath() {
    let app = null;
    try {
        app = require('electron').app;
    } catch (error) {
        // 在渲染进程或开发环境中可能无法访问 app
        console.log('无法访问 electron.app，使用备用路径检测');
    }

    // 获取应用程序的安装路径
    const appPath = app ? app.getAppPath() : __dirname;
    const resourcesPath = app ? process.resourcesPath : path.dirname(__dirname);

    const possiblePaths = [
        'E:\\C++\\NewDll\\DLL\\x64\\Debug\\config.json'
        // // 开发环境路径
        // path.join(__dirname, 'config.json'),
        // path.join(__dirname, '../config.json'),

        // // 打包后的路径 - extraFiles 会将配置文件复制到应用根目录
        // path.join(path.dirname(resourcesPath), 'config.json'),
        // path.join(resourcesPath, 'config.json'),

        // // 备用路径
        // path.join(path.dirname(appPath), 'config.json'),
        // path.join(process.cwd(), 'config.json'),
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
class CommunicationBase extends EventEmitter {
    constructor(dllPath = null, configPath = null) {
        super();
        this.dllPath = dllPath || getDllPath();
        this.configPath = configPath || getConfigPath();
        this.lib = null;
        this.obj = null;

        // 回调相关属性
        this._dataCallback = null;
        this._callbackFunc = null;
        this._dataQueue = [];
        this._isListening = false;

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
            this.lib = koffi.load(this.dllPath);

            // 定义函数签名
            this.CreateCommunicationObject = this.lib.func('CreateCommunicationObject', 'void*', []);
            this.DestroyCommunicationObject = this.lib.func('DestroyCommunicationObject', 'void', ['void*']);
            this.CallInitUDP = this.lib.func('CallInitUDP', 'int', ['void*', 'str', 'int', 'str', 'int']);
            this.CallInitCOM = this.lib.func('CallInitCOM', 'int', ['void*', 'str', 'int', 'int', 'float', 'str']);
            this.CallSelectProtocol = this.lib.func('CallSelectProtocol', 'void', ['void*', 'int']);
            this.CallExecuteCommandJSON = this.lib.func('CallExecuteCommandJSON', 'str', ['void*', 'str']);
            this.CallExecuteCommandJSONAsync = this.lib.func('CallExecuteCommandJSONAsync', 'void', ['void*', 'str']);
            this.CallClose = this.lib.func('CallClose', 'void', ['void*']);

            // 回调函数相关 - 暂时注释掉，先测试基本功能
            // this.DataCallbackFunc = koffi.proto('void DataCallbackFunc(str data)');
            // this.CallSetDataCallback = this.lib.func('CallSetDataCallback', 'void', ['void*', this.DataCallbackFunc]);
            // this.CallClearDataCallback = this.lib.func('CallClearDataCallback', 'void', ['void*']);

            console.log(`✓ DLL 加载成功: ${this.dllPath}`);
        } catch (error) {
            throw new Error(`DLL 设置失败: ${error.message}`);
        }
    }

    /**
     * 创建通信对象
     */
    _createCommunicationObject() {
        this.obj = this.CreateCommunicationObject();
        if (!this.obj) {
            throw new Error('创建通信对象失败');
        }
    }

    /**
     * 选择协议版本
     */
    selectProtocol(protocolVersion) {
        try {
            this.CallSelectProtocol(this.obj, protocolVersion);
            return true;
        } catch (error) {
            console.log(`协议选择失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 内部回调函数，处理从DLL接收到的数据
     */
    _internalCallback(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            // 如果用户设置了回调函数，调用用户回调
            if (this._dataCallback) {
                this._dataCallback(data);
            } else {
                // 如果没有用户回调，将数据放入队列供后续处理
                this._dataQueue.push(data);
            }

            // 触发事件
            this.emit('data', data);

        } catch (error) {
            console.log(`回调处理错误: ${error.message}`);
        }
    }

    /**
     * 设置数据回调函数（用于持续监听模式）
     * 
     * @param {Function|null} callback - 回调函数，接收解析后的JSON数据对象，设置为null可清除回调
     */
    setDataCallback(callback) {
        this._dataCallback = callback;

        // 暂时禁用DLL回调功能，直接设置用户回调
        console.log('注意: DLL回调功能暂时禁用，仅支持用户回调');
        
        // if (callback) {
        //     // 设置DLL回调
        //     if (!this._callbackFunc) {
        //         this._callbackFunc = koffi.register(this._internalCallback.bind(this), this.DataCallbackFunc);
        //     }
        //     this.CallSetDataCallback(this.obj, this._callbackFunc);
        // } else {
        //     // 清除DLL回调
        //     this.CallClearDataCallback(this.obj);
        // }
    }

    /**
     * 获取实时数据（用于持续监听模式，当没有设置回调时使用）
     * 
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Object|null} 接收到的数据，如果超时返回null
     */
    getRealtimeData(timeout = 1000) {
        return new Promise((resolve) => {
            if (this._dataQueue.length > 0) {
                resolve(this._dataQueue.shift());
                return;
            }

            const startTime = Date.now();
            const checkData = () => {
                if (this._dataQueue.length > 0) {
                    resolve(this._dataQueue.shift());
                } else if (Date.now() - startTime >= timeout) {
                    resolve(null);
                } else {
                    setTimeout(checkData, 10);
                }
            };
            checkData();
        });
    }

    /**
     * 启动持续监听模式（自动设置回调并执行命令）
     * 
     * @param {string} cmdName - 命令名称
     * @param {Array} params - 参数列表
     * @param {Function} callback - 数据回调函数（可选）
     * @returns {Object} 命令执行结果
     */
    startContinuousListening(cmdName, params = [], callback = null) {
        // 设置回调（如果提供）
        if (callback) {
            this.setDataCallback(callback);
        }

        this._isListening = true;

        // 执行命令（timeout=-1的命令会自动进入持续监听模式）
        return this.executeCommandJSON(cmdName, params);
    }

    /**
     * 停止持续监听模式
     */
    stopContinuousListening() {
        this._isListening = false;
        this.setDataCallback(null);
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

            const resultStr = this.CallExecuteCommandJSON(this.obj, jsonStr);
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
     * 异步执行 JSON 命令 - 直接调用 app.cpp 导出的异步方法
     * 
     * @param {string} cmdName - 命令名称
     * @param {Array} params - 参数列表，默认为空数组
     * @param {boolean} silent - 是否静默执行（不打印日志）
     * @returns {Object} 立即返回启动状态，实际命令在后台异步执行
     */
    executeCommandJSONAsync(cmdName, params = [], silent = false) {
        try {
            const jsonCmd = {
                cmdName: cmdName,
                params: params
            };
            const jsonStr = JSON.stringify(jsonCmd);

            if (!silent) {
                console.log(`异步执行命令: ${cmdName}, 参数: ${JSON.stringify(params)}`);
            }

            // 调用异步执行函数（无返回值，立即返回）
            this.CallExecuteCommandJSONAsync(this.obj, jsonStr);

            const result = {
                status: "async_started",
                message: `异步命令 ${cmdName} 已启动`,
                command: cmdName,
                params: params
            };

            if (!silent) {
                console.log(`异步命令启动成功: ${JSON.stringify(result)}`);
            }

            return result;

        } catch (error) {
            const errorMsg = `异步命令 ${cmdName} 启动异常: ${error.message}`;
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
        // 清理回调相关资源
        this.stopContinuousListening();

        if (this.obj) {
            try {
                // 先调用CallClose真正关闭通信连接
                this.CallClose(this.obj);
                console.log('✓ 通信连接已关闭');
            } catch (error) {
                console.log(`关闭通信连接时出错: ${error.message}`);
            }

            // 然后销毁通信对象
            try {
                this.DestroyCommunicationObject(this.obj);
                console.log('✓ 通信对象已销毁');
            } catch (error) {
                console.log(`销毁通信对象时出错: ${error.message}`);
            }

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
                !['lib', 'obj', 'dllPath', 'configPath'].includes(prop)) {

                // 检查是否是异步方法调用（以Async结尾）
                if (prop.endsWith('Async')) {
                    // 获取原始命令名（去掉Async后缀）
                    const originalCmdName = prop.slice(0, -5); // 去掉'Async'

                    // 返回异步命令方法
                    return function (...args) {
                        return target.executeCommandJSONAsync(originalCmdName, args);
                    };
                } else {
                    // 返回同步命令方法
                    return function (...args) {
                        return target.executeCommandJSON(prop, args);
                    };
                }
            }

            return target[prop];
        },

        // 支持直接调用实例：comm("SingleChannelVoltage", 1, 2, 3.5, "O", 255)
        apply(target, thisArg, argumentsList) {
            if (argumentsList.length > 0) {
                const cmdName = argumentsList[0];
                const params = argumentsList.slice(1);
                return target.executeCommandJSON(cmdName, params);
            }
            return target;
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
        const result = this.CallInitCOM(
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
        const result = this.CallInitUDP(
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