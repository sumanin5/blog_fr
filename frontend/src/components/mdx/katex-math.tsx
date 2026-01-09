"use client";

import React, { useEffect, useRef } from "react";

export const KatexMath = ({
  latex,
  isBlock,
}: {
  latex: string;
  isBlock: boolean;
}) => {
  // Use a generic HTMLElement ref since it could be a div or span
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    const element = ref.current;
    if (!element) return;

    const renderMath = async () => {
      try {
        const katex = (await import("katex")).default;
        if (!isMounted) return;

        katex.render(latex, element, {
          displayMode: isBlock,
          throwOnError: false,
        });
      } catch (err) {
        console.error("KaTeX error", err);
      }
    };
    renderMath();
    return () => {
      isMounted = false;
    };
  }, [latex, isBlock]);

  return React.createElement(isBlock ? "div" : "span", {
    ref,
    className: isBlock ? "math-block" : "math-inline",
  });
};
