import { profile } from "@/data/profile";

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <span>
          © {new Date().getFullYear()} {profile.name} · Built pixel by pixel
        </span>
        <span className="press">Press start to continue</span>
      </div>
    </footer>
  );
}
