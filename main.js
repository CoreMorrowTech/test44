const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,  // 移除标题栏
    titleBarStyle: 'hidden',  // 隐藏标题栏
    minWidth: 1080,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false  // 允许加载本地文件和原生模块
    }
  });

  // 将窗口实例暴露给渲染进程
  global.mainWindow = mainWindow;

  mainWindow.loadFile('index.html');
  
  // 打开开发者工具以便调试
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});