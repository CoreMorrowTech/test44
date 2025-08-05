/**
 * 菜单和语言切换功能
 */

/**
 * 初始化下拉菜单
 */
function initializeDropdownMenus() {
    // 显示/隐藏下拉菜单
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function () {
            this.querySelector('.dropdown-content').style.display = 'block';
        });
        dropdown.addEventListener('mouseleave', function () {
            this.querySelector('.dropdown-content').style.display = 'none';
        });
    });

    // 为"系统语言/Language"菜单项添加点击事件
    document.querySelectorAll('.dropdown-content div').forEach(item => {
        if (item.textContent.includes('System Language') || item.textContent.includes('Language')) {
            item.onclick = toggleLanguage;
        }
    });
}

/**
 * 语言切换函数
 */
function toggleLanguage() {
    const isEnglish = currentLanguage === 'en';
    currentLanguage = isEnglish ? 'zh' : 'en';

    // Update page text content
    document.querySelector('.title').textContent = isEnglish ? '芯明天纳米运动控制软件' : 'CoreMorrow Nano Motion Control Software';
    document.querySelector('.subtitle').textContent = isEnglish ? '芯明天纳米运动控制软件' : 'COREMORROW NANO MOTION CONTROL SOFTWARE';

    // Update menu bar content
    const menuItems = document.querySelectorAll('.menu-item.dropdown');
    const menuTexts = isEnglish
        ? ['文件', '信息', '设置', '帮助']
        : ['File', 'Info', 'Settings', 'Help'];

    menuItems.forEach((item, index) => {
        item.childNodes[0].textContent = menuTexts[index];
    });

    // Update dropdown menu content
    const dropdownContents = document.querySelectorAll('.dropdown-content');
    const dropdownTexts = isEnglish
        ? [
            ['导入设备', '新建/编辑设备', '导出页面记录', '文件关闭', '当前窗口退出'],
            ['出厂报告查询'],
            ['标定参数设置', '调试参数设置', '控制器固件升级', '系统语言/Language'],
            ['用户手册', '帮助视频', '检查更新', '更新内容', '关于', '修改']
        ]
        : [
            ['Import Device', 'New/Edit Device', 'Export Page Records', 'Close File', 'Exit Current Window'],
            ['Factory Report Query'],
            ['Calibration Parameter Settings', 'Debug Parameter Settings', 'Controller Firmware Upgrade', 'System Language/Language'],
            ['User Manual', 'Help Videos', 'Check for Updates', 'Update Content', 'About', 'Modify']
        ];

    dropdownContents.forEach((content, index) => {
        const items = content.querySelectorAll('div');
        items.forEach((item, subIndex) => {
            item.textContent = dropdownTexts[index][subIndex];
        });
    });
}