"use client";

import { useEffect } from "react";

const FRAMES = [
  "PDF Studio",
  "PDF Studio ·",
  "PDF Studio ··",
  "PDF Studio ···",
  "PDF Studio ··",
  "PDF Studio ·",
];

export function DocumentTitle() {
  useEffect(() => {
    let i = 0;
    document.title = FRAMES[0];

    const id = window.setInterval(() => {
      i = (i + 1) % FRAMES.length;
      document.title = FRAMES[i];
    }, 700);

    return () => {
      window.clearInterval(id);
      document.title = "PDF Studio";
    };
  }, []);

  return null;
}
