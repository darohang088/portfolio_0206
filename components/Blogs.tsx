import { posts } from "@/data/profile";

export default function Blogs() {
  return (
    <section className="block" id="blogs">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Blogs</p>
          <h2>Notes from the dev log</h2>
          <p className="lede">Write-ups on building Android and Flutter apps. The first posts are on the way.</p>
        </div>
        <div className="posts">
          {posts.map((p) => {
            const body = (
              <>
                <div className="post-top">
                  <span className={`chip ${p.url ? "latest" : "soon"}`}>{p.url ? "New post" : "Coming soon"}</span>
                  <span className="post-tag">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
                {p.url && <span className="read">Read post ▶</span>}
              </>
            );
            return p.url ? (
              <a className="post" href={p.url} key={p.title} data-reveal target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            ) : (
              <article className="post" key={p.title} data-reveal>
                {body}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
