"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "farmer" | "bot";
  text: string;
  blocker?: string | null;
  language?: string;
  ts: string;
}

const COUNTIES = ["Kirinyaga", "Busia", "Kisumu", "Samburu", "Nakuru", "Kakamega", "Unknown"];

const SUGGESTIONS = [
  "Mimea yangu ina madoa mekundu",
  "I need a loan for seeds",
  "Bei ya nyanya ni ngapi leo?",
  "My crops are wilting from drought",
];

export default function AgronomistPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [county, setCounty]     = useState("Kirinyaga");
  const [phone, setPhone]       = useState("+254700000000");
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState<"idle" | "ok" | "error">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function ts() {
    return new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "farmer", text: msg, ts: ts() }]);
    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/agronomist/api/v1/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farmer_phone: phone, message: msg, county }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((m) => [...m, {
        role: "bot",
        text: data.reply,
        blocker: data.blocker_detected,
        language: data.language,
        ts: ts(),
      }]);
      setStatus("ok");
    } catch (e) {
      setMessages((m) => [...m, {
        role: "bot",
        text: "⚠️ Cannot reach the backend.\n\nMake sure FastAPI is running:\n  cd src && uvicorn main:app --reload --port 8000",
        ts: ts(),
      }]);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Full viewport height minus the parent's padding — use dvh so mobile works too */
    <div className="flex flex-col" style={{ height: "100dvh" }}>

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between border-b border-border bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Daktari wa Mimea 🌿</h1>
          <p className="text-xs text-gray-400 mt-0.5">AI Pocket Agronomist · WhatsApp Bot Test Console</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
          status === "ok"    ? "bg-green-50 text-unicef-green" :
          status === "error" ? "bg-red-50 text-unicef-red"    :
                               "bg-unicef-pale text-unicef-navy"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            status === "ok" ? "bg-unicef-green animate-pulse" :
            status === "error" ? "bg-unicef-red" : "bg-unicef-blue"
          }`} />
          {status === "ok" ? "Connected" : status === "error" ? "Error" : "Ready"}
        </span>
      </div>

      {/* ── Session controls ── */}
      <div className="shrink-0 grid grid-cols-2 gap-3 border-b border-border bg-surface px-6 py-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Farmer Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-unicef-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            County
          </label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-unicef-blue"
          >
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-unicef-pale text-3xl">
              🌿
            </div>
            <div>
              <p className="font-semibold text-gray-700">Karibu! Message Daktari wa Mimea</p>
              <p className="text-sm text-gray-400 mt-1">Ask in Swahili or English</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-white px-4 py-2 text-xs text-gray-600 hover:border-unicef-blue hover:text-unicef-navy transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "farmer" ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
              m.role === "farmer" ? "bg-unicef-blue text-white" : "bg-unicef-pale text-unicef-navy"
            }`}>
              {m.role === "farmer" ? "F" : "🌿"}
            </div>

            {/* Bubble */}
            <div className={`max-w-[70%] ${m.role === "farmer" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "farmer"
                  ? "bg-unicef-blue text-white rounded-tr-sm"
                  : "bg-white border border-border text-gray-800 rounded-tl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
              <div className={`flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 ${
                m.role === "farmer" ? "justify-end" : "justify-start"
              }`}>
                <span>{m.ts}</span>
                {m.blocker && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                    Blocker: {m.blocker}
                  </span>
                )}
                {m.language && (
                  <span className="rounded-full bg-unicef-pale px-2 py-0.5 font-semibold text-unicef-navy">
                    {m.language}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-unicef-pale flex items-center justify-center text-xs">🌿</div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-border px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-unicef-blue animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-border bg-white px-6 py-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type in Swahili or English…"
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-unicef-blue disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-unicef-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-unicef-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          Simulates a WhatsApp message · Same endpoint handles real Meta webhook events
        </p>
      </div>
    </div>
  );
}
