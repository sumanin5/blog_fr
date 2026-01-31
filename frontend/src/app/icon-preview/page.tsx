export default function IconPreview() {
  const icons = [
    {
      name: "字母 B（渐变蓝紫）",
      file: "icon.svg",
      desc: "简约现代，适合专业博客",
    },
    { name: "笔记本", file: "icon-notebook.svg", desc: "内容创作，青色渐变" },
    { name: "羽毛笔", file: "icon-feather.svg", desc: "写作主题，紫粉渐变" },
    { name: "书本", file: "icon-book.svg", desc: "知识分享，绿青渐变" },
    { name: "代码", file: "icon-code.svg", desc: "技术博客，橙红渐变" },
    { name: "火箭", file: "icon-rocket.svg", desc: "现代快速，蓝紫渐变" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          图标预览
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          选择一个你喜欢的图标，然后重命名为{" "}
          <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            icon.svg
          </code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {icons.map((icon) => (
            <div
              key={icon.file}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex flex-col items-center">
                {/* 大图标预览 */}
                <div className="w-32 h-32 mb-4 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    src={`/${icon.file}`}
                    alt={icon.name}
                    className="w-24 h-24"
                  />
                </div>

                {/* 小图标预览（实际大小） */}
                <div className="flex gap-2 mb-4">
                  <img
                    src={`/${icon.file}`}
                    alt={icon.name}
                    className="w-8 h-8"
                  />
                  <img
                    src={`/${icon.file}`}
                    alt={icon.name}
                    className="w-6 h-6"
                  />
                  <img
                    src={`/${icon.file}`}
                    alt={icon.name}
                    className="w-4 h-4"
                  />
                </div>

                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  {icon.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {icon.desc}
                </p>

                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-gray-700 dark:text-gray-300">
                  {icon.file}
                </code>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-100">
            如何使用
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>选择一个你喜欢的图标</li>
            <li>
              重命名文件：
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded mx-1">
                mv icon-notebook.svg icon.svg
              </code>
            </li>
            <li>刷新浏览器（Ctrl+Shift+R 强制刷新）</li>
            <li>查看浏览器标签页的新图标</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
