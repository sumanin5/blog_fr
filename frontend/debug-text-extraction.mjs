// 模拟文本提取函数
const extractText = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);

  // 修复：数组元素之间不添加换行符
  if (Array.isArray(node)) return node.map(extractText).join("");

  // 模拟 React 元素
  if (node && typeof node === "object" && node.props) {
    return extractText(node.props.children || null);
  }

  return "";
};

// 测试用例
const testCases = [
  // 正确的字符串
  "graph TD\n    A[开始] --> B{是否登录?}",

  // 问题：数组结构会破坏语法
  ["graph", " TD\n    A", "[开始]", " --> B", "{是否登录?}"],

  // 更复杂的数组
  ["graph\n", "TD\n\n    A\n", "[开始]\n ", "-->\n B\n", "{是否登录?}"],
];

console.log("=== 文本提取测试结果 ===\n");

testCases.forEach((testCase, index) => {
  const result = extractText(testCase);
  console.log(`测试 ${index + 1}:`);
  console.log("输入:", JSON.stringify(testCase, null, 2));
  console.log("输出:", JSON.stringify(result));
  console.log("实际内容:");
  console.log(result);
  console.log("---");
});

// 验证 Mermaid 语法
console.log("\n=== Mermaid 语法验证 ===");
const correctSyntax = "graph TD\n    A[开始] --> B{是否登录?}";
const brokenSyntax = extractText([
  "graph",
  " TD\n    A",
  "[开始]",
  " --> B",
  "{是否登录?}",
]);

console.log("正确语法:");
console.log(correctSyntax);
console.log("\n破坏的语法:");
console.log(brokenSyntax);
console.log("\n是否相同:", correctSyntax === brokenSyntax);
