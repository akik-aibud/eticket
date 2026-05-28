import { NextRequest, NextResponse } from "next/server";

interface IncomingLeg {
  from: string; to: string;
  seatClass: string;
  online: number; fare: number;
}
interface IncomingCombo {
  legs: IncomingLeg[];
  totalFare: number;
  minOnline: number;
  hops: number;
  gapStations: string[];
}

interface Body {
  trainName: string;
  from: string;
  to: string;
  date: string;
  directAvailable: boolean;
  combos: IncomingCombo[];
  partials: IncomingCombo[];
  intermediateStations: string[];
}

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (!anthropicKey && !geminiKey && !gatewayKey) {
    return NextResponse.json({
      error: "AI not configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or AI_GATEWAY_API_KEY.",
    }, { status: 503 });
  }

  const body = (await req.json()) as Body;
  if (!body?.combos) {
    return NextResponse.json({ error: "Missing combos" }, { status: 400 });
  }

  const sys = `You are a Bangladesh Railway booking assistant. The user wants to travel ${body.from} → ${body.to} on ${body.date} via ${body.trainName}.
You will get an analysis of:
- whether a direct ticket is available
- alternative combos (split tickets along the route, possibly different seat classes)
- partial-coverage options where the rider buys a ticket for part of the route and stands for the rest

Reply in 4-7 short lines, mixing English with optional Bangla terms where natural.
Pick the SINGLE best option for the rider and explain WHY (cost, comfort, risk).
Mention seat-class tradeoffs (e.g. SHOVAN cheaper but no AC, AC_B/AC_S premium).
If only partial-coverage exists, warn that standing for the gap is unticketed and TTE may fine.
End with one bullet "Best plan:" stating concrete legs to buy.
Do NOT invent stations or fares — only use what's given.`;

  const usr = JSON.stringify({
    from: body.from,
    to: body.to,
    direct_available: body.directAvailable,
    intermediate_stations: body.intermediateStations,
    combos: body.combos.slice(0, 6),
    partials: body.partials.slice(0, 4),
  });

  try {
    // Primary: Anthropic (most reliable). Then Gemini (free), then Vercel Gateway.
    if (anthropicKey) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
          max_tokens: 600,
          temperature: 0.3,
          system: sys,
          messages: [{ role: "user", content: usr }],
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json({ error: `Anthropic ${resp.status}: ${text.slice(0, 200)}` }, { status: 502 });
      }
      const data = await resp.json();
      const text = (data?.content ?? []).map((b: { text?: string }) => b.text || "").join("") || "No suggestion produced.";
      return NextResponse.json({ text });
    }

    // Google Gemini (free tier, no card needed).
    if (geminiKey) {
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sys }] },
            contents: [{ role: "user", parts: [{ text: usr }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
          }),
        }
      );
      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json({ error: `Gemini ${resp.status}: ${text.slice(0, 200)}` }, { status: 502 });
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "No suggestion produced.";
      return NextResponse.json({ text });
    }

    // Fallback: Vercel AI Gateway (requires a billing card on the gateway account).
    const resp = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `Gateway ${resp.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "No suggestion produced.";
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
