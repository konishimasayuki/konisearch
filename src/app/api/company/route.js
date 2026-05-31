// src/app/api/company/route.js
import { NextResponse } from "next/server";

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

// 国税庁 法人番号API（無料・キー不要）
async function searchHojin(companyName) {
  try {
    const params = new URLSearchParams({
      name: companyName,
      type: "12", // JSON
      mode: "1",
      target: "1",
    });
    const url = `https://api.houjin-bangou.nta.go.jp/4/name?${params}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.corporations?.length) return null;
    const c = data.corporations[0];
    return {
      corporateNumber: c.corporateNumber,
      name: c.name,
      address: `${c.prefectureName || ""}${c.cityName || ""}${c.streetNumber || ""}`,
      established: null,
    };
  } catch (e) {
    console.error("法人番号API error:", e);
    return null;
  }
}

function classifyUrl(url) {
  if (url.includes("nikkei") || url.includes("news") || url.includes("prtimes")) return "ニュース";
  if (url.includes("indeed") || url.includes("doda") || url.includes("recruit")) return "求人";
  if (url.includes("vorkers") || url.includes("kaishagram") || url.includes("review")) return "口コミ";
  return "企業HP";
}

function extractInfo(results) {
  const info = { representative: null, capital: null, established: null, employees: null, phone: null, website: null, business: null };
  for (const r of results) {
    const text = (r.title || "") + " " + (r.snippet || "");
    if (!info.representative) {
      const m = text.match(/代表[取締役者]?\s*[：:]\s*([^\s、,。]{2,10})/);
      if (m) info.representative = m[1].trim();
    }
    if (!info.capital) {
      const m = text.match(/資本金[：:\s]*([0-9,億万千百円]+)/);
      if (m) info.capital = m[1];
    }
    if (!info.established) {
      const m = text.match(/設立[：:\s]*([\d]{4}年[\d]{1,2}月?)/);
      if (m) info.established = m[1];
    }
    if (!info.employees) {
      const m = text.match(/従業員[数]?[：:\s]*([0-9,約名人]+)/);
      if (m) info.employees = m[1];
    }
    if (!info.phone) {
      const m = text.match(/(\d{2,4}[-－]\d{2,4}[-－]\d{4})/);
      if (m) info.phone = m[1];
    }
    if (!info.website && classifyUrl(r.link) === "企業HP") {
      info.website = r.link;
    }
    if (!info.business) {
      const m = text.match(/事業内容[：:\s]*([^。]{10,60})/);
      if (m) info.business = m[1].trim();
    }
  }
  return info;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { companyName, address } = body;
    if (!companyName) return NextResponse.json({ error: "会社名は必須です" }, { status: 400 });

    const [hojin, results1, results2] = await Promise.all([
      searchHojin(companyName),
      serpSearch(`"${companyName}" 代表 資本金 設立 事業内容`, 8),
      serpSearch(`"${companyName}" ${address || ""}`, 5),
    ]);

    const allResults = [...results1, ...results2];
    const seen = new Set();
    const webResults = [];
    for (const r of allResults) {
      if (!seen.has(r.link)) {
        seen.add(r.link);
        webResults.push({ title: r.title, snippet: r.snippet || "", url: r.link, type: classifyUrl(r.link) });
      }
    }

    const extracted = extractInfo(webResults);

    const company = {
      name: hojin?.name || companyName,
      corporateNumber: hojin?.corporateNumber || null,
      address: hojin?.address || address || null,
      representative: extracted.representative,
      capital: extracted.capital,
      established: extracted.established,
      employees: extracted.employees,
      phone: extracted.phone,
      website: extracted.website,
      business: extracted.business,
      score: hojin ? 92 : 65,
      webResults: webResults.slice(0, 8),
    };

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Company search error:", error);
    return NextResponse.json({ error: "検索中にエラーが発生しました" }, { status: 500 });
  }
}
