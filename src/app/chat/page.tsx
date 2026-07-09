"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bookmark, RotateCcw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authFetch } from "@/lib/auth/authFetch";
import { ChatMessage } from "@/types";

const CHAT_HINT = "例: 「前に作った適当レシピを登録したい」と話しかけてみてください。AIが1つずつ質問します";
const CHAT_PLACEHOLDER = "AIの質問に答えてください";

function ChatPageInner() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setError("");
    const userText = input;
    setInput("");
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId: sessionId ?? "",
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await authFetch("/api/chat/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");

      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId ?? `local-reply-${Date.now()}`,
          sessionId: data.sessionId,
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (msg: ChatMessage) => {
    setSavingId(msg.id);
    setError("");
    try {
      const res = await authFetch("/api/recipes/extract-casual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantMessage: msg.content, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");
      setSavedIds((prev) => new Set(prev).add(msg.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setSessionId(undefined);
    setError("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AIレシピ相談</h2>
          <p className="text-sm text-gray-500 mt-0.5">自分が作ったことのある適当レシピを、AIと話しながら登録できます</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleNewSession}>
          <RotateCcw size={14} />
          新しい相談を始める
        </Button>
      </div>

      <Card className="min-h-[50vh] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[55vh] pr-1">
          {messages.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              <MessageCircle size={28} className="mx-auto mb-2 text-gray-200" />
              {CHAT_HINT}
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleSaveRecipe(msg)}
                      disabled={savingId === msg.id || savedIds.has(msg.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Bookmark size={11} />
                      {savedIds.has(msg.id)
                        ? "保存済み"
                        : savingId === msg.id
                        ? "保存中…"
                        : "このレシピを保存"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-400 rounded-xl px-3 py-2 text-sm">考え中…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={CHAT_PLACEHOLDER}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send size={15} />
            送信
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return <ChatPageInner />;
}
