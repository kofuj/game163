"""
features.py
-----------
Builds rolling, lag-safe features from raw game logs.
Every feature is computed using only information available
BEFORE the game starts — no data leakage.

Feature groups:
  1. Elo ratings (rolling, updated after each game)
  2. Bayesian team strength (Beta-Binomial posteriors)
  3. Recent form (last 10 / last 30 games)
  4. Rest days
  5. Home/away splits
  6. Pitcher quality (ERA, WHIP — prior season or rolling)
  7. Run differential trends
"""

import math
import pandas as pd
import numpy as np
from typing import Optional


# ---------------------------------------------------------------------------
# 1. Elo engine
# ---------------------------------------------------------------------------

ELO_K       = 20      # learning rate — how fast ratings update
ELO_BASE    = 1500    # starting rating for every team
ELO_HOME    = 35      # home-field advantage in Elo points (~54% win prob)
REGRESS     = 0.33    # pull ratings 1/3 toward mean between seasons


def expected_win(rating_a: float, rating_b: float) -> float:
    """Standard Elo expected score for team A vs team B."""
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def update_elo(winner: float, loser: float, k: float = ELO_K) -> tuple[float, float]:
    """Return (new_winner_elo, new_loser_elo)."""
    exp = expected_win(winner, loser)
    return winner + k * (1 - exp), loser + k * (0 - (1 - exp))


def apply_elo(df: pd.DataFrame, season_col: str = "season") -> pd.DataFrame:
    """
    Adds pre-game Elo columns to df (sorted by date).
    Applies seasonal regression between seasons.

    New columns:
        home_elo_pre, away_elo_pre,
        home_elo_post, away_elo_post,
        elo_diff (home - away, includes home field)
        elo_win_prob (home win probability from Elo alone)
    """
    df = df.sort_values("date").copy()
    ratings: dict[int, float] = {}
    current_season = None

    home_elo_pre, away_elo_pre = [], []
    home_elo_post, away_elo_post = [], []

    for _, row in df.iterrows():
        hid, aid = int(row["home_id"]), int(row["away_id"])
        season = row.get(season_col, None)

        # Seasonal regression toward mean
        if season != current_season and current_season is not None:
            for tid in ratings:
                ratings[tid] = ELO_BASE + REGRESS * (ELO_BASE - ratings[tid]) * -1
                # simpler: pull 1/3 of the way back to 1500
                ratings[tid] = ratings[tid] + REGRESS * (ELO_BASE - ratings[tid])
        current_season = season

        h_pre = ratings.get(hid, ELO_BASE)
        a_pre = ratings.get(aid, ELO_BASE)

        home_elo_pre.append(h_pre)
        away_elo_pre.append(a_pre)

        home_win = int(row["home_win"])
        if home_win:
            h_post, a_post = update_elo(h_pre + ELO_HOME, a_pre)
        else:
            a_post, h_post = update_elo(a_pre, h_pre + ELO_HOME)

        ratings[hid] = h_post
        ratings[aid] = a_post
        home_elo_post.append(h_post)
        away_elo_post.append(a_post)

    df["home_elo_pre"]  = home_elo_pre
    df["away_elo_pre"]  = away_elo_pre
    df["home_elo_post"] = home_elo_post
    df["away_elo_post"] = away_elo_post

    df["elo_diff"]     = (df["home_elo_pre"] + ELO_HOME) - df["away_elo_pre"]
    df["elo_win_prob"] = df["elo_diff"].apply(lambda d: expected_win(ELO_BASE + d, ELO_BASE))

    return df


# ---------------------------------------------------------------------------
# 2. Bayesian Team Strength (Beta-Binomial)
# ---------------------------------------------------------------------------

