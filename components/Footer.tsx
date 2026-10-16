"use client";

import { profile } from "@/data/profile";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="wrap foot">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span className="press">{t("Press start to continue")}</span>
      </div>
    </footer>
  );
}
