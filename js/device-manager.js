/**
 * 设备管理功能
 */

/**
 * 添加设备到frame2区域
 * @param {string} deviceModel - 设备型号
 */
function addDevice(deviceModel) {
    const frame2 = document.getElementById('frame2');
    const deviceId = 'device-' + Date.now();

    const deviceElement = document.createElement('div');
    deviceElement.className = 'frame2-device';
    deviceElement.id = deviceId;
    deviceElement.style.width = '100%';
    deviceElement.style.minHeight = '50%';
    deviceElement.style.backgroundColor = '#ff9f9';
    deviceElement.style.display = 'flex';
    deviceElement.style.alignItems = 'center';
    deviceElement.style.padding = '10px';

    // 创建图片容器
    const imgContainer = createImageContainer(deviceModel, deviceElement, frame2);

    // 创建控制容器
    const controlContainer = createControlContainer(deviceId);

    deviceElement.appendChild(imgContainer);
    deviceElement.appendChild(controlContainer);
    frame2.appendChild(deviceElement);
}

/**
 * 创建图片容器
 * @param {string} deviceModel - 设备型号
 * @param {HTMLElement} deviceElement - 设备元素
 * @param {HTMLElement} frame2 - frame2容器
 * @returns {HTMLElement} 图片容器
 */
function createImageContainer(deviceModel, deviceElement, frame2) {
    const imgContainer = document.createElement('div');
    imgContainer.style.position = 'relative';
    imgContainer.style.width = '20%';
    imgContainer.style.height = '100%';
    imgContainer.style.marginRight = '10px';

    // 设备图片
    const deviceImg = document.createElement('div');
    deviceImg.className = 'device-img';
    deviceImg.style.backgroundImage = `url('${deviceImageMap[deviceModel] || '3.png'}')`;
    deviceImg.style.width = '100%';
    deviceImg.style.height = '50%';
    deviceImg.style.backgroundSize = 'contain';
    deviceImg.style.backgroundColor = '#d3d3d3';
    deviceImg.style.backgroundPosition = 'center center';
    deviceImg.style.backgroundRepeat = 'no-repeat';
    deviceImg.style.margin = '0 auto';
    imgContainer.appendChild(deviceImg);

    // 删除按钮
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.style.position = 'absolute';
    removeBtn.style.right = '0%';
    removeBtn.style.top = '4%';
    removeBtn.style.backgroundImage = "url('-.png')";
    removeBtn.onclick = function () {
        frame2.removeChild(deviceElement);
    };
    imgContainer.appendChild(removeBtn);

    // 设备型号标签
    const modelLabel = document.createElement('div');
    modelLabel.textContent = 'Product Model: ' + deviceModel;
    modelLabel.style.marginTop = '3%';
    modelLabel.style.textAlign = 'left';
    modelLabel.style.fontSize = '0.8vw';
    modelLabel.style.backgroundColor = '#d3d3d3';
    imgContainer.appendChild(modelLabel);

    // 产品编号标签（可编辑）
    const productNumberLabel = createProductNumberLabel();
    imgContainer.appendChild(productNumberLabel);

    // 设备地址容器
    const addressContainer = createAddressContainer();
    imgContainer.appendChild(addressContainer);

    return imgContainer;
}

/**
 * 创建产品编号标签
 * @returns {HTMLElement} 产品编号标签
 */
function createProductNumberLabel() {
    const productNumberLabel = document.createElement('div');
    productNumberLabel.textContent = 'Product Number: ';
    productNumberLabel.style.marginTop = '0%';
    productNumberLabel.style.textAlign = 'left';
    productNumberLabel.style.fontSize = '0.8vw';
    productNumberLabel.style.backgroundColor = '#d3d3d3';

    const productNumberInput = document.createElement('input');
    productNumberInput.type = 'text';
    productNumberInput.value = '2024010978';
    productNumberInput.style.width = '50%';
    productNumberInput.style.textAlign = 'left';
    productNumberInput.style.border = '1px solid #d3d3d3';
    productNumberInput.style.fontSize = '0.8vw';
    productNumberInput.style.backgroundColor = '#d3d3d3';

    productNumberLabel.appendChild(productNumberInput);
    return productNumberLabel;
}

/**
 * 创建地址容器
 * @returns {HTMLElement} 地址容器
 */