class BayesianTeamStrength:
    """
    Maintains a Beta(alpha, beta) posterior over each team's true win rate.

    Why Beta-Binomial?
    - Conjugate prior for a Bernoulli process (win/loss)
    - Closed-form updates: win → alpha += 1, loss → beta += 1
    - Posterior mean = alpha/(alpha+beta) shrinks toward .500 early in season
    - Posterior std quantifies uncertainty — unlike Elo, which has none
    - Seasonal regression pulls estimates back toward the prior

    Compared to Elo:
    - Elo captures relative strength via head-to-head differences
    - Bayesian model captures absolute win rate with a full posterior distribution
    - Using both gives complementary information to the classifier
    """

    PRIOR_W  = 5.0    # pseudo-wins  (~ 10-game uninformative prior at .500)
    PRIOR_L  = 5.0    # pseudo-losses
    REGRESS  = 0.30   # pull 30% back to prior between seasons
    HOME_ADV = 0.035  # empirical home-field boost in win probability

    def __init__(self):
        self._alpha: dict[int, float] = {}
        self._beta:  dict[int, float] = {}

    def _ab(self, tid: int) -> tuple[float, float]:
        return self._alpha.get(tid, self.PRIOR_W), self._beta.get(tid, self.PRIOR_L)

    def mean(self, tid: int) -> float:
        """Posterior win-rate estimate: E[theta] = alpha/(alpha+beta)."""
        a, b = self._ab(tid)
        return a / (a + b)

    def std(self, tid: int) -> float:
        """Posterior uncertainty: sqrt(Var[theta]) for Beta(alpha, beta)."""
        a, b = self._ab(tid)
        n = a + b
        return math.sqrt(a * b / (n * n * (n + 1)))

    def win_prob(self, home_id: int, away_id: int) -> float:
        """
        P(home wins) via normal approximation of P(X_home > X_away),
        where X_home ~ Beta(α_h, β_h) and X_away ~ Beta(α_a, β_a).

        Normal approximation: P(D > 0) ≈ Φ(μ_D / σ_D)
        where D = X_home + HOME_ADV - X_away.
        """
        mu_h = self.mean(home_id) + self.HOME_ADV
        mu_a = self.mean(away_id)
        sigma = math.sqrt(self.std(home_id) ** 2 + self.std(away_id) ** 2 + 1e-9)
        z = (mu_h - mu_a) / sigma
        # Standard normal CDF via math.erf (no scipy needed)
        return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))

    def update(self, winner_id: int, loser_id: int) -> None:
        """Update posteriors after a game result."""
        aw, _  = self._ab(winner_id)
        _,  bl = self._ab(loser_id)
        self._alpha[winner_id] = aw + 1.0
        self._beta[loser_id]   = bl + 1.0

    def regress_to_prior(self) -> None:
        """
        Apply seasonal regression: pull each team's posterior REGRESS
        of the way back toward Beta(PRIOR_W, PRIOR_L).
        Prevents stale estimates from dominating in a new season.
        """
        r = self.REGRESS
        for tid in list(self._alpha.keys()):
            a, b = self._ab(tid)
            self._alpha[tid] = a * (1 - r) + self.PRIOR_W * r
            self._beta[tid]  = b * (1 - r) + self.PRIOR_L * r


def apply_bayesian_ratings(df: pd.DataFrame, season_col: str = "season") -> pd.DataFrame:
    """
    Walk through games in chronological order, maintaining Beta posteriors
    for each team, and stamp each row with PRE-GAME Bayesian strength estimates.

    No data leakage: posteriors are updated AFTER each row is stamped.

    New columns:
        home_bayes_mean  — posterior win-rate mean for home team
        away_bayes_mean  — posterior win-rate mean for away team
        home_bayes_std   — posterior uncertainty (σ) for home team
        away_bayes_std   — posterior uncertainty (σ) for away team
        bayes_win_prob   — P(home wins) via Beta-Beta normal approximation
        bayes_diff       — home_bayes_mean − away_bayes_mean (signed edge)
    """
    df = df.sort_values("date").copy()
    bts = BayesianTeamStrength()
    current_season = None

    h_mean, a_mean = [], []
    h_std,  a_std  = [], []
    b_prob         = []

    for _, row in df.iterrows():
        hid    = int(row["home_id"])
        aid    = int(row["away_id"])
        season = row.get(season_col)

        if season != current_season and current_season is not None:
            bts.regress_to_prior()
        current_season = season

        # Stamp pre-game estimates BEFORE updating
        h_mean.append(bts.mean(hid))
        a_mean.append(bts.mean(aid))
        h_std.append(bts.std(hid))
        a_std.append(bts.std(aid))
        b_prob.append(bts.win_prob(hid, aid))

        # Update posterior with actual result
        if int(row["home_win"]):
            bts.update(hid, aid)
        else:
            bts.update(aid, hid)

    df["home_bayes_mean"] = h_mean
    df["away_bayes_mean"] = a_mean
    df["home_bayes_std"]  = h_std
    df["away_bayes_std"]  = a_std
    df["bayes_win_prob"]  = b_prob
    df["bayes_diff"]      = df["home_bayes_mean"] - df["away_bayes_mean"]

    return df


