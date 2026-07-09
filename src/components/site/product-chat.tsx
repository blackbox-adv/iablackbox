"use client";

import { useAiChat, type ChatMessage } from "@/hooks/use-blackbox";
import { Sparkles, Send, Loader2, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  { label: "¿Vale la pena comprarlo?", icon: "🤔" },
  { label: "¿Quién debería comprarlo?", icon: "🎯" },
  { label: "¿Cuál es la mejor tienda?", icon: "🛒" },
  { label: "¿Conviene esperar una oferta?", icon: "⏳" },
  { label: "¿Qué ventajas tiene?", icon: "✅" },
  { label: "¿Ha bajado de precio?", icon: "📉" },
];

export function ProductChat({ productId }: { productId: string }) {
  const chat = useAiChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat.isPending]);

  const ask = async (question: string) => {
    if (!question.trim() || chat.isPending) return;
    const userMsg: ChatMessage = { role: "user", content: question.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    try {
      const res = await chat.mutateAsync({
        productId,
        question: question.trim(),
        history: messages.slice(-4),
      });
      setMessages([...newMessages, { role: "assistant", content: res.answer }]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Lo siento, no pude responder ahora. Intenta de nuevo.",
        },
      ]);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.06] via-card/40 to-card/40 shadow-soft">
      <div className="pointer-events-none absolute -top-20 -right-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 animate-pulse-glow">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Pregúntale a BLACKBOX IA</h2>
            <p className="text-[11px] text-muted-foreground">Tu asesor de compras inteligente</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setIsOpen(false);
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="relative p-6">
        {/* Messages */}
        {messages.length > 0 && (
          <div ref={scrollRef} className="mb-4 max-h-80 space-y-4 overflow-y-auto scrollbar-thin pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-3 animate-fade-up", m.role === "user" && "flex-row-reverse")}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    m.role === "user"
                      ? "bg-muted/40 text-muted-foreground"
                      : "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  {m.role === "user" ? "Tú" : <Sparkles className="h-4 w-4" />}
                </span>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-emerald-500/10 text-foreground"
                      : "bg-card/60 text-foreground/90 backdrop-blur-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex gap-3 animate-fade-in">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
                <div className="rounded-2xl bg-card/60 px-4 py-3 backdrop-blur-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested questions — show when no messages or collapsed */}
        {messages.length === 0 && (
          <div className="mb-5">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Preguntas frecuentes
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => ask(q.label)}
                  disabled={chat.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3.5 py-2 text-xs text-foreground/80 backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:bg-emerald-400/5 hover:text-foreground disabled:opacity-50"
                >
                  <span aria-hidden>{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={onSubmit} className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            disabled={chat.isPending}
            className="h-12 w-full rounded-2xl border border-border/50 bg-background/40 px-4 pr-14 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm transition-all focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || chat.isPending}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-emerald-500 text-emerald-950 shadow-soft transition-all hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500"
            aria-label="Enviar"
          >
            {chat.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
