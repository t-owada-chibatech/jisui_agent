"use client";
import { useState, useRef, useCallback, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Check, AlertCircle, Loader2, Receipt,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { ReceiptDraft, ReceiptItemDraft, ReceiptItemCategory } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ReceiptItemCategory; label: string }[] = [
  { value: "vegetable",   label: "野菜・果物" },
  { value: "meat",        label: "肉類" },
  { value: "fish",        label: "魚・海産物" },
  { value: "egg_dairy",   label: "卵・乳製品" },
  { value: "staple_food", label: "米・麺・パン" },
  { value: "seasoning",   label: "調味料" },
  { value: "drink",       label: "飲み物" },
  { value: "snack",       label: "菓子・スナック" },
  { value: "frozen_food", label: "冷凍食品" },
  { value: "daily_goods", label: "日用品" },
  { value: "other",       label: "その他" },
];

const DB_CATEGORY: Record<ReceiptItemCategory, string> = {
  vegetable:   "野菜",
  meat:        "肉",
  fish:        "魚",
  egg_dairy:   "乳製品",
  staple_food: "穀物",
  seasoning:   "調味料",
  drink:       "その他",
  snack:       "その他",
  frozen_food: "その他",
  daily_goods: "その他",
  other:       "その他",
};

const CATEGORY_COLOR: Record<ReceiptItemCategory, string> = {
  vegetable:   "bg-green-100 text-green-700",
  meat:        "bg-red-100 text-red-700",
  fish:        "bg-blue-100 text-blue-700",
  egg_dairy:   "bg-yellow-100 text-yellow-700",
  staple_food: "bg-amber-100 text-amber-700",
  seasoning:   "bg-purple-100 text-purple-700",
  drink:       "bg-cyan-100 text-cyan-700",
  snack:       "bg-pink-100 text-pink-700",
  frozen_food: "bg-indigo-100 text-indigo-700",
  daily_goods: "bg-gray-100 text-gray-500",
  other:       "bg-gray-100 text-gray-500",
};

