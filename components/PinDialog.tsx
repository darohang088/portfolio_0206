"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const LEN = 4;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 4-digit PIN prompt. pinHash is the SHA-256 (hex) of the PIN, so the PIN itself isn't in the code.
export default function PinDialog({ title, logo, icon, pinHash, onClose, onUnlock }: { title: string; logo?: string; icon?: string; pinHash: string; onClose: () => void; onUnlock: () => void }) {
  const { t } = useLang();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [ok, setOk] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!dlg.current?.open) dlg.current?.showModal();
  }, []);

  // Focus the first box when the dialog opens and again after a wrong PIN (the boxes are re-created to replay the shake).
  useEffect(() => {
    boxes.current[0]?.focus();
  }, [shake]);

  const check = async (pin: string) => {
    if ((await sha256(pin)) === pinHash) {
      setOk(true);
      setTimeout(onUnlock, 450);
    } else {
      setError(t("Wrong PIN. Try again."));
      setShake((n) => n + 1);
      setDigits(Array(LEN).fill(""));
    }
  };

  const put = (i: number, value: string) => {
    const nums = value.replace(/\D/g, "");
    if (!nums) return;
    const next = [...digits];
    // Typing or pasting several digits fills the following boxes too.
    for (let k = 0; k < nums.length && i + k < LEN; k++) next[i + k] = nums[k];
    setDigits(next);
    setError("");
    const filled = next.findIndex((d) => !d);
    if (filled === -1) check(next.join(""));
    else boxes.current[filled]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) next[i] = "";
      else if (i > 0) {
        next[i - 1] = "";
        boxes.current[i - 1]?.focus();
      }
      setDigits(next);
    } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < LEN - 1) boxes.current[i + 1]?.focus();
  };

  return (
    <dialog
      ref={dlg}
      className="pin-dialog"
      aria-labelledby="pinTitle"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dlg.current?.close()}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={56} height={56} />
      ) : (
        <span className="pin-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 id="pinTitle">{t(title)}</h3>
      <p>{t(logo ? "Enter the 4-digit PIN to open this project." : "Enter the 4-digit PIN to open this tool.")}</p>
      <form
        className={`pin-boxes${error ? " bad" : ""}${ok ? " good" : ""}`}
        key={shake}
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.every(Boolean)) check(digits.join(""));
        }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LEN}
            aria-label={t("PIN digit {n}", { n: i + 1 })}
            value={d}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </form>
      <p className="pin-msg" role="alert">
        {ok ? t("✓ Unlocked") : error}
      </p>
      <button className="mini-tool" type="button" onClick={() => dlg.current?.close()}>
        {t("Cancel")}
      </button>
    </dialog>
  );
}
