"""
run.py
------
Game 163 MLB win-probability model — top-level runner.

Steps:
  1. Fetch raw game data from the free MLB Stats API
  2. Build lag-safe features (Elo, rolling form, rest, pitcher ERA/WHIP)
  3. Walk-forward validate across seasons (no data leakage)
  4. Print performance report & save results CSV

Usage:
    # Full pipeline (fetch + validate)
    python run.py

    # Use cached data (skip API calls)
    python run.py --no-fetch

    # Try different model
    python run.py --model lr

    # Just today's predictions (requires prior run)
    python run.py --predict-only
"""

import argparse
import pandas as pd
from pathlib import Path

CACHE_PATH          = Path(__file__).parent / "cache" / "all_seasons.parquet"
PITCHER_ASSIGN_PATH = Path(__file__).parent / "cache" / "pitcher_assignments.parquet"


def load_or_fetch(seasons: list[int], force_fetch: bool = False) -> pd.DataFrame:
    from data_fetcher import fetch_season

    if CACHE_PATH.exists() and not force_fetch:
        print(f"📂 Loading cached data from {CACHE_PATH}")
        df = pd.read_parquet(CACHE_PATH)
        cached_seasons = set(df["season"].unique())
        missing = [s for s in seasons if s not in cached_seasons]
        if missing:
            print(f"  Fetching missing seasons: {missing}")
            extra = [fetch_season(s) for s in missing]
            df = pd.concat([df] + extra, ignore_index=True)
            df.to_parquet(CACHE_PATH, index=False)
        return df

    print(f"📥 Fetching seasons: {seasons}")
    dfs = []
    for s in seasons:
        try:
            dfs.append(fetch_season(s))
            print(f"  ✓ {s}")
        except Exception as e:
            print(f"  ⚠️ {s} failed: {e}")

    df = pd.concat(dfs, ignore_index=True)
    df["season"] = df["date"].dt.year
    CACHE_PATH.parent.mkdir(exist_ok=True)
    df.to_parquet(CACHE_PATH, index=False)
    print(f"💾 Saved combined data to {CACHE_PATH}")
    return df


def load_or_fetch_pitchers(seasons: list[int]) -> tuple[pd.DataFrame, dict]:
    """
    Fetch pitcher assignments (who started each game) and prior-season ERA/WHIP.

    Returns:
        assignments: DataFrame[gamePk, home_pitcher_id, away_pitcher_id]
        stats_by_season: {prior_season: DataFrame(index=pitcher_id, cols=[era, whip])}

    All data is cached; subsequent calls are instant.
    """
    from data_fetcher import fetch_season, fetch_pitcher_stats

    assign_frames = []
    pids_by_season: dict[int, set] = {}

    for s in seasons:
        print(f"\n  Fetching pitcher assignments for {s} (one API call per game, cached)...")
        df_s = fetch_season(s, include_pitchers=True)
        if "home_pitcher_id" not in df_s.columns:
            continue
        assign_frames.append(df_s[["gamePk", "home_pitcher_id", "away_pitcher_id"]].copy())
        pids: set[int] = set()
        pids.update(df_s["home_pitcher_id"].dropna().astype(int).tolist())
        pids.update(df_s["away_pitcher_id"].dropna().astype(int).tolist())
        pids_by_season[s] = pids

    if assign_frames:
        assignments = pd.concat(assign_frames, ignore_index=True).drop_duplicates("gamePk")
        assignments.to_parquet(PITCHER_ASSIGN_PATH, index=False)
        print(f"  💾 Pitcher assignments saved ({len(assignments):,} games)")
    else:
        assignments = pd.DataFrame(columns=["gamePk", "home_pitcher_id", "away_pitcher_id"])

    stats_by_season: dict[int, pd.DataFrame] = {}
    for s, pids in pids_by_season.items():
        prior = s - 1
        print(f"  Fetching ERA/WHIP for {prior} (used in {s} predictions)...")
        stats_by_season[prior] = fetch_pitcher_stats(prior, pids)

    return assignments, stats_by_season


