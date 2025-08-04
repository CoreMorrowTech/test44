@echo off
echo 正在清理 Git 历史中的敏感信息...

echo.
echo 1. 创建备份分支...
git branch backup-before-cleanup

echo.
echo 2. 使用 git filter-branch 清理敏感信息...
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch scripts/quick-release.js scripts/upload-release.js .env.example" --prune-empty --tag-name-filter cat -- --all

echo.
echo 3. 清理引用...
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now

echo.
echo 4. 重新添加清理后的文件...
git add scripts/quick-release.js scripts/upload-release.js .env.example
git commit -m "fix: remove sensitive tokens from scripts and examples"

echo.
echo 清理完成！现在可以安全推送：
echo git push origin master --force
echo.
echo 注意：这会重写 Git 历史，请确保其他协作者知晓！
pause