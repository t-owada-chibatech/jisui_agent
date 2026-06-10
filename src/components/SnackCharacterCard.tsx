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

// 体のサイズ・形
const BODY: Record<SnackStatus, { w: number; h: number; bg: string; radius: string }> = {
  slim:     { w: 54,  h: 76,  bg: "#F5D7A0", radius: "50% 50% 50% 50% / 60% 60% 40% 40%" },
  normal:   { w: 72,  h: 74,  bg: "#F0C87A", radius: "50%" },
  chubby:   { w: 90,  h: 86,  bg: "#E8B55A", radius: "50%" },
  fat:      { w: 110, h: 100, bg: "#E0A040", radius: "50%" },
  very_fat: { w: 134, h: 116, bg: "#D89030", radius: "50%" },
};

const EYE_W:    Record<SnackStatus, number> = { slim: 11, normal: 11, chubby: 9, fat:  8, very_fat: 7 };
const EYE_H:    Record<SnackStatus, number> = { slim: 10, normal:  9, chubby: 6, fat:  3, very_fat: 2 };
const EYE_GAP:  Record<SnackStatus, number> = { slim: 12, normal: 15, chubby: 19, fat: 23, very_fat: 27 };
const CHEEK_OP: Record<SnackStatus, number> = { slim: 0, normal: 0, chubby: 0.45, fat: 0.65, very_fat: 0.85 };
const EAR_W:    Record<SnackStatus, number> = { slim: 15, normal: 17, chubby: 19, fat: 21, very_fat: 23 };
const EAR_H:    Record<SnackStatus, number> = { slim: 18, normal: 19, chubby: 20, fat: 21, very_fat: 22 };

const BODY_TRANSITION = "width 0.8s ease, height 0.8s ease, background-color 0.8s ease, border-radius 0.8s ease";
const CONTAINER_W = 200; // ひげが出る分、体より広めに固定

