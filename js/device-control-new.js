/**
 * 生成控制界面HTML - 新版本（左右布局）
 * @param {Object} command - 命令配置
 * @param {Object} device - 设备配置
 * @param {Object} connection - 连接信息
 * @returns {string} HTML字符串
 */
function generateControlInterface(command, device, connection) {
    let html = `
        <div style="display: flex; align-items: flex-start; gap: 20px;">
            <!-- 左侧设备信息区域 -->
            <div style="flex-shrink: 0; width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                <div style="width: 100%; height: 120px; margin-bottom: 15px; border: 1px solid #ccc; background-color: white; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                    <img src="3.png" style="max-width: 90%; max-height: 90%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; font-size: 12px; color: #666;">设备图片</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">Product Model: ${device.name}</div>
                    <div style="background-color: #6c9bd1; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block;">Product Number: 2024010978</div>
                </div>
            </div>
            
            <!-- 右侧控制表格区域 -->
            <div style="flex: 1;">
                <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <thead>
                        <tr>
                            <th style="background-color: #e9ecef; border: 1px solid #dee2e6; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>
                            <th style="background-color: #6c9bd1; color: white; border: 1px solid #5a8bc4; padding: 12px; font-weight: bold; text-align: center;">ADDRESS</th>
                            <th style="background-color: #6c9bd1; color: white; border: 1px solid #5a8bc4; padding: 12px; font-weight: bold; text-align: center;">CHANNEL</th>
    `;

    // 添加参数列标题（除了ADDRESS和CHANNEL）
    command.params.forEach(param => {
        if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
            html += `<th style="background-color: #6c9bd1; color: white; border: 1px solid #5a8bc4; padding: 12px; font-weight: bold; text-align: center;">${param.name}</th>`;
        }
    });

    // 添加返回值列标题
    command.returns.forEach(ret => {
        html += `<th style="background-color: #6c9bd1; color: white; border: 1px solid #5a8bc4; padding: 12px; font-weight: bold; text-align: center;">${ret.name}</th>`;
    });

    html += `<th style="background-color: #6c9bd1; color: white; border: 1px solid #5a8bc4; padding: 12px; font-weight: bold; text-align: center;">EXE</th></tr></thead><tbody>`;

    // 为每个通道生成一行
    for (let channel = 1; channel <= device.channeltotal; channel++) {
        const rowBgColor = channel % 2 === 0 ? '#f8f9fa' : 'white';
        html += `<tr style="background-color: ${rowBgColor};">`;

        // 通道号
        html += `<td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; background-color: #6c9bd1; color: white; font-weight: bold;">Channel${channel}</td>`;

        // ADDRESS（自动填充）
        html += `<td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${connection.deviceAddress}</td>`;

        // CHANNEL（自动填充）
        html += `<td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${channel}</td>`;

        // 其他参数输入框
        command.params.forEach(param => {
            if (param.name !== 'ADDRESS' && param.name !== 'CHANNEL') {
                html += `<td style="border: 1px solid #dee2e6; padding: 8px;">`;
                html += generateInputField(param, channel, command.name);
                html += `</td>`;
            }
        });

        // 返回值显示框
        command.returns.forEach(ret => {
            html += `<td style="border: 1px solid #dee2e6; padding: 8px;">`;
            html += generateOutputField(ret, channel, command.name);
            html += `</td>`;
        });

        // 执行按钮
        html += `<td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">`;
        html += `<button onclick="executeCommand('${command.name}', ${channel})" style="background-color: #28a745; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#218838'" onmouseout="this.style.backgroundColor='#28a745'">EXE</button>`;
        html += `</td>`;

        html += `</tr>`;
    }

    html += `</tbody></table>
            </div>
        </div>`;

    return html;
}