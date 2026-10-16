"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// A plain black-on-white QR code for a link (always dark on light so every phone camera reads it).
export default function QrImage({ text, size = 220, alt }: { text: string; size?: number; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { margin: 2, width: size * 2, errorCorrectionLevel: "M" }).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
  }, [text, size]);
  if (!src) return <span className="qr-img" style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr-img" src={src} width={size} height={size} alt={alt} />;
}
