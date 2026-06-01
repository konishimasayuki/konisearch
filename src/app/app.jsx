"use client";
import { useState, useEffect } from "react";

// Load fonts
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Outfit:wght@700&display=swap";
  document.head.appendChild(link);
}

const accent = "#2563eb";
const accentLight = "#eff6ff";
const accentMid = "#bfdbfe";

function parseAddress(addr) {
  const prefMatch = addr?.match(/(北海道|東京都|大阪府|京都府|[^\s都道府県]{2,4}[都道府県])/);
  const pref = prefMatch?.[0] || "";
  const rest = pref ? addr.slice(addr.indexOf(pref) + pref.length) : addr || "";
  const cityMatch = rest.match(/^([^\s市区町村]{1,6}[市区町村])/);
  const city = cityMatch?.[0] || "";
  return { pref, city };
}

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const platformColors = {
  "X (Twitter)": "#1a1a1a", "Facebook": "#1877f2",
  "LinkedIn": "#0a66c2", "Instagram": "#c13584", "Web": "#64748b",
};
const typeColors = {
  "企業HP": "#3b82f6", "公的文書": "#f59e0b", "イベント": "#10b981",
  "地域活動": "#8b5cf6", "メディア": "#ec4899", "口コミ": "#ef4444",
  "ニュース": "#f97316", "求人": "#06b6d4", "爆サイ": "#dc2626",
};

// ---- SHARED UI ----
function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", ...style }}>{children}</div>;
}

function FieldInput({ label, value, onChange, placeholder, type = "text", required, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "6px" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>}
        {hint && <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400", marginLeft: "8px" }}>{hint}</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", boxSizing: "border-box", background: "#f8fafc", border: `1.5px solid ${focused ? accent : "#e2e8f0"}`, borderRadius: "10px", color: "#0f172a", fontSize: "15px", fontFamily: "inherit", padding: "12px 16px", outline: "none", transition: "border-color 0.15s" }} />
    </div>
  );
}

function SearchButton({ onClick, disabled, label, loading }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width: "100%", background: (!disabled && !loading) ? accent : "#e2e8f0", border: "none", borderRadius: "10px", color: (!disabled && !loading) ? "#fff" : "#94a3b8", fontSize: "15px", fontFamily: "inherit", fontWeight: "700", padding: "15px", cursor: (!disabled && !loading) ? "pointer" : "default", transition: "all 0.15s", marginTop: "8px" }}>
      {loading ? "コニサーチ中..." : (label || "🔍　コニサーチ開始")}
    </button>
  );
}

