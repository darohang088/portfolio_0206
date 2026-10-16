import type { Metadata, Viewport } from "next";
import { Noto_Sans_Khmer, Pixelify_Sans, Silkscreen } from "next/font/google";
import { profile } from "@/data/profile";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

const khmer = Noto_Sans_Khmer({
  subsets: ["khmer"],
  weight: ["400", "700"],
  variable: "--font-khmer",
  display: "swap",
});

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);if(localStorage.getItem("lang")==="km")document.documentElement.lang="km"}catch(e){}`;

export const metadata: Metadata = {
  title: `${profile.name} · Android & Flutter Engineer`,
  description: `${profile.name}, Android Development Engineer and Flutter & native developer in Phnom Penh, Cambodia.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${silkscreen.variable} ${pixelify.variable} ${khmer.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme and language before the page paints, so they never flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
