# Connection Menu Feature

## 功能描述

新增了动态连接菜单功能，支持多个设备连接的管理。当设备连接成功后，菜单栏会自动添加一个"Connection"菜单项，显示所有活跃连接；当所有连接关闭后，该菜单项会自动移除。

## 功能特性

### 1. 自动添加Connection菜单
- 当任何设备连接成功时，菜单栏会在"File"菜单左边（最前面）自动添加"Connection"菜单项
- Connection菜单显示格式为：**设备名称/地址/连接方式**
  - 设备名称：从设备的Product Model字段获取
  - 地址：从设备的Device Address字段获取
  - 连接方式：连接类型 (RS-232, RS-422, USB-VCP, LAN-UDP)
  - Disconnect: 断开连接选项

### 2. 多连接支持
- ✅ **支持多个连接同时显示**：Connection菜单会追加显示所有活跃连接
- 每个连接显示为独立的子项，格式：`Device Model 1/8/RS-232`
- 每个连接都有独立的"断开"选项
- 当有多个连接时，提供"断开所有连接"选项

### 3. 自动移除Connection菜单
- 当所有连接都断开时，Connection菜单会自动从菜单栏移除
- 支持通过设备面板的断开按钮或Connection菜单的断开选项来断开连接
- 支持选择性断开特定连接或断开所有连接

### 4. 多语言支持
- 支持中英文切换
- 英文: "Connection" / "Disconnect" / "Disconnect All"
- 中文: "连接" / "断开" / "断开所有连接"
- 语言切换时Connection菜单会同步更新

### 5. 智能菜单管理
- 自动检测活跃连接数量
- 动态更新菜单内容
- 连接状态实时同步

## 技术实现

### 修改的文件

1. **js/menu.js**
   - 添加了`connectionMenu`全局变量存储菜单引用
   - 新增`updateConnectionMenu()`函数用于更新Connection菜单显示所有连接
   - 新增`removeConnectionMenu()`函数用于移除Connection菜单
   - 更新`toggleLanguage()`函数支持Connection菜单的语言切换

2. **js/connection-manager.js**
   - 添加了`activeConnections` Map存储所有活跃连接信息
   - 修改`connectDevice()`函数，连接成功后调用`updateConnectionMenu()`
   - 修改`disconnectDevice()`函数，断开连接后调用`updateConnectionMenu()`
   - 新增`disconnectSpecificConnection()`函数处理从菜单断开特定连接
   - 新增`disconnectAllConnections()`函数处理断开所有连接

### 关键函数

```javascript
// 更新Connection菜单显示所有连接
updateConnectionMenu()

// 移除Connection菜单
removeConnectionMenu()

// 断开指定连接
disconnectSpecificConnection(connectionKey)

// 断开所有连接
disconnectAllConnections()
```

## 使用方法

1. **连接设备**
   - 在设备面板中点击任意连接类型的"Connect"按钮
   - 连接成功后，菜单栏会自动显示"Connection"菜单

2. **查看连接信息**
   - 将鼠标悬停在"Connection"菜单上
   - 下拉菜单会显示所有活跃连接的详细信息
   - 每个连接显示格式：`Device Model 1/8/RS-232`

3. **断开连接**
   - 方法1: 在设备面板中点击对应的"Disconnect"按钮
   - 方法2: 在"Connection"菜单中点击特定连接的"断开"选项
   - 方法3: 在"Connection"菜单中点击"断开所有连接"（多连接时）
   - 当所有连接断开后，Connection菜单会自动消失

4. **语言切换**
   - 在"Settings"菜单中点击"System Language/Language"
   - Connection菜单会同步切换语言显示

## 测试

可以使用以下测试文件来验证Connection菜单的功能：
- `test-connection-menu.html` - 基础功能测试
- `test-multi-connection-menu.html` - 多连接功能测试
  - 测试添加多个连接
  - 测试选择性断开连接
  - 测试断开所有连接
  - 测试语言切换功能

## 注意事项

- ✅ **支持多个活跃连接同时显示**
- 每个连接都有独立的断开选项
- 菜单内容会根据连接数量动态调整
- 菜单的显示和隐藏完全自动化，无需手动操作
- 支持所有连接类型：RS-232, RS-422, USB-VCP, LAN-UDP
- 连接状态与设备面板实时同步