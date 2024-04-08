# 测试 promise A+ 规范
# sudo chmod u+x ./do-test.sh
# tsc test.ts

package_name="promises-aplus-tests"

check_package=$(npm list -g --depth 0 | grep $package_name)
if [ -z "$check_package" ]; then
    echo "未找到$package_name包, 执行npm install -g promises-aplus-tests"
    npm install -g promises-aplus-tests
fi

echo "编译测试文件"
tsc ./index.ts
tsc ./test.ts
echo "编译完成"

promises-aplus-tests test.js