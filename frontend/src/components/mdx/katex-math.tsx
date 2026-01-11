import React from "react";
import katex from "katex";

export const KatexMath = ({
  latex,
  isBlock,
}: {
  latex: string;
  isBlock: boolean;
}) => {
  // 在服务端直接渲染 KaTeX
  let html = "";
  try {
    html = katex.renderToString(latex, {
      displayMode: isBlock,
      throwOnError: false,
    });
  } catch (err) {
    console.error("KaTeX error", err);
    html = `<span class="text-destructive">Math Error: ${latex}</span>`;
  }

  return React.createElement(isBlock ? "div" : "span", {
    className: isBlock ? "math-block" : "math-inline",
    dangerouslySetInnerHTML: { __html: html },
  });
};
