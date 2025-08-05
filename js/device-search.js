/**
 * 设备搜索功能
 */

/**
 * 搜索设备函数
 */
function searchDevice() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const devices = document.querySelectorAll('.device');

    devices.forEach(device => {
        const label = device.querySelector('.device-label');
        const shouldShow = label.textContent.toLowerCase().includes(searchText);
        device.style.display = shouldShow ? 'inline-block' : 'none';
    });
}