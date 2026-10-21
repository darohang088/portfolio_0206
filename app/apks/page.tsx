import type { Metadata } from "next";
import AllApks from "@/components/AllApks";

export const metadata: Metadata = {
  title: "All APKs",
  description: "Download test builds of Android apps.",
  robots: { index: false, follow: false },
};

// Public list of shared test builds (Build Share). The owner hides private builds from it.
export default function Page() {
  return (
    <main className="ip-page">
      <AllApks />
    </main>
  );
}
