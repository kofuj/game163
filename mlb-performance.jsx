import { useState } from "react";

const mlbGreen = "#1a5c2a";
const mlbDark = "#0d1f13";
const mlbCream = "#f5f0e8";
const mlbRed = "#c41230";
const mlbGold = "#d4a843";

const stats = {
  accuracy: 61.4,
  totalGames: 7320,
  aPicks: 72.1,
  logLoss: 0.651,
  baseline: 54.2,
};

const grades = [
  { grade: "A", pct: 72.1, color: mlbGold },
  { grade: "B", pct: 61.8, color: "#7fb069" },
  { grade: "C", pct: 56.3, color: "#4a8f5f" },
];

const recentPicks = [
  { matchup: "NYY@BOS", result: "4-3", pick: "NYY", pct: 58.2, grade: "B", hit: true },
  { matchup: "LAD@SFG", result: "2-5", pick: "LAD", pct: 64.1, grade: "B", hit: false },
  { matchup: "HOU@TEX", result: "7-3", pick: "HOU", pct: 71.3, grade: "A", hit: true },
  { matchup: "ATL@NYM", result: "3-3 (11)", pick: "ATL", pct: 55.8, grade: "C", hit: false },
  { matchup: "CHC@MIL", result: "1-4", pick: "MIL", pct: 60.4, grade: "B", hit: true },
  { matchup: "TBR@BAL", result: "5-2", pick: "TBR", pct: 52.9, grade: "C", hit: true },
  { matchup: "SEA@MIN", result: "6-4", pick: "SEA", pct: 67.5, grade: "A", hit: true },
  { matchup: "CLE@DET", result: "2-3", pick: "CLE", pct: 53.1, grade: "C", hit: false },
];

const seasons = [
  { season: "2025", acc: 57.1, games: 1830, vs: 2.9, logLoss: 0.668 },
  { season: "2024", acc: 60.3, games: 1830, vs: 6.1, logLoss: 0.656 },
  { season: "2023", acc: 62.8, games: 1830, vs: 8.6, logLoss: 0.651 },
  { season: "2022", acc: 61.9, games: 1830, vs: 7.7, logLoss: 0.648 },
  { season: "2021", acc: 64.1, games: 1830, vs: 9.9, logLoss: 0.643 },
];

const metrics = [
  { label: "Accuracy", value: "61.4%", desc: "Percentage of games where the predicted winner actually won. MLB home baseline is ~54.2%. We beat it by +7.2 points." },
  { label: "Log Loss", value: "0.651", desc: "Calibration score — when we say 70%, it should happen ~70% of the time. Lower is better. 0 = perfect, 0.693 = random." },
  { label: "Edge (pts)", value: "10.8 avg", desc: "Distance from 50/50 for each prediction. A 65% pick has 15 pts of edge. Higher edge = higher confidence." },
  { label: "Brier Score", value: "0.229", desc: "Mean squared error of predicted probability vs actual outcome. Combines accuracy and calibration. 0 = perfect, 0.25 = random." },
  { label: "Baseline", value: "54.2%", desc: "Accuracy from always picking the home team. Every useful model must clear this bar. Home teams win ~54% of MLB games." },
  { label: "Holdout Testing", value: "7,320 games", desc: "Model tested on games it never saw during training. Walk-forward validation by season prevents overfitting." },
];

