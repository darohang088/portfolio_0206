import { education } from "@/data/profile";

export default function SavePoints() {
  return (
    <section className="block" id="saves">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Save points</p>
          <h2>Education</h2>
        </div>
        <div className="saves">
          {education.map((e) => (
            <div className="save" key={e.title} data-reveal>
              <span className="save-tag">{e.tag}</span>
              <h3>{e.title}</h3>
              <p>{e.school}</p>
              <p className="yrs">{e.years}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
