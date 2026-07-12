import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequestUser } from "@/lib/auth/serverSupabase";

const SYSTEM_PROMPT = `あなたは、大学生が過去に実際に作った「適当レシピ」を聞き取って記録するインタビュアーです。
これはみんなで使う共有レシピ集に登録するためのものです。

進め方（重要）：
- 質問は一度に1つだけ。まとめて何個も聞かない
- 聞く項目の目安（順番）：①料理名 ②使った食材 ③作り方（手順） ④だいたいの費用 ⑤だいたいの調理時間 ⑥雑だけど美味しくするコツ
- ユーザーの返答が短くても、次の項目に自然に進めてよい（無理に深掘りしすぎない）
- 危険な調理（生焼けの肉・卵の加熱不足など）が含まれていたら、やんわり確認・注意する
- 質問している間は、これまで通り自然な日本語の会話文で返答する

必要な項目がひととおり集まったら、それ以降は会話文を一切書かず、次のJSON形式のみを出力してください（説明文・コードブロック記号「\`\`\`」は不要。JSON以外は絶対に出力しない）：
{
  "title": "料理名",
  "description": "一言説明（1〜2文。雑さや手軽さが伝わる表現で）",
  "ingredients": ["食材1（分量つき）", "食材2（分量つき）"],
  "steps": ["手順1", "手順2"],
  "estimated_cost": 目安費用（円・数値のみ）,
  "cooking_time_minutes": 調理時間（分・数値のみ）,
  "difficulty": "easy" または "normal" または "hard",
  "tags": ["節約","時短","ズボラ","レンジ","一人暮らし" などから当てはまるもの]
}`;

const ACK_MESSAGE = "了解しました。作ったレシピについて1つずつ質問していきますね。";

function getMockReply(message: string): string {
  return `(モック応答) 「${message}」ですね。まずはその料理の名前を教えてください！(GEMINI_API_KEYを設定すると、AIが1つずつ質問してレシピを聞き取ります)`;
}

export async function POST(req: NextRequest) {
  try {
    const { client: userSupabase, user } = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await req.json();
    const message: string = body.message;
    let sessionId: string | undefined = body.sessionId;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 });
    }

    // セッションがなければ新規作成（ユーザーとして作成 = RLSを満たす）
    if (!sessionId) {
      const { data: newSession, error: sessionErr } = await userSupabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title: message.slice(0, 30) || "新しいレシピ相談" })
        .select()
        .single();
      if (sessionErr || !newSession) {
        return NextResponse.json({ error: "チャットセッションの作成に失敗しました" }, { status: 500 });
      }
      sessionId = newSession.id;
    }

    // 直近の会話履歴を取得（AIへの文脈用）。新しい順に取ってから時系列順に戻す
    const { data: recentHistory } = await userSupabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20);
    const history = (recentHistory ?? []).slice().reverse();

    // ユーザーメッセージを保存
    await userSupabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: message,
    });

    const reply = await generateReply({
      history: history as { role: string; content: string }[],
      message,
    });

    // AI返答を保存
    const { data: savedReply } = await userSupabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: "assistant",
        content: reply,
      })
      .select()
      .single();

    await userSupabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({
      sessionId,
      reply,
      messageId: savedReply?.id,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    console.error("[chat/recipe]", messageText);
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}

async function generateReply(input: {
  history: { role: string; content: string }[];
  message: string;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return getMockReply(input.message);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // v1 APIは systemInstruction 非対応のため、最初のターンにシステムプロンプトを埋め込む
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: ACK_MESSAGE }] },
        ...input.history.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(input.message);
    return result.response.text();
  } catch (err) {
    console.error("[chat/recipe] Gemini error", err);
    return getMockReply(input.message);
  }
}
