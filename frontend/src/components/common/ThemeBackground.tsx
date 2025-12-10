/**
 * 🎨 主题背景组件
 *
 * 功能：
 * - 提供深色/浅色主题的背景渐变
 * - 使用光点点缀替代网格，性能更优
 * - 通过 opacity 过渡实现无闪烁切换
 * - GPU 硬件加速，流畅度极高
 *
 * 性能优化：
 * - 使用固定定位 + GPU 加速
 * - 简化渐变层数（单层渐变）
 * - 用光点替代复杂网格
 */
export function ThemeBackground() {
  return (
    <>
      {/* 浅色背景层 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-300 dark:opacity-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(200, 200, 200, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% 50%,
              rgba(255, 255, 255, 0.9) 0%,
              rgba(220, 220, 220, 0.3) 60%,
              rgba(180, 180, 180, 0.1) 100%)
          `,
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
      >
        {/* 光点点缀 - 浅色模式 */}
        <div className="absolute top-[15%] left-[10%] h-2 w-2 rounded-full bg-gray-400/20 blur-sm" />
        <div className="absolute top-[25%] right-[15%] h-3 w-3 rounded-full bg-gray-300/30 blur-md" />
        <div className="absolute bottom-[30%] left-[70%] h-2 w-2 rounded-full bg-gray-400/20 blur-sm" />
        <div className="absolute right-[25%] bottom-[20%] h-4 w-4 rounded-full bg-gray-300/25 blur-lg" />
      </div>

      {/* 深色背景层 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-0 transition-opacity duration-300 dark:opacity-100"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(100, 100, 100, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(150, 150, 150, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 85% 85% at 50% 50%,
              rgba(60, 60, 60, 0.3) 0%,
              rgba(40, 40, 40, 0.2) 50%,
              rgba(0, 0, 0, 0.5) 100%)
          `,
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
      >
        {/* 光点点缀 - 深色模式 */}
        <div className="absolute top-[20%] left-[15%] h-3 w-3 rounded-full bg-white/5 blur-md" />
        <div className="absolute top-[30%] right-[20%] h-4 w-4 rounded-full bg-white/8 blur-lg" />
        <div className="absolute bottom-[25%] left-[65%] h-2 w-2 rounded-full bg-white/6 blur-sm" />
        <div className="absolute right-[30%] bottom-[35%] h-5 w-5 rounded-full bg-white/4 blur-xl" />
        <div className="absolute top-[50%] left-[40%] h-3 w-3 rounded-full bg-white/5 blur-lg" />
      </div>
    </>
  );
}
