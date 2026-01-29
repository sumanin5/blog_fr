import React from "react";

export function GlobalBackground() {
  return (
    <>
      <div className="fixed inset-0 bg-background -z-50" />

      {/* 1. 浅色模式背景：清爽的科技几何线条 */}
      <div
        className="fixed inset-0 z-[-49] opacity-100 transition-opacity dark:opacity-0 pointer-events-none"
        style={{
          // 浅色模式：极简科技网格
          backgroundImage: `url('/images/backgrounds/light-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // 使用 Mask Image 让图片边缘自然淡出，融入背景，而不是简单地盖一层白色
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* 2. 暗色模式背景：深邃星空地球 */}
      <div
        className="fixed inset-0 z-[-49] opacity-0 transition-opacity dark:opacity-50 pointer-events-none"
        style={{
          backgroundImage: `url('/images/backgrounds/dark-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
    </>
  );
}
