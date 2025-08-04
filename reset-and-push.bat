@echo off
echo 重置最近的提交并重新推送...

echo.
echo 1. 重置到上一个安全的提交...
git reset --soft HEAD~2

echo.
echo 2. 重新添加所有文件...
git add .

echo.
echo 3. 创建新的提交...
git commit -m "feat: add update check functionality with secure token handling"

echo.
echo 4. 强制推送到远程仓库...
git push origin master --force

echo.
echo 完成！代码已安全推送。
pause