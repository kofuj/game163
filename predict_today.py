"""
predict_today.py
----------------
Generates win-probability predictions for today's MLB games.
Loads the trained model (or retrains on recent history) and
outputs a prediction card for each scheduled game.

Usage:
    python predict_today.py
    python predict_today.py --date 2025-07-04
    python predict_today.py --model gbm --seasons 2021 2022 2023 2024
"""

import argparse
import pickle
import numpy as np
import pandas as pd
from datetime import date, datetime
from pathlib import Path

from model import make_model, grade_pick, RESULTS_DIR
from features import build_features, FEATURE_COLS, apply_elo, build_rolling_features

MODEL_PATH  = Path(__file__).parent / "results" / "trained_model.pkl"
PREDS_DIR   = Path(__file__).parent / "results" / "daily"
RECORD_PATH = Path(__file__).parent / "results" / "record.csv"
PREDS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Train and persist model
# ---------------------------------------------------------------------------

def train_and_save(df: pd.DataFrame, model_type: str = "gbm",
                   pitcher_stats_by_season: dict = None) -> object:
    """
    Train on the full available dataset and pickle the model for daily use.
    This is the production model — trained on ALL history, not walk-forward.
    """
    from sklearn.preprocessing import StandardScaler

    df = build_features(df, pitcher_stats_by_season)
    df = df.dropna(subset=FEATURE_COLS)

    X = df[FEATURE_COLS].values
    y = df["home_win"].values

    model = make_model(model_type)
    model.fit(X, y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "feature_cols": FEATURE_COLS}, f)

    print(f"✅ Model saved to {MODEL_PATH}")
    return model


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Run train_and_save() first."
        )
    with open(MODEL_PATH, "rb") as f:
        payload = pickle.load(f)
    return payload["model"], payload["feature_cols"]


# ---------------------------------------------------------------------------
# Fetch today's schedule
# ---------------------------------------------------------------------------

def get_todays_games(target_date: str = None) -> pd.DataFrame:
    """
    Pull today's scheduled games from the MLB Stats API.
    Returns a DataFrame with home_id, away_id, home_name, away_name, gamePk.
    """
    from data_fetcher import _get, BASE

    if target_date is None:
        target_date = date.today().isoformat()

    data = _get(f"{BASE}/schedule", params={
        "sportId": 1,
        "date": target_date,
        "gameType": "R",
    })

    games = []
    for date_block in data.get("dates", []):
        for g in date_block.get("games", []):
            home = g["teams"]["home"]
            away = g["teams"]["away"]
            games.append({
                "gamePk":    g["gamePk"],
                "date":      pd.Timestamp(target_date),
                "home_id":   home["team"]["id"],
                "home_name": home["team"]["name"],
                "away_id":   away["team"]["id"],
                "away_name": away["team"]["name"],
                "home_score": 0,
                "away_score": 0,
                "home_win":   0,   # placeholder
                "season":    int(target_date[:4]),
            })

    return pd.DataFrame(games)


# ---------------------------------------------------------------------------
# Build features for today using historical context
# ---------------------------------------------------------------------------

def build_prediction_features(today_df: pd.DataFrame,
                                history_df: pd.DataFrame,
                                pitcher_stats_by_season: dict = None) -> pd.DataFrame:
    """
    Concatenate historical games + today's games, run feature engineering,
    then extract just today's rows.

    history_df: full historical game log (what the model was trained on)
    today_df:   today's games (scores = 0, home_win = placeholder)
    """
    today_pks = set(today_df["gamePk"])

    combined = pd.concat([history_df, today_df], ignore_index=True)
    combined = combined.sort_values("date").reset_index(drop=True)

    # Add season if missing
    if "season" not in combined.columns:
        combined["season"] = combined["date"].dt.year

    combined = build_features(combined, pitcher_stats_by_season)

    # Extract only today's games
    today_features = combined[combined["gamePk"].isin(today_pks)].copy()
    return today_features


# ---------------------------------------------------------------------------
# Format predictions as a nice table
# ---------------------------------------------------------------------------

