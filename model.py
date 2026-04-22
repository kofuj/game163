"""
model.py
--------
Trains an MLB win-probability model using walk-forward (time-series) validation.
Designed to be a drop-in for XGBoost — just swap the classifier below.

Pipeline:
  1. Load multi-season game data
  2. Build features (Elo + rolling stats + pitcher quality)
  3. Walk-forward validation: train on seasons 1..N-1, test on season N
  4. Calibrate probabilities with isotonic regression
  5. Grade picks (A / B / C) and compute performance metrics
  6. Save results to CSV
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score

from features import build_features, FEATURE_COLS, TARGET_COL

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Model factory
# ---------------------------------------------------------------------------

def make_model(model_type: str = "gbm") -> Pipeline:
    """
    Returns a calibrated sklearn Pipeline.

    model_type options:
      "gbm"   → GradientBoostingClassifier  (default, strong baseline)
      "lr"    → LogisticRegression          (fast, interpretable)
      "rf"    → RandomForestClassifier      (good with limited data)

    To use XGBoost (install with: pip install xgboost):
      from xgboost import XGBClassifier
      base = XGBClassifier(n_estimators=300, max_depth=4,
                           learning_rate=0.05, subsample=0.8,
                           use_label_encoder=False, eval_metric="logloss")
    """
    if model_type == "gbm":
        base = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=20,
            random_state=42,
        )
    elif model_type == "lr":
        base = LogisticRegression(C=1.0, max_iter=500, random_state=42)
    elif model_type == "rf":
        base = RandomForestClassifier(
            n_estimators=300, max_depth=6,
            min_samples_leaf=20, random_state=42,
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    # Wrap in calibration (isotonic regression fixes overconfident probabilities)
    calibrated = CalibratedClassifierCV(base, method="isotonic", cv=3)

    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", calibrated),
    ])


# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------

def grade_pick(prob: float) -> str:
    """
    A = edge ≥ 15 pts from 50% (prob ≥ 0.65 or ≤ 0.35)
    B = edge 8–15 pts       (prob 0.58–0.65 or 0.35–0.42)
    C = edge < 8 pts        (prob 0.42–0.58)
    """
    edge = abs(prob - 0.5)
    if edge >= 0.15:
        return "A"
    elif edge >= 0.08:
        return "B"
    else:
        return "C"


# ---------------------------------------------------------------------------
# Walk-forward validation
# ---------------------------------------------------------------------------

def walk_forward_validate(df: pd.DataFrame,
                           model_type: str = "gbm",
                           min_train_seasons: int = 2) -> pd.DataFrame:
    """
    Walk-forward (expanding window) validation.

    For each test season:
      - Train on all prior seasons
      - Predict on the test season
      - Never expose future data to the model

    Returns a DataFrame with one row per game including predictions.
    """
    seasons = sorted(df["season"].unique())
    if len(seasons) < min_train_seasons + 1:
        raise ValueError(f"Need at least {min_train_seasons + 1} seasons of data.")

    all_results = []

    for i, test_season in enumerate(seasons[min_train_seasons:], start=min_train_seasons):
        train_seasons = seasons[:i]
        print(f"\n  📅 Test season: {test_season} | Train on: {train_seasons}")

        train_df = df[df["season"].isin(train_seasons)].copy()
        test_df  = df[df["season"] == test_season].copy()

        # Drop rows with too many NaN features
        train_df = train_df.dropna(subset=FEATURE_COLS)
        test_df  = test_df.dropna(subset=FEATURE_COLS)

        if len(train_df) < 100 or len(test_df) < 10:
            print(f"    ⚠️  Skipping — insufficient data.")
            continue

        X_train = train_df[FEATURE_COLS].values
        y_train = train_df[TARGET_COL].values
        X_test  = test_df[FEATURE_COLS].values
        y_test  = test_df[TARGET_COL].values

        model = make_model(model_type)
        model.fit(X_train, y_train)

        probs = model.predict_proba(X_test)[:, 1]  # P(home win)

        test_df = test_df.copy()
        test_df["home_win_prob"] = probs
        test_df["predicted_winner"] = np.where(probs >= 0.5, "home", "away")
        test_df["correct"] = (
            ((probs >= 0.5) & (y_test == 1)) |
            ((probs < 0.5)  & (y_test == 0))
        ).astype(int)
        test_df["grade"] = [grade_pick(p) for p in probs]
        test_df["model_type"] = model_type

        acc = accuracy_score(y_test, (probs >= 0.5).astype(int))
        ll  = log_loss(y_test, probs)
        bs  = brier_score_loss(y_test, probs)
        print(f"    Accuracy: {acc:.3f} | Log Loss: {ll:.3f} | Brier: {bs:.3f} | n={len(test_df)}")

        all_results.append(test_df)

    return pd.concat(all_results, ignore_index=True)


# ---------------------------------------------------------------------------
# Season-level summary
# ---------------------------------------------------------------------------

def season_summary(results: pd.DataFrame, baseline: float = 0.542) -> pd.DataFrame:
    """
    Compute per-season accuracy, log loss, and grade breakdown.
    """
    rows = []
    for season, grp in results.groupby("season"):
        y     = grp[TARGET_COL].values
        probs = grp["home_win_prob"].values
        preds = (probs >= 0.5).astype(int)

        acc = accuracy_score(y, preds)
        ll  = log_loss(y, probs)
        bs  = brier_score_loss(y, probs)

        grade_accs = {}
        for g in ["A", "B", "C"]:
            g_mask = grp["grade"] == g
            if g_mask.sum() > 0:
                g_acc = accuracy_score(y[g_mask], preds[g_mask])
                grade_accs[f"acc_grade_{g}"] = round(g_acc, 4)
                grade_accs[f"n_grade_{g}"]   = int(g_mask.sum())

        rows.append({
            "season":       season,
            "accuracy":     round(acc, 4),
            "vs_baseline":  round(acc - baseline, 4),
            "log_loss":     round(ll, 4),
            "brier_score":  round(bs, 4),
            "n_games":      len(grp),
            **grade_accs,
        })

    return pd.DataFrame(rows)


def overall_summary(results: pd.DataFrame, baseline: float = 0.542) -> dict:
    y     = results[TARGET_COL].values
    probs = results["home_win_prob"].values
    preds = (probs >= 0.5).astype(int)

    summary = {
        "accuracy":    round(accuracy_score(y, preds), 4),
        "log_loss":    round(log_loss(y, probs), 4),
        "brier_score": round(brier_score_loss(y, probs), 4),
        "n_games":     len(results),
        "vs_baseline": round(accuracy_score(y, preds) - baseline, 4),
    }

    for g in ["A", "B", "C"]:
        mask = results["grade"] == g
        if mask.sum() > 0:
            gp = probs[mask]
            gy = y[mask]
            summary[f"acc_grade_{g}"] = round(accuracy_score(gy, (gp >= 0.5).astype(int)), 4)
            summary[f"n_grade_{g}"]   = int(mask.sum())

    return summary


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def run_pipeline(df_raw: pd.DataFrame,
                 model_type: str = "gbm",
                 pitcher_stats_by_season: dict = None,
                 baseline: float = 0.542) -> dict:
    """
    Full end-to-end pipeline. Pass in raw game DataFrame.
    Returns dict with keys: results_df, season_df, overall.
    """
    print("\n🔧 Building features...")
    df = build_features(df_raw, pitcher_stats_by_season)
    print(f"   {len(df)} games after feature engineering")

    print("\n🔄 Running walk-forward validation...")
    results = walk_forward_validate(df, model_type=model_type)

    print("\n📊 Computing summaries...")
    season_df = season_summary(results, baseline)
    overall   = overall_summary(results, baseline)

    print("\n✅ Overall performance:")
    for k, v in overall.items():
        print(f"   {k}: {v}")

    # Save
    results.to_csv(RESULTS_DIR / "predictions.csv", index=False)
    season_df.to_csv(RESULTS_DIR / "season_summary.csv", index=False)
    print(f"\n💾 Results saved to {RESULTS_DIR}/")

    return {"results": results, "by_season": season_df, "overall": overall}


# ---------------------------------------------------------------------------
# Smoke test with synthetic data
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    np.random.seed(42)
    print("🔬 Running smoke test with synthetic data...\n")

    seasons_data = []
    team_ids = list(range(1, 31))

    for season in range(2020, 2025):
        n = 1200   # ~162 games × 30 teams / 2
        home_ids = np.random.choice(team_ids, n)
        away_ids = np.random.choice(team_ids, n)

        # Simulate some teams being better
        team_strength = {t: np.random.normal(0, 0.15) for t in team_ids}
        home_win_probs = np.array([
            1 / (1 + np.exp(-(team_strength[h] - team_strength[a] + 0.1)))
            for h, a in zip(home_ids, away_ids)
        ])
        home_wins = (np.random.uniform(size=n) < home_win_probs).astype(int)

        df_season = pd.DataFrame({
            "gamePk":     range(season * 10000, season * 10000 + n),
            "date":       pd.date_range(f"{season}-04-01", periods=n, freq="8h"),
            "season":     season,
            "home_id":    home_ids,
            "away_id":    away_ids,
            "home_name":  [f"Team{h}" for h in home_ids],
            "away_name":  [f"Team{a}" for a in away_ids],
            "home_score": np.random.poisson(4.3, n),
            "away_score": np.random.poisson(4.3, n),
            "home_win":   home_wins,
        })
        seasons_data.append(df_season)

    df_raw = pd.concat(seasons_data, ignore_index=True)
    print(f"Synthetic dataset: {len(df_raw)} games across {df_raw['season'].nunique()} seasons")

    output = run_pipeline(df_raw, model_type="gbm")
    print("\nSeason breakdown:")
    print(output["by_season"].to_string(index=False))
