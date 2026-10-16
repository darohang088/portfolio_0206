"use client";

import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function Blogs() {
  const { posts } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="blogs">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("Blogs")}</p>
          <h2>{t("Notes from the dev log")}</h2>
          <p className="lede">{t("Write-ups on building Android and Flutter apps. The first posts are on the way.")}</p>
        </div>
        <div className="posts">
          {posts.map((p, i) => {
            const body = (
              <>
                <div className="post-top">
                  <span className={`chip ${p.url ? "latest" : "soon"}`}>{p.url ? t("New post") : t("Coming soon")}</span>
                  <span className="post-tag">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
                {p.url && <span className="read">{t("Read post ▶")}</span>}
              </>
            );
            return p.url ? (
              <a className="post" href={p.url} key={i} data-reveal target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            ) : (
              <article className="post" key={i} data-reveal>
                {body}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