const faqs = [
  { q: "How accurate is the MLB prediction model?", a: "Overall accuracy is 61.4% across 7,320 walk-forward validated games. A-grade picks hit at 72.1%." },
  { q: "What is walk-forward validation?", a: "Each season's model is trained only on prior years and tested on future games it never saw. This gives realistic accuracy estimates and prevents overfitting." },
  { q: "How is the baseline calculated?", a: "The baseline is the accuracy you'd get by always picking the home team. In MLB, home teams win roughly 54.2% of games." },
  { q: "What does log loss measure?", a: "Log loss measures calibration. When the model says 70%, those teams should win about 70% of the time. Lower = better. Random guessing scores 0.693." },
  { q: "How often are results updated?", a: "Live results update daily after games complete. Every prediction ever made is logged in the full results table." },
];

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ fontSize: 13, color: "rgba(245,240,232,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 800, color: mlbCream, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: mlbGold, fontFamily: "'DM Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function GradeBar({ grade, pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: color + "22", border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14, color,
      }}>{grade}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(245,240,232,0.5)", fontFamily: "'DM Mono', monospace" }}>
            {grade === "A" ? "≥65% conf" : grade === "B" ? "58–65% conf" : "50–58% conf"}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: mlbCream, fontFamily: "'DM Mono', monospace" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${((pct - 50) / 50) * 100}%`,
            background: color,
            transition: "width 1s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

function Badge({ hit }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
      background: hit ? "rgba(127,176,105,0.15)" : "rgba(196,18,48,0.12)",
      color: hit ? "#7fb069" : "#e05570",
      border: `1px solid ${hit ? "rgba(127,176,105,0.3)" : "rgba(196,18,48,0.25)"}`,
    }}>
      {hit ? "HIT" : "MISS"}
    </span>
  );
}

function GradeChip({ grade }) {
  const colors = { A: mlbGold, B: "#7fb069", C: "#4a8f5f" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
      background: colors[grade] + "22",
      color: colors[grade],
      border: `1px solid ${colors[grade]}44`,
    }}>{grade}</span>
  );
}

export default function MLBPerformance() {
  const [openFaq, setOpenFaq] = useState(null);
  const hits = recentPicks.filter(p => p.hit).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: mlbDark,
      color: mlbCream,
      fontFamily: "'Georgia', serif",
      position: "relative",
      overflowX: "hidden",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d1f13; }
        ::-webkit-scrollbar-thumb { background: #1a5c2a; border-radius: 99px; }
        .faq-item { cursor: pointer; }
        .faq-item:hover { background: rgba(255,255,255,0.04) !important; }
        .row-hover:hover { background: rgba(255,255,255,0.04) !important; }
        .season-row:hover { background: rgba(26,92,42,0.15) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease both; }
        @keyframes pulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
      `}</style>

      {/* Background texture */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse 80% 40% at 50% 0%, rgba(26,92,42,0.25) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 100% 50%, rgba(212,168,67,0.06) 0%, transparent 60%)
        `,
      }} />

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(13,31,19,0.92)", backdropFilter: "blur(12px)",
        padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${mlbGreen}, ${mlbGold})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>⚾</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Game 163</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 13, color: "rgba(245,240,232,0.55)", fontFamily: "'DM Mono', monospace" }}>
            {["Overview", "Predictions", "Teams", "Players", "Performance"].map(l => (
              <span key={l} style={{ cursor: "pointer", color: l === "Performance" ? mlbGold : undefined, transition: "color 0.2s" }}>{l}</span>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px", position: "relative", zIndex: 1 }}>

        {/* Hero */}
        <div className="fade-up" style={{ paddingTop: 64, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7fb069", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#7fb069", letterSpacing: "0.12em", textTransform: "uppercase" }}>Live · Updated daily</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 16 }}>
            How the Model<br />Has Performed
          </h1>
          <p style={{ fontSize: 17, color: "rgba(245,240,232,0.55)", maxWidth: 540, lineHeight: 1.6 }}>
            The complete record for every Game 163 projection since the model went live. Win probabilities tested against implied market odds. We don't hide the losses.
          </p>
        </div>

        {/* Key stats */}
        <div className="fade-up" style={{ paddingTop: 40, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
          <StatCard label="Accuracy" value={`${stats.accuracy}%`} sub={`+${(stats.accuracy - stats.baseline).toFixed(1)} vs home baseline`} />
          <StatCard label="Test Games" value={stats.totalGames.toLocaleString()} sub="Walk-forward holdout" />
          <StatCard label="A Picks" value={`${stats.aPicks}%`} sub="Highest confidence tier" />
          <StatCard label="Log Loss" value={stats.logLoss} sub="Lower is better" />
        </div>

        {/* Accuracy by grade + recent */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 48 }}>

          {/* Grade bars */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 28 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 24 }}>Accuracy by Grade</div>
            {grades.map(g => <GradeBar key={g.grade} {...g} />)}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,0.35)" }}>50% baseline</span>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,0.35)" }}>100%</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,0.4)" }}>
              MLB Baseline: {stats.baseline}%
            </div>
          </div>

          {/* Recent picks */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 6 }}>Latest Results</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>Recent Predictions</div>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#7fb069", textAlign: "right" }}>
                {hits} of {recentPicks.length} correct<br />
                <span style={{ color: "rgba(245,240,232,0.35)", fontSize: 11 }}>last 2 game days</span>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
              <thead>
                <tr style={{ color: "rgba(245,240,232,0.35)", fontSize: 11, letterSpacing: "0.08em" }}>
                  {["Matchup", "Result", "Pick", "Grade", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 12, fontWeight: 400, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPicks.map((p, i) => (
                  <tr key={i} className="row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}>
                    <td style={{ padding: "11px 0", fontWeight: 700, color: mlbCream }}>{p.matchup}</td>
                    <td style={{ color: "rgba(245,240,232,0.5)" }}>{p.result}</td>
                    <td style={{ color: mlbGold }}>{p.pick} <span style={{ color: "rgba(245,240,232,0.4)" }}>{p.pct}%</span></td>
                    <td><GradeChip grade={p.grade} /></td>
                    <td style={{ textAlign: "right" }}><Badge hit={p.hit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, fontSize: 12, fontFamily: "'DM Mono', monospace", color: mlbGold, cursor: "pointer" }}>
              View all predictions →
            </div>
          </div>
        </div>

        {/* Season history */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 6 }}>Backtest History</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28 }}>Performance by Season</div>
            <p style={{ fontSize: 14, color: "rgba(245,240,232,0.45)", marginTop: 6 }}>Holdout results across multiple seasons. Each season tested using a model trained only on prior years.</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
            {seasons.map((s, i) => (
              <div key={s.season} className="season-row" style={{
                display: "grid", gridTemplateColumns: "80px 1fr 120px 120px 120px",
                alignItems: "center", padding: "20px 28px",
                borderBottom: i < seasons.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                transition: "background 0.15s",
              }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 22, color: i === 0 ? mlbGold : mlbCream }}>{s.season}</div>
                <div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, width: "80%", marginBottom: 8 }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${((s.acc - 50) / 20) * 100}%`,
                      background: i === 0 ? mlbGold : mlbGreen,
                    }} />
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(245,240,232,0.35)" }}>{s.games.toLocaleString()} games</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: mlbCream }}>{s.acc}%</div>
                  <div style={{ fontSize: 11, color: "#7fb069", fontFamily: "'DM Mono', monospace" }}>+{s.vs} vs base</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "rgba(245,240,232,0.6)" }}>{s.logLoss}</div>
                  <div style={{ fontSize: 11, color: "rgba(245,240,232,0.3)", fontFamily: "'DM Mono', monospace" }}>log loss</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(245,240,232,0.35)" }}>{s.games.toLocaleString()} games</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric explainers */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 6 }}>Understanding the Numbers</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28 }}>What the Metrics Mean</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {metrics.map((m) => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "24px 22px",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.35)", marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: mlbGold, marginBottom: 10 }}>{m.value}</div>
                <div style={{ fontSize: 13, color: "rgba(245,240,232,0.5)", lineHeight: 1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 6 }}>Common Questions</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28 }}>Understanding the Track Record</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
            {faqs.map((f, i) => (
              <div
                key={i}
                className="faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  borderBottom: i < faqs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  padding: "20px 28px",
                  background: openFaq === i ? "rgba(26,92,42,0.12)" : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>{f.q}</div>
                  <div style={{
                    fontSize: 20, color: mlbGold, marginLeft: 16, flexShrink: 0,
                    transform: openFaq === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.2s",
                  }}>+</div>
                </div>
                {openFaq === i && (
                  <div style={{ marginTop: 12, fontSize: 14, color: "rgba(245,240,232,0.55)", lineHeight: 1.7, maxWidth: 640 }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTAs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { title: "Full Results", desc: "Complete prediction history with sorting and filtering.", icon: "📋" },
            { title: "Predictions", desc: "Today's model-generated MLB game predictions.", icon: "⚾" },
            { title: "Power Rankings", desc: "Weekly model-driven team rankings.", icon: "📊" },
          ].map(c => (
            <div key={c.title} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "22px 22px", cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.3)"; e.currentTarget.style.background = "rgba(212,168,67,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "rgba(245,240,232,0.45)", lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚾</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>Game 163</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,0.25)" }}>
            Not affiliated with MLB. Data from public MLB Stats API. Analytics only, not betting advice. © 2026 Game 163
          </div>
        </div>

      </div>
    </div>
  );
}
