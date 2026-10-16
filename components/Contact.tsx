"use client";

import BlinkingPhone from "./BlinkingPhone";
import CopyButton from "./CopyButton";
import TypedLine from "./TypedLine";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function Contact() {
  const { profile } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="contact">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("New quest available")}</p>
          <h2>{t("Let's build your next app")}</h2>
        </div>
        <div className="dialog" data-reveal>
          <div className="portrait">
            <BlinkingPhone />
          </div>
          <div>
            <span className="speaker">DARO</span>
            <TypedLine text={t("Looking for an Android or Flutter engineer who ships apps from scratch? Pick an option below and let's team up.")} />
            <ul className="choices">
              <li className="choice">
                <b>{t("Email")}</b>
                <span className="val" id="email">
                  {profile.email}
                </span>
                <CopyButton text={profile.email} targetId="email" />
              </li>
              <li className="choice">
                <b>LinkedIn</b>
                <a className="val" href={profile.linkedin.url} target="_blank" rel="noopener noreferrer">
                  {profile.linkedin.label}
                </a>
              </li>
              <li className="choice">
                <b>{t("Base")}</b>
                <span className="val">{profile.location}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
