const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置信息
const config = {
  owner: 'your-username',        // 替换为你的GitHub用户名
  repo: 'your-repo-name',        // 替换为你的仓库名
  token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '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', // GitHub Personal Access Token
};

// 从package.json读取版本
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const tagName = `v${version}`;

async function createRelease() {
  const releaseData = {
    tag_name: tagName,
    target_commitish: 'main',
    name: `Version ${version}`,
    body: `## 版本 ${version} 更新内容\n\n- 新功能和改进\n- Bug修复\n\n## 下载说明\n\n请下载下方的exe文件进行安装。`,
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
        'Authorization': `token ${config.token}`,
        'User-Agent': 'CodeLinear-Release-Script',
        'Accept': 'application/vnd.github.v3+json',
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
  const url = new URL(`${uploadUrl}?name=${encodeURIComponent(fileName)}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${config.token}`,
        'User-Agent': 'CodeLinear-Release-Script',
        'Accept': 'application/vnd.github.v3+json',
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
    console.log(`开始创建Release v${version}...`);
    
    // 1. 创建Release
    const release = await createRelease();
    console.log(`Release创建成功: ${release.html_url}`);

    // 2. 查找exe文件
    const distPath = path.join(__dirname, '..', 'dist');
    const files = fs.readdirSync(distPath);
    const exeFile = files.find(file => file.endsWith('.exe'));

    if (!exeFile) {
      throw new Error('未找到exe文件，请先运行构建命令');
    }

    const exePath = path.join(distPath, exeFile);
    console.log(`找到exe文件: ${exePath}`);

    // 3. 上传exe文件
    console.log('开始上传exe文件...');
    const asset = await uploadAsset(release, exePath);
    console.log(`文件上传成功: ${asset.browser_download_url}`);

    console.log('\n发布完成！');
    console.log(`Release页面: ${release.html_url}`);
    console.log(`下载链接: ${asset.browser_download_url}`);

  } catch (error) {
    console.error('发布失败:', error.message);
    process.exit(1);
  }
}

// 检查必要的配置
if (!config.token || config.token === 'your-github-token') {
  console.error('请设置GITHUB_TOKEN环境变量或在脚本中配置token');
  process.exit(1);
}

if (config.owner === 'your-username' || config.repo === 'your-repo-name') {
  console.error('请在脚本中配置正确的GitHub用户名和仓库名');
  process.exit(1);
}

main();