export function SnackCharacterCard({ snackAmount }: { snackAmount: number }) {
  const target = getSnackCharacterStatus(snackAmount);
  const [status, setStatus] = useState<SnackStatus>("slim");

  useEffect(() => {
    const t = setTimeout(() => setStatus(target), 80);
    return () => clearTimeout(t);
  }, [target]);

  const body    = BODY[status];
  const info    = STATUS_INFO[status];
  const eyeW    = EYE_W[status];
  const eyeH    = EYE_H[status];
  const eyeGap  = EYE_GAP[status];
  const cheekOp = CHEEK_OP[status];
  const earW    = EAR_W[status];
  const earH    = EAR_H[status];

  // 体の左端オフセット（コンテナ内でセンタリング）
  const bodyLeft = (CONTAINER_W - body.w) / 2;

  // 耳の位置（体の25%・75%の横位置に配置）
  const earSpread = body.w * 0.26;
  const earLX = bodyLeft + body.w / 2 - earSpread - earW / 2;
  const earRX = bodyLeft + body.w / 2 + earSpread - earW / 2;

  const innerEarW = earW * 0.52;
  const innerEarH = earH * 0.52;

  // 目のスタイル
  const eyeStyle = {
    width: eyeW,
    height: eyeH,
    borderRadius: eyeH <= 3 ? "2px" : "40%",
    background: "#2a1a0a",
    transition: "all 0.8s ease",
    flexShrink: 0,
  } as const;

  // 頬のスタイル
  const cheekW = body.w * 0.2;
  const cheekBase = {
    position: "absolute" as const,
    top: "56%",
    transform: "translateY(-50%)",
    width: cheekW,
    height: cheekW * 0.55,
    borderRadius: "50%",
    background: "rgba(220, 90, 70, 0.22)",
    opacity: cheekOp,
    transition: "all 0.8s ease",
  };

  // 猫型の口（2つの曲線を合わせた「w」型）
  const mouthIsHappy = status !== "fat" && status !== "very_fat";
  const mouthBorder = "1.8px solid #554433";
  const mouthHalf = {
    width: 7,
    height: 5,
    transition: "all 0.8s ease",
  };
  const mouthLeft = {
    ...mouthHalf,
    borderRight: mouthBorder,
    borderBottom: mouthIsHappy ? mouthBorder : "none",
    borderTop:    mouthIsHappy ? "none" : mouthBorder,
    borderRadius: mouthIsHappy ? "0 0 5px 0" : "0 5px 0 0",
  };
  const mouthRight = {
    ...mouthHalf,
    borderLeft:   mouthBorder,
    borderBottom: mouthIsHappy ? mouthBorder : "none",
    borderTop:    mouthIsHappy ? "none" : mouthBorder,
    borderRadius: mouthIsHappy ? "0 0 0 5px" : "5px 0 0 0",
  };

  // ひげ（3本ずつ、扇状に広がる）
  const whisker = (angle: number, origin: string) => ({
    width: 16,
    height: 1.5,
    background: "rgba(90, 70, 50, 0.38)",
    borderRadius: "1px",
    transform: `rotate(${angle}deg)`,
    transformOrigin: origin,
    margin: "2.5px 0",
  });

  // 耳（三角形：clip-path）
  const earOuter = (x: number) => ({
    position: "absolute" as const,
    width: earW,
    height: earH,
    background: body.bg,
    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    top: 0,
    left: x,
    transition: "all 0.8s ease",
  });
  const earInner = (x: number) => ({
    position: "absolute" as const,
    width: innerEarW,
    height: innerEarH,
    background: "rgba(255, 155, 165, 0.72)",
    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    top: earH * 0.32,
    left: x + (earW - innerEarW) / 2,
    transition: "all 0.8s ease",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>おやつバランス</CardTitle>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info.labelCls}`}>
          {info.label}
        </span>
      </CardHeader>

      {/* キャラクター表示エリア */}
      <div className="flex items-center justify-center" style={{ height: 170 }}>
        {/* 親要素：上下floatアニメーション */}
        <div className="snack-float">
          {/* 子要素：体型変化（transformと分離）*/}
          <div style={{
            position: "relative",
            width: CONTAINER_W,
            height: body.h + earH * 0.75,
            transition: "height 0.8s ease",
          }}>

            {/* 耳（外側・内側ピンク）*/}
            <div style={earOuter(earLX)} />
            <div style={earOuter(earRX)} />
            <div style={earInner(earLX)} />
            <div style={earInner(earRX)} />

            {/* 体 */}
            <div style={{
              width: body.w,
              height: body.h,
              borderRadius: body.radius,
              background: body.bg,
              position: "absolute",
              bottom: 0,
              left: bodyLeft,
              transition: BODY_TRANSITION,
            }}>
              {/* 頬 */}
              <div style={{ ...cheekBase, left: "5%" }} />
              <div style={{ ...cheekBase, right: "5%" }} />

              {/* 顔 */}
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: "5%",
                gap: 5,
              }}>
                {/* 目 */}
                <div style={{ display: "flex", gap: eyeGap, transition: "gap 0.8s ease" }}>
                  <div style={eyeStyle} />
                  <div style={eyeStyle} />
                </div>

                {/* 鼻 */}
                <div style={{
                  width: 7, height: 5,
                  borderRadius: "50%",
                  background: "#E891A0",
                  transition: "all 0.8s ease",
                }} />

                {/* ひげ ＋ 口 */}
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {/* 左ひげ */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={whisker(-12, "right center")} />
                    <div style={whisker(0,   "right center")} />
                    <div style={whisker(12,  "right center")} />
                  </div>
                  {/* 口（w型） */}
                  <div style={{ display: "flex" }}>
                    <div style={mouthLeft} />
                    <div style={mouthRight} />
                  </div>
                  {/* 右ひげ */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={whisker(12,  "left center")} />
                    <div style={whisker(0,   "left center")} />
                    <div style={whisker(-12, "left center")} />
                  </div>
                </div>
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
