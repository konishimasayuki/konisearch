// src/app/api/phone/route.js
import { NextResponse } from "next/server";

const NUMLOOKUP_API_KEY = process.env.NUMLOOKUP_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

async function serpSearch(query, num = 5) {
  try {
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      engine: "google",
      q: query,
      num: String(num),
      hl: "ja",
      gl: "jp",
    });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    const data = await res.json();
    return data.organic_results || [];
  } catch (e) {
    console.error("SerpAPI error:", e);
    return [];
  }
}

async function lookupPhone(phone) {
  try {
    const normalized = phone.replace(/[-\s－]/g, "");
    const withCountry = normalized.startsWith("0") ? "+81" + normalized.slice(1) : normalized;
    const res = await fetch(`https://api.numlookupapi.com/v1/info/${withCountry}?apikey=${NUMLOOKUP_API_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      valid: data.valid,
      carrier: data.carrier || null,
      lineType: data.line_type || null,
      location: data.location || null,
    };
  } catch (e) {
    console.error("NumLookup error:", e);
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone } = body;
    if (!phone) return NextResponse.json({ error: "電話番号は必須です" }, { status: 400 });

    const normalized = phone.replace(/[-\s－]/g, "");

    const [basic, results1, results2] = await Promise.all([
      lookupPhone(phone),
      serpSearch(`"${phone}" 口コミ 評判`, 5),
      serpSearch(`"${normalized}" 会社`, 5),
    ]);

    const reviews = [];
    const companyHits = [];
    const seen = new Set();

    for (const r of [...results1, ...results2]) {
      if (seen.has(r.link)) continue;
      seen.add(r.link);

      const isReview = r.link.includes("jpnumber") || r.link.includes("telcheck") ||
        r.link.includes("whosenumber") || r.link.includes("denwa") || r.link.includes("meiwaku");

      if (isReview) {
        const text = r.snippet || "";
        let rating = "📋 情報あり";
        if (text.includes("迷惑") || text.includes("詐欺") || text.includes("しつこい")) rating = "⚠️ 要注意";
        else if (text.includes("営業") || text.includes("勧誘")) rating = "📞 営業電話";
        else if (text.includes("安全") || text.includes("問題なし")) rating = "✅ 安全";
        reviews.push({ site: new URL(r.link).hostname.replace("www.", ""), rating, comment: text, url: r.link });
      } else {
        companyHits.push({ name: r.title, snippet: r.snippet || "", url: r.link });
      }
    }

    const lineTypeJa = (t) => {
      if (t === "mobile") return "携帯電話";
      if (t === "landline") return "固定電話";
      if (t === "voip") return "IP電話";
      return "不明";
    };

    return NextResponse.json({
      phone,
      valid: basic?.valid ?? null,
      carrier: basic?.carrier || "不明",
      type: lineTypeJa(basic?.lineType),
      location: basic?.location || null,
      reviews: reviews.slice(0, 4),
      companyHits: companyHits.slice(0, 3),
    });
  } catch (error) {
    console.error("Phone lookup error:", error);
    return NextResponse.json({ error: "検索中にエラーが発生しました" }, { status: 500 });
  }
}
