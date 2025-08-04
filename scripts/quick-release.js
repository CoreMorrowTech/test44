const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置信息 - 请替换为你的实际仓库信息
const config = {
    owner: 'CoreMorrowTech',        // 替换为你的GitHub用户名
    repo: 'test44',        // 替换为你的仓库名
    token: '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'
};

// 从package.json读取版本
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const tagName = `v${version}`;

async function createRelease() {
    const releaseData = {
        tag_name: tagName,
        target_commitish: 'main',
        name: `CodeLinear v${version}`,
        body: `## 🚀 CodeLinear 通信控制台 v${version}

### ✨ 新功能
- 支持COM串口和UDP网络通信
- 动态命令配置和执行
- 多语言支持（中文/英文）
- 自动更新检查功能
- 现代化的用户界面

### 📥 安装说明
1. 下载下方的安装包文件
2. 运行安装程序
3. 按照提示完成安装

### 📋 系统要求
- Windows 10 或更高版本
- 64位系统

---
**发布时间**: ${new Date().toLocaleString('zh-CN')}`,
        draft: false,
        prerelease: false
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(releaseData);

        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${config.owner}/${config.repo}/releases`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'User-Agent': 'CodeLinear-Release-Script',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`创建Release失败: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function uploadAsset(release, filePath) {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const fileStream = fs.createReadStream(filePath);

    // 从upload_url中提取基础URL
    const uploadUrl = release.upload_url.replace('{?name,label}', '');
    const finalFileName = `CodeLinear-Setup-${version}.exe`;
    const url = new URL(`${uploadUrl}?name=${encodeURIComponent(finalFileName)}`);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'User-Agent': 'CodeLinear-Release-Script',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileSize
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`上传文件失败: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', reject);
        fileStream.pipe(req);
    });
}

async function main() {
    try {
        console.log(`🚀 开始发布 CodeLinear v${version}...`);

        // 1. 检查exe文件是否存在
        const distPath = path.join(__dirname, '..', 'dist');
        const expectedExeFile = `我的Electron应用 Setup ${version}.exe`;
        const exePath = path.join(distPath, expectedExeFile);

        if (!fs.existsSync(exePath)) {
            console.error(`❌ 未找到构建文件: ${exePath}`);
            console.log('请先运行: npm run build:win');
            process.exit(1);
        }

        const fileSize = (fs.statSync(exePath).size / (1024 * 1024)).toFixed(1);
        console.log(`📦 找到安装包: ${expectedExeFile} (${fileSize} MB)`);

        // 2. 创建Release
        console.log('📝 创建GitHub Release...');
        const release = await createRelease();
        console.log(`✅ Release创建成功: ${release.html_url}`);

        // 3. 上传exe文件
        console.log('📤 上传安装包...');
        const asset = await uploadAsset(release, exePath);
        console.log(`✅ 文件上传成功: ${asset.browser_download_url}`);

        console.log('\n🎉 发布完成！');
        console.log(`📄 Release页面: ${release.html_url}`);
        console.log(`⬇️  直接下载: ${asset.browser_download_url}`);
        console.log(`📊 文件大小: ${fileSize} MB`);

    } catch (error) {
        console.error('❌ 发布失败:', error.message);

        if (error.message.includes('401')) {
            console.log('💡 可能的解决方案:');
            console.log('1. 检查GitHub token是否正确');
            console.log('2. 确保token有repo权限');
            console.log('3. 检查仓库名和用户名是否正确');
        }

        process.exit(1);
    }
}

// 检查配置
if (config.owner === 'your-username' || config.repo === 'your-repo-name') {
    console.error('❌ 请先配置GitHub仓库信息:');
    console.log('编辑 scripts/quick-release.js 文件');
    console.log('将 owner 和 repo 替换为你的实际GitHub用户名和仓库名');
    process.exit(1);
}

main();