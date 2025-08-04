const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取package.json获取版本信息
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

console.log(`开始构建版本 v${version}...`);

try {
  // 1. 清理dist目录
  console.log('清理构建目录...');
  if (fs.existsSync('dist')) {
    execSync('rmdir /s /q dist', { stdio: 'inherit' });
  }

  // 2. 构建应用
  console.log('构建Electron应用...');
  execSync('npm run build:win', { stdio: 'inherit' });

  // 3. 检查构建产物
  const distPath = path.join(__dirname, '..', 'dist');
  const files = fs.readdirSync(distPath);
  const exeFile = files.find(file => file.endsWith('.exe'));

  if (!exeFile) {
    throw new Error('未找到构建的exe文件');
  }

  console.log(`构建完成: ${exeFile}`);

  // 4. 创建GitHub Release（需要安装GitHub CLI）
  console.log('创建GitHub Release...');
  const releaseCommand = `gh release create v${version} --title "Version ${version}" --notes "自动构建发布" "${path.join(distPath, exeFile)}"`;
  
  try {
    execSync(releaseCommand, { stdio: 'inherit' });
    console.log('GitHub Release创建成功！');
  } catch (error) {
    console.log('GitHub CLI未安装或未配置，请手动上传到GitHub Releases');
    console.log(`文件位置: ${path.join(distPath, exeFile)}`);
  }

} catch (error) {
  console.error('构建失败:', error.message);
  process.exit(1);
}