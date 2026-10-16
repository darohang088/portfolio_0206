import type { Metadata } from "next";
import InstallPage from "@/components/InstallPage";

export const metadata: Metadata = {
  title: "Install test build",
  description: "Download a test build of an Android app.",
  robots: { index: false, follow: false },
};

// Opened through short links like /i/k7x2q (the Worker serves this page for them).
export default function Page() {
  return (
    <main className="ip-page">
      <InstallPage />
    </main>
  );
}
