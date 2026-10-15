"use client";

import { useEffect, useRef } from "react";
import type { Palette } from "@/lib/sprites";

type Props = {
  rows: string[];
  palette: Palette;
  className?: string;
};

export default function PixelSprite({ rows, palette, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;

  useEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, width, height);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    });
  }, [rows, palette, width, height]);

  return <canvas ref={ref} width={width} height={height} className={className} aria-hidden="true" />;
}
