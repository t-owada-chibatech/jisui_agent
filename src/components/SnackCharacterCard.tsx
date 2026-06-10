"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";

export type SnackStatus = "slim" | "normal" | "chubby" | "fat" | "very_fat";

export function getSnackCharacterStatus(amount: number): SnackStatus {
  if (amount < 500)  return "slim";
  if (amount < 1500) return "normal";
  if (amount < 3000) return "chubby";
  if (amount < 5000) return "fat";
  return "very_fat";
}

const STATUS_INFO: Record<SnackStatus, { label: string; comment: string; labelCls: string }> = {
  slim:     { label: "スリム",     comment: "いい感じ！お菓子の買いすぎを抑えられています",              labelCls: "bg-green-100 text-green-700" },
  normal:   { label: "ふつう",     comment: "バランスよく管理できています",                            labelCls: "bg-blue-100 text-blue-700" },
  chubby:   { label: "ぽっちゃり", comment: "少しお菓子が増えてきたかも",                              labelCls: "bg-yellow-100 text-yellow-700" },
  fat:      { label: "ぽてぽて",   comment: "今月はお菓子が多めです",                                  labelCls: "bg-orange-100 text-orange-700" },
  very_fat: { label: "まんまる",   comment: "かなり買っています。次の買い物では少し控えてみましょう", labelCls: "bg-red-100 text-red-700" },
};

const BODY: Record<SnackStatus, { w: number; h: number; bg: string; radius: string }> = {
  slim:     { w: 56,  h: 78,  bg: "#FFE0A3", radius: "50% 50% 50% 50% / 62% 62% 38% 38%" },
  normal:   { w: 74,  h: 76,  bg: "#FFD189", radius: "50%" },
  chubby:   { w: 92,  h: 88,  bg: "#FFC46A", radius: "50%" },
  fat:      { w: 112, h: 102, bg: "#FFB347", radius: "50%" },
  very_fat: { w: 136, h: 120, bg: "#FF9F2E", radius: "50%" },
};

const EYE_H:    Record<SnackStatus, number> = { slim: 9, normal: 9, chubby: 6, fat: 4, very_fat: 3 };
const EYE_GAP:  Record<SnackStatus, number> = { slim: 10, normal: 14, chubby: 18, fat: 22, very_fat: 26 };
const CHEEK_OP: Record<SnackStatus, number> = { slim: 0, normal: 0, chubby: 0.5, fat: 0.72, very_fat: 0.92 };

type MouthShape = "big-smile" | "smile" | "small-smile" | "flat" | "frown";
const MOUTH_SHAPE: Record<SnackStatus, MouthShape> = {
  slim: "big-smile", normal: "smile", chubby: "small-smile", fat: "flat", very_fat: "frown",
};

const BODY_TRANSITION = "width 0.8s ease, height 0.8s ease, background-color 0.8s ease, border-radius 0.8s ease";

function mouthStyle(shape: MouthShape): React.CSSProperties {
  const t = { transition: "all 0.8s ease", background: "transparent" };
  switch (shape) {
    case "big-smile":   return { ...t, width: 24, height: 11, border: "2.5px solid #555", borderTop: "none",    borderRadius: "0 0 24px 24px" };
    case "smile":       return { ...t, width: 20, height: 9,  border: "2.5px solid #555", borderTop: "none",    borderRadius: "0 0 18px 18px" };
    case "small-smile": return { ...t, width: 16, height: 7,  border: "2px solid #555",   borderTop: "none",    borderRadius: "0 0 12px 12px" };
    case "flat":        return { ...t, width: 16, height: 2.5, background: "#555",         borderRadius: "2px" };
    case "frown":       return { ...t, width: 14, height: 6,  border: "2px solid #555",   borderBottom: "none", borderRadius: "12px 12px 0 0" };
  }
}

export function SnackCharacterCard({ snackAmount }: { snackAmount: number }) {
  const target = getSnackCharacterStatus(snackAmount);
  const [status, setStatus] = useState<SnackStatus>("slim");

  useEffect(() => {
    const t = setTimeout(() => setStatus(target), 80);
    return () => clearTimeout(t);
  }, [target]);

  const body    = BODY[status];
  const info    = STATUS_INFO[status];
  const eyeH    = EYE_H[status];
  const eyeGap  = EYE_GAP[status];
  const cheekOp = CHEEK_OP[status];
  const cheekW  = body.w * 0.22;
  const cheekH  = cheekW * 0.6;

  const eyeEl: React.CSSProperties = {
    width: 9,
    height: eyeH,
    borderRadius: eyeH <= 4 ? "2px" : "50%",
    background: "#333",
    transition: "all 0.8s ease",
    flexShrink: 0,
  };

  const cheekBase: React.CSSProperties = {
    position: "absolute",
    top: "56%",
    transform: "translateY(-50%)",
    width: cheekW,
    height: cheekH,
    borderRadius: "50%",
    background: "rgba(255, 100, 80, 0.28)",
    opacity: cheekOp,
    transition: "all 0.8s ease",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>おやつバランス</CardTitle>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info.labelCls}`}>
          {info.label}
        </span>
      </CardHeader>

      {/* キャラクター — 親要素でfloat、子要素で体型変化（transform干渉防止） */}
      <div className="flex items-center justify-center" style={{ height: 160 }}>
        <div className="snack-float">
          <div
            style={{
              width: body.w,
              height: body.h,
              borderRadius: body.radius,
              background: body.bg,
              position: "relative",
              overflow: "hidden",
              transition: BODY_TRANSITION,
            }}
          >
            {/* 頬 */}
            <div style={{ ...cheekBase, left: "4%" }} />
            <div style={{ ...cheekBase, right: "4%" }} />

            {/* 目・口 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: "8%",
              }}
            >
              <div style={{ display: "flex", gap: eyeGap, transition: "gap 0.8s ease" }}>
                <div style={eyeEl} />
                <div style={eyeEl} />
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={mouthStyle(MOUTH_SHAPE[status])} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* テキスト情報 */}
      <div className="text-center space-y-1 mt-1">
        <p className="text-xl font-bold text-gray-900">
          {formatCurrency(snackAmount)}
          <span className="text-sm font-normal text-gray-400 ml-1">/ 今月</span>
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">{info.comment}</p>
      </div>
    </Card>
  );
}
