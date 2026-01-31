import { ImageResponse } from "next/og";

// 图标配置
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// 动态生成图标
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "linear-gradient(to bottom right, #3b82f6, #8b5cf6)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "20%",
        }}
      >
        B
      </div>
    ),
    {
      ...size,
    }
  );
}
