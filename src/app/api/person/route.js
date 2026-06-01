// src/app/api/person/route.js
import { NextResponse } from "next/server";

const SERPAPI_KEY = process.env.SERPAPI_KEY;

function parseAddress(addr) {
  if (!addr) return { pref: "", city: "" };
  const prefMatch = addr.match(/(北海道|東京都|大阪府|京都府|[^\s都道府県]{2,4}[都道府県])/);
  const pref = prefMatch?.[0] || "";
  const rest = pref ? addr.slice(addr.indexOf(pref) + pref.length) : addr;
  const cityMatch = rest.match(/^([^\s市区町村]{1,6}[市区町村])/);
  const city = cityMatch?.[0] || "";
  return { pref, city };
}

function classifyUrl(url, title, snippet) {
  const text = (title + " " + snippet).toLowerCase();
  if (url.includes("facebook.com") || url.includes("twitter.com") || url.includes("x.com") || url.includes("instagram.com") || url.includes("linkedin.com")) return "SNS";
  if (url.includes("bakusai.com")) return "爆サイ";
  if (url.includes(".lg.jp") || url.includes("go.jp") || text.includes("役員") || text.includes("名簿")) return "公的文書";
  if (url.includes("nikkei") || url.includes("asahi") || url.includes("yomiuri") || url.includes("news")) return "メディア";
  if (text.includes("pta") || text.includes("自治会") || text.includes("まちづくり")) return "地域活動";
  if (text.includes("マラソン") || text.includes("大会") || text.includes("結果")) return "イベント";
  return "企業HP";
}

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, address, phone, dob } = body;

    if (!name) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });

    const { pref, city } = parseAddress(address);

    let age = null;
    if (dob) {
      const today = new Date();
      const birth = new Date(dob);
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }

    // 検索クエリ作成
    const queries = [
      pref ? `${name} ${pref}` : name,
      city ? `${name} ${city}` : null,
      phone ? `"${phone}"` : null,
    ].filter(Boolean);

    // SNS検索クエリ
    const snsQueries = [
      `site:twitter.com OR site:x.com "${name}" ${pref}`,
      `site:facebook.com "${name}" ${pref}`,
      `site:instagram.com "${name}"`,
      `site:linkedin.com "${name}" ${pref}`,
    ];

    // 爆サイ検索クエリ
    const bakusaiQueries = [
      pref ? `site:bakusai.com "${name}" ${pref}` : `site:bakusai.com "${name}"`,
      phone ? `site:bakusai.com "${phone}"` : null,
    ].filter(Boolean);

    // 並列実行
    const [webResults, ...snsResultsArr] = await Promise.all([
      serpSearch(queries[0], 10),
      ...snsQueries.map(q => serpSearch(q, 2)),
    ]);

    // 追加クエリ
    if (queries[1]) {
      const extra = await serpSearch(queries[1], 5);
      webResults.push(...extra);
    }
    if (queries[2]) {
      const phoneResults = await serpSearch(queries[2], 5);
      webResults.push(...phoneResults);
    }

    // 爆サイ検索
    for (const q of bakusaiQueries) {
      const bakusaiResults = await serpSearch(q, 5);
      webResults.push(...bakusaiResults);
    }

    // Web結果整形（重複除去）
    const seen = new Set();
    const web = [];
    for (const r of webResults) {
      if (!seen.has(r.link)) {
        seen.add(r.link);
        const type = classifyUrl(r.link, r.title, r.snippet || "");
        if (type !== "SNS") {
          web.push({
            title: r.title,
            snippet: r.snippet || "",
            url: r.link,
            date: r.date || null,
            type,
          });
        }
      }
    }

    // SNS結果整形
    const platformNames = ["X (Twitter)", "Facebook", "Instagram", "LinkedIn"];
    const social = [];
    snsResultsArr.forEach((results, i) => {
      if (results[0]) {
        social.push({
          platform: platformNames[i],
          handle: results[0].title,
          bio: results[0].snippet || "",
          url: results[0].link,
          avatar: name.charAt(0),
        });
      }
    });

    // 候補生成
    const candidates = [];
    if (pref || city) {
      candidates.push({ name, pref: pref || "不明", city: city || "不明", age, score: 87 });
    }
    // Web結果から地域を抽出して候補追加
    for (const r of web.slice(0, 5)) {
      const text = r.title + " " + r.snippet;
      const pm = text.match(/(北海道|東京都|大阪府|京都府|[^\s]{2,4}[都道府県])/);
      if (pm && pm[0] !== pref) {
        const key = pm[0];
        if (!candidates.find(c => c.pref === key)) {
          candidates.push({ name, pref: key, city: "", age: null, score: Math.floor(Math.random() * 30) + 30 });
        }
      }
    }
    if (candidates.length === 0) {
      candidates.push({ name, pref: pref || "不明", city: city || "不明", age, score: 60 });
    }
    candidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({ candidates, social, web: web.slice(0, 10), meta: { name, pref, city, age } });
  } catch (error) {
    console.error("Person search error:", error);
    return NextResponse.json({ error: "検索中にエラーが発生しました" }, { status: 500 });
  }
}
