# Connection Menu Feature

## 功能描述

新增了动态连接菜单功能，当设备连接成功后，菜单栏会自动添加一个"Connection"菜单项；当连接关闭后，该菜单项会自动移除。

## 功能特性

### 1. 自动添加Connection菜单
- 当任何设备连接成功时，菜单栏会在"File"菜单左边（最前面）自动添加"Connection"菜单项
- Connection菜单显示格式为：**设备名称/地址/连接方式**
  - 设备名称：从设备的Product Model字段获取
  - 地址：从设备的Device Address字段获取
  - 连接方式：连接类型 (RS-232, RS-422, USB-VCP, LAN-UDP)
  - Disconnect: 断开连接选项

### 2. 自动移除Connection菜单
- 当连接断开时，Connection菜单会自动从菜单栏移除
- 支持通过设备面板的断开按钮或Connection菜单的断开选项来断开连接

### 3. 多语言支持
- 支持中英文切换
- 英文: "Connection"
- 中文: "连接"
- 语言切换时Connection菜单会同步更新

### 4. 单一活跃连接
- 同时只能有一个活跃连接显示在菜单栏
- 新连接会替换之前的Connection菜单

## 技术实现

### 修改的文件

1. **js/menu.js**
   - 添加了`connectionMenu`全局变量存储菜单引用
   - 新增`addConnectionMenu()`函数用于添加Connection菜单
   - 新增`removeConnectionMenu()`函数用于移除Connection菜单
   - 新增`disconnectCurrentConnection()`函数处理菜单断开操作
   - 更新`toggleLanguage()`函数支持Connection菜单的语言切换

2. **js/connection-manager.js**
   - 添加了`currentActiveConnection`全局变量存储当前活跃连接信息
   - 修改`connectDevice()`函数，连接成功后调用`addConnectionMenu()`
   - 修改`disconnectDevice()`函数，断开连接后调用`removeConnectionMenu()`
   - 新增`disconnectCurrentActiveConnection()`函数处理从菜单断开连接

### 关键函数

```javascript
// 添加Connection菜单
addConnectionMenu(deviceId, connectionType, connectionInfo)

// 移除Connection菜单
removeConnectionMenu()

// 从菜单断开当前连接
disconnectCurrentConnection()

// 断开当前活跃连接
disconnectCurrentActiveConnection()
```

## 使用方法

1. **连接设备**
   - 在设备面板中点击任意连接类型的"Connect"按钮
   - 连接成功后，菜单栏会自动显示"Connection"菜单

2. **查看连接信息**
   - 将鼠标悬停在"Connection"菜单上
   - 下拉菜单会显示当前连接的详细信息

3. **断开连接**
   - 方法1: 在设备面板中点击对应的"Disconnect"按钮
   - 方法2: 在"Connection"菜单中点击"Disconnect"选项
   - 断开后Connection菜单会自动消失

4. **语言切换**
   - 在"Settings"菜单中点击"System Language/Language"
   - Connection菜单会同步切换语言显示

## 测试

可以使用`test-connection-menu.html`文件来测试Connection菜单的功能：
- 测试添加Connection菜单
- 测试移除Connection菜单  
- 测试语言切换功能

## 注意事项

- 同时只能有一个活跃连接的菜单显示
- 新连接会自动替换之前的Connection菜单
- 菜单的显示和隐藏完全自动化，无需手动操作
- 支持所有连接类型：RS-232, RS-422, USB-VCP, LAN-UDP