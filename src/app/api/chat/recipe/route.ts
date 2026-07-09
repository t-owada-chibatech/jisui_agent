import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getRequestUser } from "@/lib/auth/serverSupabase";

type ChatMode = "suggest" | "record";

const SYSTEM_PROMPT_SUGGEST = `あなたは一人暮らしの大学生を支援する自炊レシピAIエージェントです。
ユーザーの手持ち食材、予算、調理時間、気分に合わせて、大学生らしい現実的で適当なレシピを提案してください。

方針：
- 節約重視
- 時短重視
- 洗い物少なめ
- 細かい分量にこだわりすぎない
- 家にあるもので何とかする
- レンジ、フライパン、炊飯器で作れるものを優先する
- 難しい調理工程は避ける
- 料理名は少しゆるくて親しみやすくする
- ただし、加熱不足や食中毒リスクのある危険な提案はしない
- 生肉や卵の加熱不足には注意する
- 食品安全上危険な提案は避ける

回答には必要に応じて以下を含めてください。
- レシピ名
- 使う食材
- 作り方
- 目安費用
- 調理時間
- 雑だけどおいしくするコツ`;

const SYSTEM_PROMPT_RECORD = `あなたは、大学生が過去に実際に作った「適当レシピ」を聞き取って記録するインタビュアーです。
これはみんなで使う共有レシピ集に登録するためのものです。

進め方（重要）：
- 質問は一度に1つだけ。まとめて何個も聞かない
- 聞く項目の目安（順番）：①料理名 ②使った食材 ③作り方（手順） ④だいたいの費用 ⑤だいたいの調理時間 ⑥雑だけど美味しくするコツ
- ユーザーの返答が短くても、次の項目に自然に進めてよい（無理に深掘りしすぎない）
- 危険な調理（生焼けの肉・卵の加熱不足など）が含まれていたら、やんわり確認・注意する
- 必要な項目がひととおり集まったら、最後に「これで登録できそうです！」に続けて、料理名・材料・手順・目安費用・調理時間・コツを箇条書きで要約する
- 要約を出したら、「この内容で良ければ、下の『このレシピを保存』ボタンで共有レシピ集に登録できます」と伝える`;

function getMockReply(message: string, mode: ChatMode): string {
  if (mode === "record") {
    return `(モック応答) 「${message}」ですね。まずはその料理の名前を教えてください！(GEMINI_API_KEYを設定すると、AIが1つずつ質問してレシピを聞き取ります)`;
  }
  return `(モック応答) 「${message}」ですね。ご飯と卵と醤油があれば「雑うま卵焼き飯」が作れます。ご飯に卵と醤油を混ぜてフライパンで焼くだけです。目安費用100円くらい、調理時間10分。GEMINI_API_KEYを設定すると本物のAI応答になります。`;
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
    const mode: ChatMode = body.mode === "record" ? "record" : "suggest";

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

    // 直近の会話履歴を取得（AIへの文脈用）
    const { data: history } = await userSupabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    // ユーザーメッセージを保存
    await userSupabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: message,
    });

    // 提案モードのときだけ、現在の食材在庫を軽く文脈として渡す
    let ingredientContext = "";
    if (mode === "suggest") {
      const anonSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: ingredients } = await anonSupabase
        .from("ingredients")
        .select("name, quantity, unit")
        .is("discarded_at", null)
        .limit(20);

      ingredientContext = (ingredients ?? [])
        .map((i: { name: string; quantity: number; unit: string }) => `${i.name}(${i.quantity}${i.unit})`)
        .join("、");
    }

    const reply = await generateReply({
      history: (history ?? []) as { role: string; content: string }[],
      message,
      ingredientContext,
      mode,
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
  ingredientContext: string;
  mode: ChatMode;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return getMockReply(input.message, input.mode);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // v1 APIは systemInstruction 非対応のため、最初のターンにシステムプロンプトを埋め込む
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

    const systemPrompt = input.mode === "record" ? SYSTEM_PROMPT_RECORD : SYSTEM_PROMPT_SUGGEST;
    const ack =
      input.mode === "record"
        ? "了解しました。作ったレシピについて1つずつ質問していきますね。"
        : "了解しました。大学生らしい適当レシピを提案します。";

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: ack }] },
        ...input.history.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
      ],
    });

    const contextPrefix = input.ingredientContext
      ? `【今ある食材】${input.ingredientContext}\n\n`
      : "";

    const result = await chat.sendMessage(contextPrefix + input.message);
    return result.response.text();
  } catch (err) {
    console.error("[chat/recipe] Gemini error", err);
    return getMockReply(input.message, input.mode);
  }
}