def format_predictions(pred_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in pred_df.iterrows():
        prob = row["home_win_prob"]
        grade = row["grade"]

        if prob >= 0.5:
            pick  = row["home_name"]
            pick_prob = prob
        else:
            pick  = row["away_name"]
            pick_prob = 1 - prob

        rows.append({
            "Matchup":    f"{row['away_name']} @ {row['home_name']}",
            "Pick":       pick,
            "Win Prob":   f"{pick_prob:.1%}",
            "Grade":      grade,
            "Home Prob":  f"{prob:.1%}",
            "Elo Diff":   f"{row.get('elo_diff', 0):.1f}",
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def append_to_record(pred_df: pd.DataFrame, today_features: pd.DataFrame,
                     target_date: str) -> None:
    """Append today's raw predictions to the running record CSV."""
    rows = []
    for _, feat_row in today_features.iterrows():
        prob = feat_row["home_win_prob"]
        grade = feat_row["grade"]
        pick = feat_row["home_name"] if prob >= 0.5 else feat_row["away_name"]
        pick_prob = prob if prob >= 0.5 else 1 - prob
        rows.append({
            "date":          target_date,
            "gamePk":        feat_row["gamePk"],
            "away_name":     feat_row["away_name"],
            "home_name":     feat_row["home_name"],
            "pick":          pick,
            "pick_prob":     round(float(pick_prob), 4),
            "grade":         grade,
            "home_win_prob": round(float(prob), 4),
            "elo_diff":      round(float(feat_row.get("elo_diff", 0)), 2),
        })

    new_rows = pd.DataFrame(rows)

    if RECORD_PATH.exists():
        existing = pd.read_csv(RECORD_PATH, dtype={"gamePk": str})
        new_rows["gamePk"] = new_rows["gamePk"].astype(str)
        # Skip games already logged for this date
        key = existing["date"].astype(str) + "_" + existing["gamePk"].astype(str)
        new_key = new_rows["date"].astype(str) + "_" + new_rows["gamePk"].astype(str)
        new_rows = new_rows[~new_key.isin(key)]
        combined = pd.concat([existing, new_rows], ignore_index=True)
    else:
        new_rows["gamePk"] = new_rows["gamePk"].astype(str)
        combined = new_rows

    combined.to_csv(RECORD_PATH, index=False)
    if len(new_rows) > 0:
        print(f"📋 Appended {len(new_rows)} predictions to {RECORD_PATH}")
    else:
        print(f"📋 {target_date} already in record — skipped")


def predict(target_date: str = None, history_df: pd.DataFrame = None,
            model_type: str = "gbm", retrain: bool = False,
            pitcher_stats_by_season: dict = None):
    """
    Generate predictions for a given date.

    Args:
        target_date:  ISO date string, defaults to today
        history_df:   Historical game DataFrame for feature context
        model_type:   Model type if retraining
        retrain:      Force retrain from history_df
    """
    if target_date is None:
        target_date = date.today().isoformat()

    print(f"\n⚾ Game 163 Predictions for {target_date}")
    print("=" * 55)

    # Load or train model
    if retrain and history_df is not None:
        print("🔧 Training model on historical data...")
        model = train_and_save(history_df, model_type, pitcher_stats_by_season)
        feat_cols = FEATURE_COLS
    else:
        try:
            model, feat_cols = load_model()
            print("✅ Loaded pre-trained model")
        except FileNotFoundError:
            if history_df is not None:
                print("⚠️  No saved model found — training now...")
                model = train_and_save(history_df, model_type, pitcher_stats_by_season)
                feat_cols = FEATURE_COLS
            else:
                raise

    # Fetch today's games
    try:
        today_df = get_todays_games(target_date)
        if today_df.empty:
            print("No games scheduled today.")
            return None
        print(f"📅 {len(today_df)} games scheduled")
    except Exception as e:
        print(f"⚠️  Could not fetch schedule: {e}")
        return None

    # Build features (needs history for rolling stats)
    if history_df is not None:
        today_features = build_prediction_features(today_df, history_df,
                                                    pitcher_stats_by_season)
    else:
        today_features = build_features(today_df, pitcher_stats_by_season)

    if today_features.empty:
        print("Could not build features for today's games.")
        return None

    today_features = today_features.fillna(0)
    X = today_features[feat_cols].values
    probs = model.predict_proba(X)[:, 1]

    today_features = today_features.copy()
    today_features["home_win_prob"] = probs
    today_features["grade"] = [grade_pick(p) for p in probs]

    preds = format_predictions(today_features)

    # Display
    print()
    print(preds.to_string(index=False))
    print()

    # Grade summary
    for g in ["A", "B", "C"]:
        n = (today_features["grade"] == g).sum()
        if n > 0:
            print(f"  Grade {g}: {n} pick{'s' if n > 1 else ''}")

    # Save daily snapshot (display CSV for humans)
    out_path = PREDS_DIR / f"predictions_{target_date}.csv"
    preds.to_csv(out_path, index=False)
    print(f"\n💾 Saved to {out_path}")

    # Save raw CSV for the API backend
    raw_cols = ["gamePk", "date", "away_name", "home_name", "home_score", "away_score",
                "home_win_prob", "grade", "elo_diff"]
    raw = today_features[[c for c in raw_cols if c in today_features.columns]].copy()
    raw["pick"]      = today_features.apply(
        lambda r: r["home_name"] if r["home_win_prob"] >= 0.5 else r["away_name"], axis=1)
    raw["pick_prob"] = today_features["home_win_prob"].apply(
        lambda p: p if p >= 0.5 else 1 - p)
    raw.to_csv(PREDS_DIR / f"predictions_raw_{target_date}.csv", index=False)

    # Append to running record
    append_to_record(preds, today_features, target_date)

    return today_features


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Game 163 MLB Predictor")
    parser.add_argument("--date",   default=None, help="Date (YYYY-MM-DD), default=today")
    parser.add_argument("--model",  default="gbm", choices=["gbm", "lr", "rf"])
    parser.add_argument("--retrain", action="store_true", help="Retrain model from history")
    parser.add_argument("--seasons", nargs="+", type=int,
                        default=[2021, 2022, 2023, 2024],
                        help="Seasons to use for training context")
    args = parser.parse_args()

    # If retrain, load history first
    history = None
    if args.retrain or not MODEL_PATH.exists():
        from data_fetcher import fetch_season
        print(f"📥 Loading historical data for seasons: {args.seasons}")
        dfs = []
        for s in args.seasons:
            try:
                dfs.append(fetch_season(s))
            except Exception as e:
                print(f"  ⚠️  Could not load {s}: {e}")
        if dfs:
            history = pd.concat(dfs, ignore_index=True)
            history["season"] = history["date"].dt.year

    predict(
        target_date=args.date,
        history_df=history,
        model_type=args.model,
        retrain=args.retrain,
    )