type Status = "idle" | "ready" | "analyzing" | "review" | "saving" | "done";

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ReceiptPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addToBudget, setAddToBudget] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // ── File handling ──────────────────────────

  function selectFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以内にしてください");
      return;
    }
    const valid = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!valid.includes(f.type)) {
      setError("JPG・PNG・WebP形式のみ対応しています");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStatus("ready");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analyze ────────────────────────────────

  async function handleAnalyze() {
    if (!file) return;
    setStatus("analyzing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/receipt/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "解析に失敗しました");
      setDraft(json as ReceiptDraft);
      setStatus("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました");
      setStatus("ready");
    }
  }

  // ── Draft editing ──────────────────────────

  function updateItem(id: string, changes: Partial<ReceiptItemDraft>) {
    setDraft((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it) => (it.id === id ? { ...it, ...changes } : it)) }
        : null
    );
  }

  function toggleAll(on: boolean) {
    setDraft((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it) => ({ ...it, addToInventory: it.isFood ? on : false })) }
        : null
    );
  }

  // ── Save ───────────────────────────────────

  async function handleSave() {
    if (!draft) return;
    setStatus("saving");
    setError(null);

    const toAdd = draft.items.filter((it) => it.addToInventory);
    const purchasedAt = draft.purchasedAt ?? new Date().toISOString().split("T")[0];

    try {
      if (toAdd.length > 0) {
        const rows = toAdd.map((it) => ({
          name: it.normalizedName || it.itemName,
          quantity: it.quantity ?? 1,
          unit: it.unit ?? "個",
          price: it.price ?? null,
          purchased_at: purchasedAt,
          expires_at: it.estimatedExpireDays
            ? new Date(Date.now() + it.estimatedExpireDays * 86400000).toISOString().split("T")[0]
            : null,
          category: DB_CATEGORY[it.category],
        }));
        const { error: insertErr } = await supabase.from("ingredients").insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      if (addToBudget) {
        const totalAmount = toAdd.reduce((s, it) => s + (it.price ?? 0), 0);
        if (totalAmount > 0) {
          await supabase.from("budget_records").insert({
            purchased_at: purchasedAt,
            store_name: draft.storeName ?? null,
            category: "食材",
            amount: totalAmount,
            memo: `レシートから自動登録${draft.storeName ? `（${draft.storeName}）` : ""}`,
          });
        }
      }

      setSavedCount(toAdd.length);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setStatus("review");
    }
  }

  // ── Render ─────────────────────────────────

  const selectedCount = draft?.items.filter((it) => it.addToInventory).length ?? 0;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">レシート取込</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          レシート画像をアップロードして、食材を一括登録します
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step: idle / ready ── */}
      {(status === "idle" || status === "ready") && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-emerald-400 bg-emerald-50"
                : status === "ready"
                ? "border-gray-200 bg-gray-50"
                : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {status === "ready" && previewUrl ? (
              <div className="space-y-3">
                <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={previewUrl}
                    alt="レシートプレビュー"
                    width={400}
                    height={600}
                    className="w-full h-auto object-contain"
                    unoptimized
                  />
                </div>
                <p className="text-xs text-gray-500">{file?.name}</p>
                <p className="text-xs text-emerald-600 underline">別の画像を選ぶ</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Upload size={24} className="text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  レシートをドラッグ＆ドロップ
                </p>
                <p className="text-xs text-gray-400">または クリックして選択</p>
                <p className="text-xs text-gray-400">JPG・PNG・WebP / 最大5MB</p>
              </div>
            )}
          </div>

          {status === "ready" && (
            <Button
              onClick={handleAnalyze}
              size="lg"
              className="w-full justify-center"
            >
              <Receipt size={18} />
              AIで解析する
            </Button>
          )}
        </div>
      )}

      {/* ── Step: analyzing ── */}
      {status === "analyzing" && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700">AIがレシートを解析中…</p>
            <p className="text-xs text-gray-400">しばらくお待ちください</p>
          </div>
        </Card>
      )}

      {/* ── Step: review ── */}
      {status === "review" && draft && (
        <div className="space-y-4">
          {/* Receipt meta */}
          <Card>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">店名</p>
                <p className="font-medium">{draft.storeName ?? "不明"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">購入日</p>
                <p className="font-medium">{draft.purchasedAt ?? "不明"}</p>
              </div>
              {draft.totalAmount && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">合計金額</p>
                  <p className="font-medium">{formatCurrency(draft.totalAmount)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Toggle all */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-emerald-700">{selectedCount}品</span>を在庫に追加
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs text-emerald-600 hover:underline"
              >
                食材をすべてON
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                すべてOFF
              </button>
            </div>
          </div>

          {/* Item list */}
          <div className="space-y-2">
            {draft.items.map((item) => (
              <Card key={item.id} className={item.addToInventory ? "" : "opacity-60"}>
                <div className="space-y-2">
                  {/* Row 1: checkbox + name + category + price */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateItem(item.id, { addToInventory: !item.addToInventory })}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        item.addToInventory
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {item.addToInventory && <Check size={12} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          value={item.normalizedName ?? item.itemName}
                          onChange={(e) =>
                            updateItem(item.id, { normalizedName: e.target.value })
                          }
                          className="text-sm font-medium text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-emerald-400 focus:outline-none bg-transparent w-40"
                        />
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[item.category]}`}
                        >
                          {CATEGORY_OPTIONS.find((c) => c.value === item.category)?.label}
                        </span>
                        {!item.isFood && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            食材外
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      {item.price != null ? formatCurrency(item.price) : "—"}
                    </div>
                  </div>

                  {/* Detail toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-8"
                  >
                    {expandedId === item.id ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    詳細を編集
                  </button>

                  {/* Expanded edit fields */}
                  {expandedId === item.id && (
                    <div className="ml-8 grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">カテゴリ</label>
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateItem(item.id, { category: e.target.value as ReceiptItemCategory })
                          }
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">価格（円）</label>
                        <input
                          type="number"
                          value={item.price ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              price: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="例: 198"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">数量</label>
                        <input
                          type="number"
                          value={item.quantity ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              quantity: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="1"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">単位</label>
                        <input
                          type="text"
                          value={item.unit ?? ""}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="個/袋/g..."
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">
                          賞味期限（今日から〇日後）
                        </label>
                        <input
                          type="number"
                          value={item.estimatedExpireDays ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              estimatedExpireDays: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="例: 7（空欄=未設定）"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Budget option */}
          <button
            onClick={() => setAddToBudget((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            {addToBudget ? (
              <ToggleRight size={22} className="text-emerald-500" />
            ) : (
              <ToggleLeft size={22} className="text-gray-400" />
            )}
            食費を家計簿にも登録する
          </button>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={selectedCount === 0}
              size="lg"
              className="flex-1 justify-center"
            >
              <Check size={16} />
              選択した食材を追加（{selectedCount}品）
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("idle");
                setFile(null);
                setPreviewUrl(null);
                setDraft(null);
                setError(null);
              }}
              size="lg"
            >
              やり直す
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: saving ── */}
      {status === "saving" && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700">食材を登録中…</p>
          </div>
        </Card>
      )}

      {/* ── Step: done ── */}
      {status === "done" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={32} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {savedCount}品の食材を追加しました！
              </p>
              {addToBudget && (
                <p className="text-sm text-gray-500 mt-1">家計簿にも登録しました</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push("/ingredients")}>
                食材管理へ
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus("idle");
                  setFile(null);
                  setPreviewUrl(null);
                  setDraft(null);
                  setError(null);
                  setSavedCount(0);
                }}
              >
                別のレシートを読み取る
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