# ---------------------------------------------------------------------------
# 3. Rolling team stats (lag-safe)
# ---------------------------------------------------------------------------

def _rolling_team_stat(df: pd.DataFrame, team_id_col: str,
                        value_col: str, window: int, new_col: str) -> pd.Series:
    """
    For each row, compute rolling mean of `value_col` over the last `window`
    games played by the team identified by `team_id_col`.
    Uses shift(1) to exclude the current game (no leakage).
    """
    result = pd.Series(index=df.index, dtype=float)
    for tid, grp in df.groupby(team_id_col):
        rolled = grp[value_col].shift(1).rolling(window, min_periods=max(1, window // 2)).mean()
        result.loc[grp.index] = rolled
    return result


def build_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Requires df to have separate home/away rows per game OR we create long form
    internally, compute stats, then pivot back.

    Works directly on the wide-format game df (one row per game).
    """
    df = df.copy().sort_values("date").reset_index(drop=True)

    # Create a "long" view: one row per team per game
    home_rows = df[["date", "gamePk", "home_id", "home_score", "away_score", "home_win"]].copy()
    home_rows.columns = ["date", "gamePk", "team_id", "runs_scored", "runs_allowed", "win"]
    home_rows["is_home"] = 1

    away_rows = df[["date", "gamePk", "away_id", "away_score", "home_score", "home_win"]].copy()
    away_rows.columns = ["date", "gamePk", "team_id", "runs_scored", "runs_allowed", "win"]
    away_rows["win"] = 1 - away_rows["win"]
    away_rows["is_home"] = 0

    long = pd.concat([home_rows, away_rows]).sort_values(["date", "gamePk"]).reset_index(drop=True)
    long["run_diff"] = long["runs_scored"] - long["runs_allowed"]

    # Rolling stats per team (shift to avoid leakage)
    for window, suffix in [(10, "L10"), (30, "L30")]:
        for col in ["win", "runs_scored", "run_diff"]:
            long[f"{col}_{suffix}"] = (
                long.groupby("team_id")[col]
                    .transform(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
            )

    # Rest days
    long["rest_days"] = (
        long.groupby("team_id")["date"]
            .transform(lambda s: s.diff().dt.days.fillna(3).clip(0, 14))
    )

    # Separate back to home/away (drop dupes so gamePk index is unique)
    home_stats = long[long["is_home"] == 1].drop_duplicates("gamePk").set_index("gamePk")
    away_stats = long[long["is_home"] == 0].drop_duplicates("gamePk").set_index("gamePk")

    stat_cols = ["win_L10", "win_L30", "runs_scored_L10", "run_diff_L10",
                 "run_diff_L30", "rest_days"]

    for col in stat_cols:
        df[f"home_{col}"] = df["gamePk"].map(home_stats[col])
        df[f"away_{col}"] = df["gamePk"].map(away_stats[col])
        df[f"diff_{col}"] = df[f"home_{col}"] - df[f"away_{col}"]

    return df


# ---------------------------------------------------------------------------
# 3. Pitcher features
# ---------------------------------------------------------------------------

def add_pitcher_features(df: pd.DataFrame,
                          pitcher_stats_by_season: Optional[dict] = None) -> pd.DataFrame:
    """
    Merge prior-season pitcher ERA and WHIP onto each game.

    pitcher_stats_by_season: dict mapping {prior_season_int: DataFrame}
        where each DataFrame has index=pitcher_id and cols [era, whip].
        Games in season N use stats from season N-1 (no leakage).
    """
    league_avg_era  = 4.30
    league_avg_whip = 1.32

    if (pitcher_stats_by_season is None
            or not pitcher_stats_by_season
            or "home_pitcher_id" not in df.columns):
        df["home_pitcher_era"]  = league_avg_era
        df["away_pitcher_era"]  = league_avg_era
        df["home_pitcher_whip"] = league_avg_whip
        df["away_pitcher_whip"] = league_avg_whip
        df["pitcher_era_diff"]  = 0.0
        return df

    def lookup(pid, season, col, default):
        stats = pitcher_stats_by_season.get(int(season) - 1)
        if stats is None or pd.isna(pid):
            return default
        pid_int = int(pid)
        return stats.at[pid_int, col] if pid_int in stats.index else default

    df["home_pitcher_era"]  = df.apply(
        lambda r: lookup(r["home_pitcher_id"], r["season"], "era",  league_avg_era),  axis=1)
    df["away_pitcher_era"]  = df.apply(
        lambda r: lookup(r["away_pitcher_id"], r["season"], "era",  league_avg_era),  axis=1)
    df["home_pitcher_whip"] = df.apply(
        lambda r: lookup(r["home_pitcher_id"], r["season"], "whip", league_avg_whip), axis=1)
    df["away_pitcher_whip"] = df.apply(
        lambda r: lookup(r["away_pitcher_id"], r["season"], "whip", league_avg_whip), axis=1)
    df["pitcher_era_diff"]  = df["away_pitcher_era"] - df["home_pitcher_era"]
    return df


# ---------------------------------------------------------------------------
# 4. Master feature builder
# ---------------------------------------------------------------------------

FEATURE_COLS = [
    # Elo (relative head-to-head strength)
    "elo_diff", "elo_win_prob",
    # Bayesian team strength (absolute win rate + uncertainty)
    "home_bayes_mean", "away_bayes_mean",
    "home_bayes_std",  "away_bayes_std",
    "bayes_win_prob",  "bayes_diff",
    # Rolling form
    "diff_win_L10", "diff_win_L30",
    "diff_runs_scored_L10", "diff_run_diff_L10", "diff_run_diff_L30",
    # Rest
    "diff_rest_days", "home_rest_days", "away_rest_days",
    # Pitcher
    "pitcher_era_diff", "home_pitcher_era", "away_pitcher_era",
    "home_pitcher_whip", "away_pitcher_whip",
]

TARGET_COL = "home_win"


def build_features(df: pd.DataFrame,
                    pitcher_stats_by_season: Optional[dict] = None) -> pd.DataFrame:
    """
    Full pipeline: raw game df → feature-rich df ready for modeling.
    pitcher_stats_by_season: dict {prior_season: DataFrame(index=pitcher_id)}
    """
    if "season" not in df.columns:
        df["season"] = df["date"].dt.year

    df = apply_elo(df)
    df = apply_bayesian_ratings(df)
    df = build_rolling_features(df)
    df = add_pitcher_features(df, pitcher_stats_by_season)

    # Fill pitcher NaNs with league averages (no pitcher data = league average)
    pitcher_cols = ["home_pitcher_era", "away_pitcher_era",
                    "home_pitcher_whip", "away_pitcher_whip", "pitcher_era_diff"]
    for col in pitcher_cols:
        if col in df.columns:
            fill = 0.0 if "diff" in col else (4.30 if "era" in col else 1.32)
            df[col] = df[col].fillna(fill)

    # Drop rows where we don't have enough rolling history (first ~10 games per team)
    df = df.dropna(subset=["elo_diff", "bayes_win_prob", "diff_win_L10"]).reset_index(drop=True)

    return df


if __name__ == "__main__":
    # Smoke test with synthetic data
    import numpy as np
    np.random.seed(42)
    n = 200
    teams = list(range(1, 31))
    synthetic = pd.DataFrame({
        "gamePk":     range(n),
        "date":       pd.date_range("2024-04-01", periods=n, freq="D"),
        "home_id":    np.random.choice(teams, n),
        "away_id":    np.random.choice(teams, n),
        "home_name":  "Home",
        "away_name":  "Away",
        "home_score": np.random.randint(0, 12, n),
        "away_score": np.random.randint(0, 12, n),
        "season":     2024,
    })
    synthetic["home_win"] = (synthetic["home_score"] > synthetic["away_score"]).astype(int)
    out = build_features(synthetic)
    print(out[FEATURE_COLS + [TARGET_COL]].head())
    print(f"\nShape: {out.shape}")
    print(f"Features: {FEATURE_COLS}")