function LoadingScreen({ labels, progress }) {
  return (
    <Card style={{ padding: "60px 40px", textAlign: "center" }}>
      <div style={{ fontSize: "22px", fontWeight: "900", color: accent, marginBottom: "6px" }}>コニサーチ中...</div>
      <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "28px" }}>ネットワークをスキャンしています</div>
      <div style={{ background: "#f1f5f9", borderRadius: "100px", height: "8px", marginBottom: "10px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${accent},#60a5fa)`, borderRadius: "100px", transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: "32px", fontWeight: "900", color: accent, marginBottom: "32px" }}>{Math.floor(progress)}%</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", maxWidth: "300px", margin: "0 auto" }}>
        {labels.map((label, i) => {
          const done = progress > i * (100 / labels.length);
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: done ? accent : "#cbd5e1", fontWeight: done ? "700" : "400", transition: "all 0.3s" }}>
              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: done ? accentLight : "#f1f5f9", border: `2px solid ${done ? accent : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0 }}>{done ? "✓" : ""}</span>
              {label}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ResultHeader({ icon, label, name, sub, score, onBack }) {
  return (
    <Card style={{ padding: "22px 26px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900", color: accent }}>{icon}</div>
        <div>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "2px" }}>コニサーチ結果 — {label}</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>{name}</div>
          {sub && <div style={{ fontSize: "12px", color: "#64748b" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", fontWeight: "900", color: "#16a34a", lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>MATCH</div>
        </div>
        <button onClick={onBack} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", color: "#64748b", fontSize: "13px", fontFamily: "inherit", fontWeight: "600", padding: "9px 14px", cursor: "pointer" }}>← 戻る</button>
      </div>
    </Card>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "5px", display: "flex", gap: "3px", marginBottom: "14px", flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ background: active === t.key ? accent : "transparent", border: "none", borderRadius: "8px", color: active === t.key ? "#fff" : "#64748b", fontSize: "13px", fontFamily: "inherit", fontWeight: "700", padding: "8px 16px", cursor: "pointer", transition: "all 0.15s" }}>{t.label}</button>
      ))}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px 18px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
      ⚠️ {message}
    </div>
  );
}


// ---- MAP & STREET VIEW ----
function MapView({ address, name, city, pref }) {
  const [mode, setMode] = useState("street"); // "map" | "street"
  const [geocoded, setGeocoded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  const fullAddress = address || `${pref}${city}`;

  useEffect(() => {
    if (!fullAddress || !MAPS_KEY) { setLoading(false); return; }
    // Geocoding APIで住所→緯度経度
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${MAPS_KEY}&language=ja`)
      .then(r => r.json())
      .then(data => {
        if (data.results?.[0]?.geometry?.location) {
          setGeocoded(data.results[0].geometry.location);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [fullAddress]);

  if (loading) return (
    <Card style={{ padding: "60px", textAlign: "center" }}>
      <div style={{ fontSize: "14px", color: "#64748b" }}>地図を読み込み中...</div>
    </Card>
  );

  if (error || !geocoded || !MAPS_KEY) return (
    <Card style={{ padding: "40px", textAlign: "center" }}>
      <div style={{ fontSize: "14px", color: "#94a3b8" }}>住所情報が不足しているため地図を表示できません</div>
    </Card>
  );

  const { lat, lng } = geocoded;

  // Static Maps URL
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=800x400&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}&language=ja`;

  // Street View Static URL
  const streetUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${MAPS_KEY}`;

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "2px" }}>コニサーチ結果 — LOCATION</div>
          <div style={{ fontSize: "15px", fontWeight: "700" }}>{fullAddress}</div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setMode("map")} style={{ background: mode === "map" ? accent : "#f8fafc", border: `1.5px solid ${mode === "map" ? accent : "#e2e8f0"}`, borderRadius: "8px", color: mode === "map" ? "#fff" : "#64748b", fontSize: "12px", fontWeight: "700", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>🗺 地図</button>
          <button onClick={() => setMode("street")} style={{ background: mode === "street" ? accent : "#f8fafc", border: `1.5px solid ${mode === "street" ? accent : "#e2e8f0"}`, borderRadius: "8px", color: mode === "street" ? "#fff" : "#64748b", fontSize: "12px", fontWeight: "700", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>📷 ストリートビュー</button>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <img
          src={mode === "map" ? mapUrl : streetUrl}
          alt={mode === "map" ? "地図" : "ストリートビュー"}
          style={{ width: "100%", height: "340px", objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
        <div style={{ display: "none", height: "340px", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>{mode === "street" ? "この場所のストリートビューはありません" : "地図を表示できません"}</div>
        </div>
      </div>
      <div style={{ padding: "10px 22px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: accent, fontWeight: "700", textDecoration: "none" }}>Google Mapsで開く →</a>
      </div>
    </Card>
  );
}

// ---- PERSON SEARCH ----
function PersonSearch() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [phase, setPhase] = useState("input");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [phoneResult, setPhoneResult] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeTab, setActiveTab] = useState("social");
  const [error, setError] = useState(null);

  const age = calcAge(dob);
  const { pref, city } = parseAddress(address);
  const hasPhone = phone.trim().length > 0;

  // URLパラメータから自動検索
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pName = params.get("name");
    const pAddress = params.get("address") || "";
    const pPhone = params.get("phone") || "";
    const pDob = params.get("dob") || "";
    if (pName) {
      setName(pName);
      if (pAddress) setAddress(pAddress);
      if (pPhone) setPhone(pPhone);
      if (pDob) setDob(pDob);
      // 少し待ってから自動検索開始
      setTimeout(() => {
        setPhase("loading");
        setProgress(0);
        setError(null);
        let p = 0;
        const iv = setInterval(() => {
          p += Math.random() * 8 + 3;
          if (p >= 90) { p = 90; clearInterval(iv); }
          setProgress(Math.min(p, 90));
        }, 300);
        fetch("/api/person", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pName, address: pAddress, phone: pPhone, dob: pDob }),
        })
          .then(r => r.json())
          .then(data => {
            setResult(data);
            if (pPhone) {
              fetch("/api/phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: pPhone }),
              }).then(r => r.json()).then(pd => setPhoneResult(pd)).catch(() => {});
            }
            clearInterval(iv);
            setProgress(100);
            const best = data.candidates?.[0];
            setTimeout(() => {
              if (best) { setSelectedCandidate(best); setPhase("result"); }
              else setPhase("candidates");
            }, 400);
          })
          .catch(e => {
            clearInterval(iv);
            setError(e.message);
            setPhase("input");
            setProgress(0);
          });
      }, 300);
    }
  }, []);

  const loadingLabels = [
    "氏名・住所照合中",
    "X / Twitter コニサーチ中",
    "Facebook / Instagram コニサーチ中",
    "Web記事・公的文書コニサーチ中",
    "地域情報照合中",
    ...(hasPhone ? ["電話番号逆引き中", "口コミ・会社HP照合中"] : []),
  ];

  const runSearch = async () => {
    if (!name.trim()) return;
    setPhase("loading");
    setProgress(0);
    setError(null);

    // プログレスバーをアニメーション
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= 90) { p = 90; clearInterval(iv); } // 90%で止めてAPI完了を待つ
      setProgress(Math.min(p, 90));
    }, 300);

    try {
      // 個人検索API
      const personRes = await fetch("/api/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, dob }),
      });
      const personData = await personRes.json();

      if (!personRes.ok) throw new Error(personData.error || "検索に失敗しました");

      setResult(personData);

      // 電話番号がある場合は追加で電話番号検索
      if (hasPhone) {
        const phoneRes = await fetch("/api/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const phoneData = await phoneRes.json();
        if (phoneRes.ok) setPhoneResult(phoneData);
      }

      clearInterval(iv);
      setProgress(100);
      // 最もスコアの高い候補を自動選択して結果ページへ
      setTimeout(() => {
        const best = personData.candidates?.[0];
        if (best) {
          setSelectedCandidate(best);
          setPhase("result");
        } else {
          setPhase("candidates");
        }
      }, 400);
    } catch (e) {
      clearInterval(iv);
      setError(e.message);
      setPhase("input");
      setProgress(0);
    }
  };

  const reset = () => {
    setPhase("input"); setName(""); setAddress(""); setPhone(""); setDob("");
    setResult(null); setPhoneResult(null); setSelectedCandidate(null);
    setActiveTab("social"); setError(null);
  };

  const backToCandidates = () => {
    setPhase("candidates"); setActiveTab("social");
  };

  const filteredCandidates = result?.candidates
    ? (age ? result.candidates.filter(c => !c.age || Math.abs(c.age - age) <= 15) : result.candidates)
    : [];

  if (phase === "loading") return <LoadingScreen labels={loadingLabels} progress={progress} />;

  if (phase === "candidates") return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px", color: "#0f172a" }}>コニサーチ結果 — 候補一覧</h3>
        <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
          「{name}」— {filteredCandidates.length}件
          {age && <span style={{ marginLeft: "8px", background: accentLight, color: accent, fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "100px" }}>年齢±15歳でフィルタ済み（{age}歳）</span>}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        {filteredCandidates.length === 0 && (
          <Card style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#64748b" }}>該当する候補が見つかりませんでした</div>
          </Card>
        )}
        {filteredCandidates.map((c, i) => (
          <button key={i} onClick={() => { setSelectedCandidate(c); setPhase("result"); }}
            style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "18px 22px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accentLight}`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "800", color: accent }}>人</div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "3px" }}>{c.name}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{c.pref} › {c.city}{c.age ? `　${c.age}歳` : ""}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "26px", fontWeight: "900", lineHeight: 1, color: c.score >= 70 ? "#16a34a" : c.score >= 40 ? "#d97706" : "#94a3b8" }}>{c.score}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>MATCH</div>
            </div>
          </button>
        ))}
      </div>
      <button onClick={reset} style={{ background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: "10px", color: "#64748b", fontSize: "13px", fontFamily: "inherit", fontWeight: "600", padding: "10px 18px", cursor: "pointer" }}>← 検索に戻る</button>
    </div>
  );

  if (phase === "result" && selectedCandidate) {
    const resultTabs = [
      { key: "social", label: "📱 SNS" },
      { key: "web", label: "🌐 WEB掲載" },
      ...(hasPhone && phoneResult ? [{ key: "phone", label: "📞 電話番号情報" }] : []),
      { key: "map", label: "🗺 MAP" },
    ];

    return (
      <div>
        <ResultHeader icon="人" label="個人" name={selectedCandidate.name}
          sub={`${selectedCandidate.pref} › ${selectedCandidate.city}${selectedCandidate.age ? `　${selectedCandidate.age}歳` : ""}`}
          score={selectedCandidate.score} onBack={reset} />

        <TabBar tabs={resultTabs} active={activeTab} onChange={setActiveTab} />

        {/* SNS */}
        {activeTab === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(!result?.social || result.social.length === 0) && (
              <Card style={{ padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#64748b" }}>SNSアカウントが見つかりませんでした</div>
              </Card>
            )}
            {result?.social?.map((s, i) => (
              <Card key={i} style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: platformColors[s.platform] || "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "900", color: "#fff", flexShrink: 0 }}>{s.avatar || name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#fff", background: platformColors[s.platform] || "#374151", borderRadius: "4px", padding: "2px 8px", flexShrink: 0 }}>{s.platform}</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.handle}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.bio}</div>
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: "700", color: accent, border: `1.5px solid ${accentMid}`, borderRadius: "8px", padding: "5px 12px", flexShrink: 0, background: accentLight, textDecoration: "none" }}>開く →</a>
              </Card>
            ))}
          </div>
        )}

        {/* WEB */}
        {activeTab === "web" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(!result?.web || result.web.length === 0) && (
              <Card style={{ padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#64748b" }}>Web掲載情報が見つかりませんでした</div>
              </Card>
            )}
            {result?.web?.map((w, i) => (
              <Card key={i} style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 10px", background: `${typeColors[w.type] || "#64748b"}18`, border: `1.5px solid ${typeColors[w.type] || "#64748b"}40`, color: typeColors[w.type] || "#64748b", borderRadius: "100px", flexShrink: 0 }}>{w.type}</span>
                  {w.date && <span style={{ fontSize: "12px", color: "#94a3b8" }}>{w.date}</span>}
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>{w.title}</div>
                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "8px" }}>{w.snippet}</div>
                <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: accent, textDecoration: "none", wordBreak: "break-all", display: "block" }}>{w.url}</a>
              </Card>
            ))}
          </div>
        )}

        {/* PHONE */}
        {activeTab === "phone" && phoneResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {[
                { icon: "📞", label: "電話番号", value: phoneResult.phone },
                { icon: "📡", label: "キャリア", value: phoneResult.carrier || "不明" },
                { icon: "📱", label: "種別", value: phoneResult.type || "不明" },
              ].map(item => (
                <Card key={item.label} style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "4px" }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{item.value}</div>
                </Card>
              ))}
            </div>
            {phoneResult.companyHits?.map((c, i) => (
              <Card key={i} style={{ padding: "18px 22px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "8px" }}>🏢 会社HP掲載</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>{c.name}</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>{c.snippet}</div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: accent, textDecoration: "none" }}>{c.url}</a>
              </Card>
            ))}
            {phoneResult.reviews?.length > 0 && (
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>📣 口コミ・掲示板</div>
                {phoneResult.reviews.map((r, i) => (
                  <Card key={i} style={{ padding: "16px 20px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 10px", background: "#fef2f2", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: "100px" }}>{r.rating}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{r.site}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>{r.comment}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MAP */}
        {activeTab === "map" && (
          <MapView address={address || `${selectedCandidate.pref}${selectedCandidate.city}`} name={selectedCandidate.name} city={selectedCandidate.city} pref={selectedCandidate.pref} />
        )}
      </div>
    );
  }

  // INPUT
  return (
    <Card style={{ padding: "32px 36px" }}>
      {error && <ErrorBanner message={error} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <FieldInput label="氏名" value={name} onChange={setName} placeholder="例：木村 拓哉" required />
        <FieldInput label="住所（番地まで）" value={address} onChange={setAddress} placeholder="例：東京都港区南青山2-3-4" hint="都道府県・市区町村は自動判別" />
        {address && (pref || city) && (
          <div style={{ display: "flex", gap: "8px", marginTop: "-12px" }}>
            {pref && <span style={{ fontSize: "12px", background: accentLight, color: accent, padding: "3px 10px", borderRadius: "100px", fontWeight: "700" }}>📍 {pref}</span>}
            {city && <span style={{ fontSize: "12px", background: "#f0fdf4", color: "#16a34a", padding: "3px 10px", borderRadius: "100px", fontWeight: "700" }}>🏙 {city}</span>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <FieldInput label="電話番号" value={phone} onChange={setPhone} placeholder="例：090-0000-0000" type="tel" hint="口コミ・会社HP・SNSも検索" />
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "6px" }}>
              生年月日 <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>年齢で候補を絞り込み</span>
            </label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", color: "#0f172a", fontSize: "15px", fontFamily: "inherit", padding: "12px 16px", outline: "none" }} />
            {age !== null && (
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                現在 <strong style={{ color: accent }}>{age}歳</strong>
                <span style={{ marginLeft: "6px", color: "#94a3b8", fontSize: "11px" }}>（±15歳で絞り込み）</span>
              </div>
            )}
          </div>
        </div>
        {(name || address || phone || dob) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "8px" }}>コニサーチ対象</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {name && <span style={{ fontSize: "12px", background: "#fff", border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: "100px", color: "#374151", fontWeight: "600" }}>👤 {name}</span>}
              {pref && <span style={{ fontSize: "12px", background: "#fff", border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: "100px", color: "#374151", fontWeight: "600" }}>📍 {pref}{city}</span>}
              {phone && <span style={{ fontSize: "12px", background: "#fff", border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: "100px", color: "#374151", fontWeight: "600" }}>📞 {phone} <span style={{ color: "#10b981" }}>口コミ・HP検索あり</span></span>}
              {age !== null && <span style={{ fontSize: "12px", background: "#fff", border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: "100px", color: "#374151", fontWeight: "600" }}>🎂 {age}歳</span>}
            </div>
          </div>
        )}
        <SearchButton onClick={runSearch} disabled={!name.trim()} />
      </div>
    </Card>
  );
}

// ---- COMPANY SEARCH ----
function CompanySearch() {
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phase, setPhase] = useState("input");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSearch = async () => {
    if (!companyName.trim()) return;
    setPhase("loading"); setProgress(0); setError(null);

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 10 + 4;
      if (p >= 90) { p = 90; clearInterval(iv); }
      setProgress(Math.min(p, 90));
    }, 300);

    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "検索に失敗しました");

      setResult(data.company);
      clearInterval(iv);
      setProgress(100);
      setTimeout(() => setPhase("result"), 400);
    } catch (e) {
      clearInterval(iv);
      setError(e.message);
      setPhase("input");
      setProgress(0);
    }
  };

  const reset = () => { setPhase("input"); setCompanyName(""); setAddress(""); setResult(null); setError(null); };

  const loadingLabels = ["法人番号データベース照合", "登記情報コニサーチ中", "企業HP・IR情報取得", "ニュース・記事コニサーチ中", "口コミ・評判集約"];

  if (phase === "loading") return <LoadingScreen labels={loadingLabels} progress={progress} />;

  if (phase === "result" && result) return (
    <div>
      <ResultHeader icon="🏢" label="法人" name={result.name} sub={result.address} score={result.score} onBack={reset} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        {[
          { icon: "👤", label: "代表者", value: result.representative || "取得中..." },
          { icon: "💰", label: "資本金", value: result.capital || "取得中..." },
          { icon: "📅", label: "設立", value: result.established || "取得中..." },
          { icon: "👥", label: "従業員数", value: result.employees || "取得中..." },
          { icon: "📞", label: "電話番号", value: result.phone || "取得中..." },
          { icon: "🔢", label: "法人番号", value: result.corporateNumber ? `法人番号：${result.corporateNumber}` : "取得中..." },
        ].map(item => (
          <Card key={item.label} style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "4px" }}>{item.icon} {item.label}</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{item.value}</div>
          </Card>
        ))}
      </div>
      {result.business && (
        <Card style={{ padding: "20px 22px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "8px" }}>📋 事業内容</div>
          <div style={{ fontSize: "14px", color: "#1e293b", lineHeight: 1.7 }}>{result.business}</div>
        </Card>
      )}
      {result.website && (
        <Card style={{ padding: "16px 22px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "4px" }}>🌐 Webサイト</div>
          <a href={result.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "14px", color: accent, fontWeight: "600", textDecoration: "none" }}>{result.website}</a>
        </Card>
      )}
      {result.webResults?.length > 0 && (
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "10px" }}>🌐 関連Web情報</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {result.webResults.map((w, i) => (
              <Card key={i} style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 10px", background: `${typeColors[w.type] || "#64748b"}18`, border: `1.5px solid ${typeColors[w.type] || "#64748b"}40`, color: typeColors[w.type] || "#64748b", borderRadius: "100px" }}>{w.type}</span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>{w.title}</div>
                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "6px" }}>{w.snippet}</div>
                <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: accent, textDecoration: "none", wordBreak: "break-all", display: "block" }}>{w.url}</a>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card style={{ padding: "32px 36px" }}>
      {error && <ErrorBanner message={error} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <FieldInput label="会社名" value={companyName} onChange={setCompanyName} placeholder="例：株式会社○○建設" required />
        <FieldInput label="住所（番地まで）" value={address} onChange={setAddress} placeholder="例：東京都港区虎ノ門1-2-3" hint="都道府県・市区町村は自動判別" />
        <SearchButton onClick={runSearch} disabled={!companyName.trim()} label="🔍　会社をコニサーチ" />
      </div>
    </Card>
  );
}

// ---- MAIN APP ----
const TABS = [
  { key: "person", label: "👤 個人検索" },
  { key: "company", label: "🏢 法人検索" },
];

export default function App() {
  const [tab, setTab] = useState("person");
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Helvetica Neue', 'Hiragino Sans', 'Yu Gothic', sans-serif", color: "#1e293b" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", alignItems: "center", height: "72px" }}>
        <svg width="46" height="46" viewBox="0 0 58 58" fill="none" style={{ flexShrink: 0, marginRight: "16px" }}>
          <circle cx="23" cy="23" r="16" stroke="#dbeafe" strokeWidth="1.5"/>
          <circle cx="23" cy="23" r="10.5" stroke="#93c5fd" strokeWidth="2"/>
          <circle cx="23" cy="23" r="5.5" stroke="#2563eb" strokeWidth="2.5" fill="none"/>
          <circle cx="23" cy="23" r="2" fill="#2563eb"/>
          <line x1="30.5" y1="30.5" x2="50" y2="50" stroke="#dbeafe" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="30.5" y1="30.5" x2="50" y2="50" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
          <div style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif", fontWeight: "800", fontSize: "28px", letterSpacing: "-1.5px", lineHeight: 1 }}>
            <span style={{ color: "#0f172a" }}>コニ</span><span style={{ color: "#2563eb" }}>サーチ</span>
          </div>
          <div style={{ height: "2.5px", width: "148px", borderRadius: "2px", background: "linear-gradient(90deg,#2563eb,#93c5fd 60%,transparent)", margin: "5px 0 3px" }} />
          <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "4px", color: "#bfdbfe", fontFamily: "'Outfit','Helvetica Neue',sans-serif" }}>SEARCH INTELLIGENCE</div>
        </div>
      </div>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "transparent", border: "none", borderBottom: `3px solid ${tab === t.key ? accent : "transparent"}`, color: tab === t.key ? accent : "#64748b", fontSize: "13px", fontFamily: "inherit", fontWeight: "700", padding: "14px 20px", cursor: "pointer", transition: "all 0.15s", marginBottom: "-1px" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 20px 60px" }}>
        <div style={{ display: tab === "person" ? "block" : "none" }}><PersonSearch /></div>
        <div style={{ display: tab === "company" ? "block" : "none" }}><CompanySearch /></div>
        <div style={{ marginTop: "28px", padding: "14px 18px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "10px", fontSize: "12px", color: "#92400e", lineHeight: 1.7 }}>
          ⚠️ 本システムは検索者の同意を得た上での使用に限定されます。<br />
          🔄 リロードを行うと情報は削除されます。
        </div>
      </div>
    </div>
  );
}
