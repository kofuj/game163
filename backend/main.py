from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import date, datetime
from typing import Optional
import pandas as pd
import os

app = FastAPI(title="Game 163 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

DATA_DIR  = Path(os.getenv("DATA_DIR", Path(__file__).parent / "data"))
DAILY_DIR = DATA_DIR / "daily"
RECORD    = DATA_DIR / "record.csv"
SEASONS   = DATA_DIR / "season_summary.csv"


def _load_seasons() -> pd.DataFrame:
    if not SEASONS.exists():
        raise HTTPException(404, "Season data not found")
    return pd.read_csv(SEASONS)


def _load_record() -> pd.DataFrame:
    empty = pd.DataFrame(columns=[
        "date", "gamePk", "away_name", "home_name",
        "pick", "pick_prob", "grade", "home_win_prob", "elo_diff",
        "outcome", "result",
    ])
    if not RECORD.exists():
        return empty
    df = pd.read_csv(RECORD, dtype={"gamePk": str})
    if "outcome" not in df.columns:
        df["outcome"] = "PENDING"
    if "result" not in df.columns:
        df["result"] = ""
    df["outcome"] = df["outcome"].fillna("PENDING")
    df["result"]  = df["result"].fillna("")
    return df


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/performance")
def performance():
    df = _load_seasons()

    total_games = int(df["n_games"].sum())
    w_acc   = (df["accuracy"]   * df["n_games"]).sum() / total_games
    w_ll    = (df["log_loss"]   * df["n_games"]).sum() / total_games
    w_brier = (df["brier_score"] * df["n_games"]).sum() / total_games

    def wacc(acc_col, n_col):
        if acc_col not in df.columns or n_col not in df.columns:
            return None
        mask  = df[n_col] > 0
        total = df.loc[mask, n_col].sum()
        return (df.loc[mask, acc_col] * df.loc[mask, n_col]).sum() / total if total > 0 else None

    n_a = int(df["n_grade_A"].sum()) if "n_grade_A" in df.columns else 0
    n_b = int(df["n_grade_B"].sum()) if "n_grade_B" in df.columns else 0

    by_season = []
    for _, row in df.iterrows():
        entry = {
            "season":      int(row["season"]),
            "accuracy":    round(float(row["accuracy"])   * 100, 1),
            "vs_baseline": round(float(row["vs_baseline"]) * 100, 1),
            "log_loss":    round(float(row["log_loss"]),   3),
            "brier_score": round(float(row["brier_score"]), 3),
            "n_games":     int(row["n_games"]),
        }
        for g in ["A", "B", "C"]:
            if f"acc_grade_{g}" in df.columns:
                entry[f"acc_grade_{g}"] = round(float(row[f"acc_grade_{g}"]) * 100, 1)
                entry[f"n_grade_{g}"]   = int(row[f"n_grade_{g}"])
        by_season.append(entry)

    acc_a = wacc("acc_grade_A", "n_grade_A")
    acc_b = wacc("acc_grade_B", "n_grade_B")
    acc_c = wacc("acc_grade_C", "n_grade_C")

    return {
        "overall": {
            "accuracy":    round(w_acc * 100, 1),
            "total_games": total_games,
            "log_loss":    round(w_ll, 3),
            "brier_score": round(w_brier, 3),
            "baseline":    54.2,
            "vs_baseline": round((w_acc - 0.542) * 100, 1),
            "acc_grade_A": round(acc_a * 100, 1) if acc_a else None,
            "acc_grade_B": round(acc_b * 100, 1) if acc_b else None,
            "acc_grade_C": round(acc_c * 100, 1) if acc_c else None,
            "n_grade_A":   n_a,
            "n_grade_B":   n_b,
        },
        "by_season": by_season,
    }


def _resolve_predictions_path(target_date: str):
    """Return (path, date_str) for raw CSV first, then display CSV, then latest."""
    raw = DAILY_DIR / f"predictions_raw_{target_date}.csv"
    if raw.exists():
        return raw, target_date, True

    display = DAILY_DIR / f"predictions_{target_date}.csv"
    if display.exists():
        return display, target_date, False

    # Fall back to most recent available
    if DAILY_DIR.exists():
        raws = sorted(DAILY_DIR.glob("predictions_raw_*.csv"), reverse=True)
        if raws:
            d = raws[0].stem.replace("predictions_raw_", "")
            return raws[0], d, True
        displays = sorted(DAILY_DIR.glob("predictions_*.csv"), reverse=True)
        if displays:
            d = displays[0].stem.replace("predictions_", "")
            return displays[0], d, False

    raise HTTPException(404, "No predictions found")


def _parse_display_csv(df: pd.DataFrame) -> list[dict]:
    """Parse the human-readable display CSV produced by format_predictions()."""
    preds = []
    for _, row in df.iterrows():
        matchup = str(row.get("Matchup", ""))
        parts   = matchup.split(" @ ", 1)
        away    = parts[0].strip() if len(parts) == 2 else ""
        home    = parts[1].strip() if len(parts) == 2 else ""
        pick    = str(row.get("Pick", ""))
        prob_s  = str(row.get("Win Prob", "50%")).replace("%", "")
        hp_s    = str(row.get("Home Prob", "50%")).replace("%", "")
        pick_p  = float(prob_s) if prob_s else 50.0
        home_p  = float(hp_s)   if hp_s   else 50.0
        preds.append({
            "gamePk":        str(row.get("gamePk", "")),
            "matchup":       matchup,
            "away_name":     away,
            "home_name":     home,
            "pick":          pick,
            "pick_prob":     round(pick_p, 1),
            "grade":         str(row.get("Grade", "C")),
            "home_win_prob": round(home_p, 1),
            "elo_diff":      round(float(str(row.get("Elo Diff", "0")).replace("%", "")), 1),
            "outcome":       "PENDING",
            "result":        None,
        })
    return preds


def _parse_raw_csv(df: pd.DataFrame) -> list[dict]:
    """Parse the machine-readable raw CSV saved alongside the display CSV."""
    preds = []
    for _, row in df.iterrows():
        home_p   = float(row.get("home_win_prob", 0.5))
        pick_p   = float(row.get("pick_prob", 0.5))
        preds.append({
            "gamePk":        str(row.get("gamePk", "")),
            "matchup":       f"{row.get('away_name', '')} @ {row.get('home_name', '')}",
            "away_name":     str(row.get("away_name", "")),
            "home_name":     str(row.get("home_name", "")),
            "pick":          str(row.get("pick", "")),
            "pick_prob":     round(pick_p * 100, 1) if pick_p <= 1 else round(pick_p, 1),
            "grade":         str(row.get("grade", "C")),
            "home_win_prob": round(home_p * 100, 1) if home_p <= 1 else round(home_p, 1),
            "elo_diff":      round(float(row.get("elo_diff", 0)), 1),
            "outcome":       str(row.get("outcome", "PENDING")),
            "result":        row.get("result", None),
        })
    return preds


@app.get("/api/predictions")
@app.get("/api/predictions/{target_date}")
def get_predictions(target_date: Optional[str] = None):
    if target_date is None:
        target_date = date.today().isoformat()

    path, resolved_date, is_raw = _resolve_predictions_path(target_date)
    df    = pd.read_csv(path)
    preds = _parse_raw_csv(df) if is_raw else _parse_display_csv(df)

    return {"date": resolved_date, "games": len(preds), "predictions": preds}


@app.get("/api/record")
def get_record(limit: int = Query(50, le=500)):
    df = _load_record()
    if df.empty:
        return {"predictions": [], "total": 0, "settled": 0}

    df = df.sort_values("date", ascending=False).head(limit)

    preds = []
    for _, row in df.iterrows():
        preds.append({
            "date":      row["date"],
            "gamePk":    str(row["gamePk"]),
            "matchup":   f"{row['away_name']} @ {row['home_name']}",
            "pick":      row["pick"],
            "pick_prob": round(float(row["pick_prob"]) * 100, 1),
            "grade":     row["grade"],
            "outcome":   row.get("outcome", "PENDING"),
            "result":    row.get("result", ""),
        })

    settled = int((df["outcome"] != "PENDING").sum()) if "outcome" in df.columns else 0
    return {"predictions": preds, "total": len(df), "settled": settled}


@app.post("/api/record/settle")
def settle_record():
    """Fetch actual game outcomes from MLB API and update record."""
    import requests as req

    df = _load_record()
    if df.empty:
        return {"settled": 0, "pending": 0}

    today        = date.today().isoformat()
    pending_mask = (df["outcome"] == "PENDING") & (df["date"].astype(str) < today)
    to_settle    = df[pending_mask]

    settled = 0
    for idx, row in to_settle.iterrows():
        try:
            r = req.get(
                f"https://statsapi.mlb.com/api/v1/game/{row['gamePk']}/linescore",
                timeout=10,
            )
            data      = r.json()
            home_runs = data.get("teams", {}).get("home", {}).get("runs")
            away_runs = data.get("teams", {}).get("away", {}).get("runs")
            if home_runs is None or away_runs is None:
                continue
            home_win     = int(home_runs) > int(away_runs)
            pick_is_home = str(row["pick"]) == str(row["home_name"])
            correct      = (home_win and pick_is_home) or (not home_win and not pick_is_home)
            df.at[idx, "outcome"] = "HIT" if correct else "MISS"
            df.at[idx, "result"]  = f"{away_runs}-{home_runs}"
            settled += 1
        except Exception:
            pass

    df.to_csv(RECORD, index=False)
    return {"settled": settled, "pending": int(pending_mask.sum()) - settled}
