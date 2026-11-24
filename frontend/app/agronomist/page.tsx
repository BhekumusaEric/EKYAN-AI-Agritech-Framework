"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Send, ShieldAlert, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusNotice } from "@/components/ui/status-notice";

interface Message {
  role: "farmer" | "assistant";
  text: string;
  ts: string;
}

const SUGGESTIONS = [
  "Mimea yangu ina madoa mekundu",
  "I need poultry vaccines",
  "My chickens look unwell",
  "I need feed for my farm",
];

const SYNTHETIC_ID = /^synthetic-[a-z0-9-]+$/i;

export default function AgronomistPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [participantId, setParticipantId] = useState("synthetic-demo-001");
  const [invalidId, setInvalidId] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function timestamp() {
    return new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  }

  function send(text = input) {
    const message = text.trim();
    if (!message) return;
    if (!SYNTHETIC_ID.test(participantId.trim())) {
      setInvalidId(true);
      return;
    }

    setInvalidId(false);
    setInput("");
    const ts = timestamp();
    setMessages((current) => [
      ...current,
      { role: "farmer", text: message, ts },
      {
        role: "assistant",
        text: "No verified Ask Nia source is connected in this prototype, so I will not generate agricultural guidance. Please route this question to a qualified extension officer.",
        ts,
      },
    ]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1440px] gap-5 p-4 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-9">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Sprout aria-hidden="true" size={20} />
            </span>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Ask Nia · advisory bridge</h1>
              <p className="mt-0.5 text-xs text-slate-500">Mock adapter · Busia poultry pilot</p>
            </div>
          </div>
          <Badge variant={messages.length ? "warning" : "neutral"}>
            {messages.length ? "Needs human review" : "Mock · no source"}
          </Badge>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:grid-cols-2 sm:px-6">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Synthetic participant ID
            <input
              value={participantId}
              onChange={(event) => {
                setParticipantId(event.target.value);
                setInvalidId(false);
              }}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              aria-invalid={invalidId || !SYNTHETIC_ID.test(participantId.trim())}
            />
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Pilot context
            <input
              value="Busia · Poultry"
              readOnly
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-normal normal-case tracking-normal text-slate-700"
            />
          </label>
        </div>

        <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {messages.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Bot aria-hidden="true" size={27} />
              </span>
              <div>
                <p className="font-semibold text-slate-800">Test the advisory hand-off</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">
                  Ask a sample question. Without a verified source, this preview declines to answer and points to a human.
                </p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="min-h-10 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.ts}-${index}`} className={`flex gap-3 ${message.role === "farmer" ? "flex-row-reverse" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "farmer" ? "bg-brand-900 text-xs font-semibold text-white" : "bg-brand-50 text-brand-700"}`}>
                {message.role === "farmer" ? "F" : <Sprout aria-hidden="true" size={16} />}
              </span>
              <div className={`flex max-w-[82%] flex-col gap-1.5 ${message.role === "farmer" ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "farmer" ? "rounded-tr-sm bg-brand-900 text-white" : "rounded-tl-sm border border-amber-200 bg-amber-50 text-amber-950"}`}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.role === "assistant" && (
                    <div className="mt-3 border-t border-amber-200 pt-2 text-xs leading-5">
                      <p><strong>Source:</strong> None returned · Ask Nia adapter not connected</p>
                      <p><strong>Confidence:</strong> Unavailable · human review required</p>
                      <Link href="/blockers" className="mt-2 inline-flex min-h-9 items-center font-semibold text-brand-800 underline underline-offset-2">
                        Prepare an extension blocker
                      </Link>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{message.ts}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} className="border-t border-slate-100 bg-white p-4 sm:px-6 sm:py-5">
          {invalidId && (
            <p role="alert" className="mb-2 text-xs text-rose-700">
              Use a synthetic ID beginning with synthetic-.
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Write a synthetic message in English or Kiswahili…"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              aria-label="Synthetic message"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="hidden sm:inline">Send</span>
              <Send aria-hidden="true" size={16} />
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <StatusNotice tone="warning" title="No verified advice source is configured">
          The mock deliberately returns no agronomic instruction. Connect approved Ask Nia material before showing answers or citations.
        </StatusNotice>
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <div>
            <p className="text-sm font-semibold">Synthetic data only</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              Do not enter real participant, financial, or location details. This mock does not send messages to an API.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-800">Human-in-the-loop rules</h2>
          <ul className="mt-3 space-y-3 text-xs leading-5 text-slate-600">
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />Answers require an approved source and confidence.</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />Low confidence or no source must be escalated.</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />Never invent dosage or veterinary instructions.</li>
          </ul>
          <p className="mt-4 flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowUpRight aria-hidden="true" size={13} /> Advisory is not a professional diagnosis.
          </p>
        </div>
      </aside>
    </div>
  );
}
