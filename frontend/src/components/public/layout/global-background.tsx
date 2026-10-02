import React from "react";

export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      {/* 1. 基础语义背景底色：浅色温润白，深色黑曜深翠（告别死黑） */}
      <div className="absolute inset-0 bg-[#F8FAF9] dark:bg-[#080D0A] transition-colors duration-500" />

      {/* 2. 浅色模式光晕：右上角晨露般的薄荷/鼠尾草绿轻柔漫反射 */}
      <div className="absolute -top-32 -right-20 w-[600px] h-[500px] bg-emerald-500/8 blur-[140px] rounded-full dark:opacity-0 transition-opacity duration-700" />
      <div className="absolute top-1/2 -left-32 w-[500px] h-[450px] bg-teal-500/5 blur-[120px] rounded-full dark:opacity-0 transition-opacity duration-700" />

      {/* 3. 暗色模式极光微光：顶部与局部的深林翡翠微光 (Forest Aurora) */}
      <div className="absolute -top-40 left-1/3 -translate-x-1/2 w-[700px] h-[450px] bg-emerald-500/12 blur-[150px] rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700" />
      <div className="absolute top-2/3 right-10 w-[500px] h-[400px] bg-teal-600/10 blur-[130px] rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700" />

      {/* 4. 矢量微细网格纹理：纯 SVG 现代微点阵，提供通透科技与空间质感 */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, #000 70%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, #000 70%, transparent 100%)",
        }}
      />
    </div>
  );
}