function createAddressContainer() {
    const addressContainer = document.createElement('div');
    addressContainer.style.display = 'flex';
    addressContainer.style.justifyContent = 'space-between';
    addressContainer.style.alignItems = 'center';
    addressContainer.style.marginTop = '0%';
    addressContainer.style.backgroundColor = '#ffffff';
    addressContainer.style.padding = '2px';

    // 修改地址按钮
    const editAddressBtn = document.createElement('button');
    editAddressBtn.textContent = 'Modify Address';
    editAddressBtn.style.fontSize = '0.6vw';
    editAddressBtn.style.marginTop = '6%';
    editAddressBtn.style.width = '52%';
    editAddressBtn.style.height = '2.5vh';
    editAddressBtn.style.backgroundColor = '#c80025';
    editAddressBtn.style.color = 'white';
    editAddressBtn.style.border = 'none';
    editAddressBtn.style.borderRadius = '3px';
    editAddressBtn.style.cursor = 'pointer';

    // 地址标签（可编辑）
    const addressLabel = document.createElement('div');
    addressLabel.textContent = 'Device Address: ';
    addressLabel.style.fontSize = '0.8vw';
    addressLabel.style.marginTop = '6%';
    addressLabel.style.textAlign = 'left';
    addressLabel.style.backgroundColor = '#ffffff';

    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.value = '8';
    addressInput.style.width = '50%';
    addressInput.style.textAlign = 'left';
    addressInput.style.border = '0px solid #d3d3d3';
    addressInput.style.fontSize = '0.8vw';
    addressInput.style.backgroundColor = '#ffffff';

    addressLabel.appendChild(addressInput);
    addressContainer.appendChild(addressLabel);
    addressContainer.appendChild(editAddressBtn);

    return addressContainer;
}

/**
 * 创建控制容器
 * @param {string} deviceId - 设备ID
 * @returns {HTMLElement} 控制容器
 */
function createControlContainer(deviceId) {
    const controlContainer = document.createElement('div');
    controlContainer.style.flexGrow = '1';
    controlContainer.style.display = 'flex';
    controlContainer.style.flexDirection = 'column';

    const modes = [
        {
            label: 'RS-232',
            inputs: ['COM1', '115200dps', '8 data bits', '1 stop bit', 'No parity']
        },
        {
            label: 'RS-422',
            inputs: ['COM2', '115200dps', '8 data bits', '1 stop bit', 'No parity']
        },
        {
            label: 'USB-VCP',
            inputs: ['COM3', '115200dps', '8 data bits', '1 stop bit', 'No parity']
        },
        {
            label: 'LAN-UDP',
            inputs: ['UDP, Local IP: 192.168.0.100:7010', 'UDP, Target IP: 192.168.0.101:7010']
        }
    ];

    modes.forEach(mode => {
        const modeContainer = createModeContainer(deviceId, mode);
        controlContainer.appendChild(modeContainer);
    });

    return controlContainer;
}

/**
 * 创建模式容器
 * @param {string} deviceId - 设备ID
 * @param {Object} mode - 模式配置
 * @returns {HTMLElement} 模式容器
 */
function createModeContainer(deviceId, mode) {
    const modeContainer = document.createElement('div');
    modeContainer.style.display = 'flex';
    modeContainer.style.alignItems = 'center';

    // 模式标签
    const modeLabel = document.createElement('div');
    modeLabel.textContent = mode.label;
    modeLabel.style.flexBasis = '10%';
    modeLabel.style.fontSize = '0.8vw';
    modeLabel.style.textAlign = 'center';
    modeLabel.style.backgroundColor = '#c80025';
    modeLabel.style.width = '10%';
    modeLabel.style.color = 'white';
    modeContainer.appendChild(modeLabel);

    // 输入框
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = mode.inputs.join(' ');
    inputField.style.width = '80%';
    inputField.style.padding = '5px';
    inputField.style.fontSize = '0.7em';
    inputField.style.border = 'none';
    inputField.style.borderBottom = '1px solid black';
    modeContainer.appendChild(inputField);

    // 操作按钮
    ['Modify', 'Connect', 'Disconnect'].forEach(action => {
        const actionButton = document.createElement('button');
        actionButton.textContent = action;
        actionButton.style.flexBasis = '10%';
        actionButton.style.fontSize = '5px';
        actionButton.style.padding = '5px';
        actionButton.style.backgroundColor = action === 'Disconnect' ? '#ccc' : '#c80025';
        actionButton.style.color = 'white';
        actionButton.style.border = 'none';
        actionButton.style.cursor = 'pointer';

        // 添加点击事件处理
        if (action === 'Connect') {
            actionButton.onclick = () => connectDevice(deviceId, mode.label, inputField.value, actionButton);
        } else if (action === 'Disconnect') {
            actionButton.onclick = () => disconnectDevice(deviceId, mode.label, actionButton);
        } else if (action === 'Modify') {
            actionButton.onclick = () => modifyConnection(inputField);
        }

        modeContainer.appendChild(actionButton);
    });

    return modeContainer;
}