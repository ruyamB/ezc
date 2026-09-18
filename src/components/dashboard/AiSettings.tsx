"use client";
import { useEffect, useState } from "react";
import { Brain, Check, Eye, EyeSlash, Trash } from "@phosphor-icons/react";
import { getGroqKey, setGroqKey } from "@/lib/ai";

export default function AiSettings() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const k = getGroqKey();
    setSaved(!!k);
    if (k) setKey(k);
  }, []);

  const save = () => {
    setGroqKey(key);
    setSaved(!!key.trim());
    setOk(true);
    setTimeout(() => setOk(false), 1600);
  };

  return (
    <div className="rounded-[20px] border border-line bg-card p-5 dark:border-white/10 dark:bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream dark:bg-white/5">
            <Brain size={22} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold tracking-tight">
              AI code generation {saved ? <span className="ml-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-deep dark:bg-emerald-400/10 dark:text-emerald-300">key saved</span> : <span className="ml-1 rounded-full bg-paper px-2.5 py-0.5 font-mono2 text-[11px] font-bold text-muted dark:bg-white/5 dark:text-fog">local mode</span>}
            </p>
            <p className="text-[13px] text-muted dark:text-fog">
              Paste a Groq key and Run writes smarter Solidity. No key? The local engine still works.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="gsk_… (console.groq.com → API Keys)"
            className="ez-input w-full border border-line bg-paper px-3.5 py-2.5 pr-11 font-mono2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
          />
          <button
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide key" : "Show key"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-line dark:text-fog dark:hover:bg-white/10"
          >
            {show ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="ez-btn flex items-center gap-1.5 bg-ink px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-forest active:scale-[0.98] dark:bg-mist dark:text-ink dark:hover:bg-emerald-200">
            {ok ? <Check size={15} weight="regular" /> : null} {ok ? "Saved" : "Save key"}
          </button>
          {saved && (
            <button
              onClick={() => { setKey(""); setGroqKey(""); setSaved(false); }}
              className="ez-btn flex items-center gap-1.5 border border-line bg-white px-4 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-red-400/10"
            >
              <Trash size={14} weight="regular" /> Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted dark:text-fog">
        Key stays in this browser and is sent only to our <span className="font-mono2">/api/generate</span> endpoint, which forwards it to Groq.
        Free tier at <a className="font-bold text-accent-deep underline dark:text-emerald-400" href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a>.
        Fair use: 10 generations/minute per person.
      </p>
    </div>
  );
}