def print_report(overall: dict, by_season: pd.DataFrame):
    print("\n" + "=" * 55)
    print("  ⚾  DIAMONDCAST MODEL PERFORMANCE REPORT")
    print("=" * 55)

    print(f"""
  Overall Accuracy : {overall['accuracy']:.1%}
  vs Home Baseline : +{overall['vs_baseline']:.1%}
  Log Loss         : {overall['log_loss']:.3f}
  Brier Score      : {overall['brier_score']:.3f}
  Total Games      : {overall['n_games']:,}

  Accuracy by Grade:
    A picks : {overall.get('acc_grade_A', 0):.1%}  ({overall.get('n_grade_A', 0):,} games)
    B picks : {overall.get('acc_grade_B', 0):.1%}  ({overall.get('n_grade_B', 0):,} games)
    C picks : {overall.get('acc_grade_C', 0):.1%}  ({overall.get('n_grade_C', 0):,} games)
""")

    print("  Season Breakdown:")
    print("  " + "-" * 51)
    print(f"  {'Season':<8} {'Accuracy':>9} {'vs Base':>8} {'Log Loss':>9} {'Games':>7}")
    print("  " + "-" * 51)
    for _, row in by_season.iterrows():
        vs = f"+{row['vs_baseline']:.1%}" if row['vs_baseline'] >= 0 else f"{row['vs_baseline']:.1%}"
        print(f"  {int(row['season']):<8} {row['accuracy']:>9.1%} {vs:>8} {row['log_loss']:>9.3f} {int(row['n_games']):>7,}")
    print("  " + "-" * 51)
    print()


def main():
    parser = argparse.ArgumentParser(description="Game 163 MLB model runner")
    parser.add_argument("--seasons", nargs="+", type=int,
                        default=[2019, 2020, 2021, 2022, 2023, 2024],
                        help="MLB seasons to use (default: 2019-2024)")
    parser.add_argument("--model", choices=["gbm", "lr", "rf"], default="gbm",
                        help="Model type (gbm=GradientBoosting, lr=Logistic, rf=RandomForest)")
    parser.add_argument("--no-fetch", action="store_true",
                        help="Use cached data only, no API calls")
    parser.add_argument("--no-pitchers", action="store_true",
                        help="Skip pitcher data fetch (faster, less accurate)")
    parser.add_argument("--pitcher-seasons", nargs="+", type=int, default=None,
                        help="Seasons to fetch pitcher data for (default: last 3)")
    parser.add_argument("--predict-only", action="store_true",
                        help="Skip training, just generate today's predictions")
    parser.add_argument("--date", default=None,
                        help="Date for predictions (YYYY-MM-DD), default=today")
    args = parser.parse_args()

    # 1. Load game data
    df = load_or_fetch(args.seasons, force_fetch=not args.no_fetch)
    print(f"\n📊 {len(df):,} games loaded across {df['season'].nunique()} seasons")

    # 2. Fetch pitcher data (last 3 seasons by default; skip with --no-pitchers)
    assignments = pd.DataFrame()
    pitcher_stats_by_season: dict = {}

    if not args.no_pitchers:
        pitcher_seasons = args.pitcher_seasons or sorted(args.seasons)[-3:]
        print(f"\n⚾ Fetching pitcher data for seasons: {pitcher_seasons}")
        assignments, pitcher_stats_by_season = load_or_fetch_pitchers(pitcher_seasons)

        if not assignments.empty:
            df = df.drop(columns=["home_pitcher_id", "away_pitcher_id"], errors="ignore")
            df = df.merge(assignments, on="gamePk", how="left")
            populated = df["home_pitcher_id"].notna().sum()
            print(f"  ✓ Pitcher IDs populated for {populated:,}/{len(df):,} games")
            if pitcher_stats_by_season:
                total_pitchers = sum(len(v) for v in pitcher_stats_by_season.values())
                print(f"  ✓ ERA/WHIP loaded for {total_pitchers:,} pitcher-seasons")

    if args.predict_only:
        from predict_today import predict
        predict(target_date=args.date, history_df=df,
                pitcher_stats_by_season=pitcher_stats_by_season)
        return

    # 3. Run pipeline
    from model import run_pipeline
    output = run_pipeline(df, model_type=args.model,
                          pitcher_stats_by_season=pitcher_stats_by_season)

    # 4. Print report
    print_report(output["overall"], output["by_season"])

    # 5. Save production model and generate today's predictions
    try:
        from predict_today import predict, train_and_save
        print("🔧 Saving production model for daily predictions...")
        train_and_save(df, model_type=args.model,
                       pitcher_stats_by_season=pitcher_stats_by_season)
        predict(target_date=args.date, history_df=df,
                pitcher_stats_by_season=pitcher_stats_by_season)
    except Exception as e:
        print(f"\n⚠️  Could not generate today's predictions: {e}")
        print("    (This is expected if there are no games today or no network access)")


if __name__ == "__main__":
    main()
