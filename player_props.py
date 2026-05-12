#!/usr/bin/env python3
"""
player_props.py
Generate model-projected player prop lines for today's MLB games.

Batter projections use Statcast expected stats (xBA, xSLG, xwOBA) from
Baseball Savant plus MLB API counting stats (K%, BB%, ISO).

Pitcher projections use FIP and xERA instead of raw ERA.

Usage:
    python player_props.py              # today
    python player_props.py 2026-05-11   # specific date

Output: results/props_{date}.json
"""

import io
import json
import math
import sys
import time
from datetime import date as _date
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LEAGUE_ERA   = 4.30
LEAGUE_FIP   = 4.10   # FIP is calibrated to ERA scale
FIP_CONST    = 3.10   # league FIP constant (≈ league ERA − league FIP raw)
BF_PER_IP    = 4.30   # league-average batters faced per inning pitched
RESULTS_DIR  = Path(__file__).parent / "results"

# Expected PA by batting order position in a 9-inning game
PA_BY_POS = {1: 4.5, 2: 4.3, 3: 4.2, 4: 4.0, 5: 3.9,
             6: 3.8, 7: 3.7, 8: 3.6, 9: 3.5}

PARK_FACTORS: dict[str, float] = {
    "Colorado Rockies":      1.16,
    "Boston Red Sox":        1.10,
    "Cincinnati Reds":       1.08,
    "Philadelphia Phillies": 1.07,
    "Texas Rangers":         1.06,
    "Milwaukee Brewers":     1.05,
    "Chicago Cubs":          1.04,
    "Toronto Blue Jays":     1.03,
    "Baltimore Orioles":     1.02,
    "New York Yankees":      1.02,
    "Arizona Diamondbacks":  1.01,
    "Atlanta Braves":        1.01,
    "Houston Astros":        1.00,
    "Los Angeles Angels":    1.00,
    "Minnesota Twins":       1.00,
    "Pittsburgh Pirates":    1.00,
    "St. Louis Cardinals":   1.00,
    "Washington Nationals":  1.00,
    "Chicago White Sox":     0.99,
    "Detroit Tigers":        0.99,
    "Kansas City Royals":    0.99,
    "Miami Marlins":         0.99,
    "New York Mets":         0.99,
    "Tampa Bay Rays":        0.99,
    "Cleveland Guardians":   0.98,
    "Los Angeles Dodgers":   0.98,
    "Seattle Mariners":      0.98,
    "San Francisco Giants":  0.97,
    "Oakland Athletics":     0.95,
    "Sacramento Athletics":  0.95,
    "San Diego Padres":      0.95,
}

# ---------------------------------------------------------------------------
# Poisson probability helpers
# ---------------------------------------------------------------------------
def _poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _poisson_cdf(k: int, lam: float) -> float:
    """P(X ≤ k) for Poisson(lam)."""
    return sum(_poisson_pmf(i, lam) for i in range(max(k + 1, 1)))


def over_prob(proj: float, line: float) -> float:
    """
    Probability of exceeding a half-integer line under Poisson(proj).
    OVER 0.5 = P(X ≥ 1), OVER 1.5 = P(X ≥ 2), etc.
    Returns a percentage integer (e.g. 68).
    """
    if proj <= 0:
        return 0
    k = int(line)   # floor works for x.5 lines
    return int(round((1 - _poisson_cdf(k, proj)) * 100))


def under_prob(proj: float, line: float) -> int:
    return 100 - over_prob(proj, line)


SESS = requests.Session()
SESS.headers.update({"User-Agent": "Game163/1.0 props-generator"})


# ---------------------------------------------------------------------------
# Baseball Savant expected-stats fetch
# ---------------------------------------------------------------------------
def _fetch_savant(player_type: str, season: int) -> dict[str, dict]:
    """
    Returns {player_id_str: {xba, xslg, xwoba, [xera for pitchers]}} from
    Baseball Savant expected-statistics leaderboard CSV.
    """
    print(f"  📡 Fetching Savant expected stats ({player_type})…")
    url = "https://baseballsavant.mlb.com/leaderboard/expected_statistics"
    r = SESS.get(url, params={
        "type": player_type, "year": season,
        "position": "", "team": "", "min": "5", "csv": "true",
    }, timeout=25)
    r.raise_for_status()

    # Strip BOM, parse CSV
    text = r.text.lstrip("﻿")
    df   = pd.read_csv(io.StringIO(text))

    # Normalise column names (Savant uses quoted multi-word headers sometimes)
    df.columns = [c.strip().strip('"') for c in df.columns]

    out = {}
    for _, row in df.iterrows():
        pid = str(row.get("player_id", "")).strip()
        if not pid:
            continue
        entry = {
            "xba":   _flt(row, "est_ba"),
            "xslg":  _flt(row, "est_slg"),
            "xwoba": _flt(row, "est_woba"),
            "pa":    _int(row, "pa"),
        }
        if player_type == "pitcher":
            entry["xera"] = _flt(row, "xera")
        out[pid] = entry

    print(f"    → {len(out)} players loaded")
    return out


def _flt(row, col, default=0.0):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def _int(row, col, default=0):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return default
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------------------
# MLB Stats API helpers
# ---------------------------------------------------------------------------
def _get(url: str, params: dict | None = None) -> dict:
    r = SESS.get(url, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def get_schedule(date_str: str) -> dict:
    return _get("https://statsapi.mlb.com/api/v1/schedule", {
        "sportId": 1, "date": date_str,
        "hydrate": "probablePitcher,lineups,team",
    })


def get_boxscore(game_pk: str) -> dict | None:
    try:
        return _get(f"https://statsapi.mlb.com/api/v1/game/{game_pk}/boxscore")
    except Exception:
        return None


def get_hitting_stats(player_id: int, season: int) -> dict:
    try:
        data = _get(
            f"https://statsapi.mlb.com/api/v1/people/{player_id}/stats",
            {"stats": "season", "season": season, "group": "hitting"},
        )
        splits = data.get("stats", [{}])[0].get("splits", [])
        return splits[0].get("stat", {}) if splits else {}
    except Exception:
        return {}


def get_pitching_stats(player_id: int, season: int) -> dict:
    try:
        data = _get(
            f"https://statsapi.mlb.com/api/v1/people/{player_id}/stats",
            {"stats": "season", "season": season, "group": "pitching"},
        )
        splits = data.get("stats", [{}])[0].get("splits", [])
        return splits[0].get("stat", {}) if splits else {}
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# FIP / rate-stat helpers
# ---------------------------------------------------------------------------
def _parse_ip(ip_str) -> float:
    """Convert MLB IP string (e.g. '35.2') to decimal innings."""
    try:
        parts = str(ip_str).split(".")
        return int(parts[0]) + (int(parts[1]) if len(parts) > 1 else 0) / 3
    except (ValueError, IndexError):
        return 0.0


def calc_fip(stats: dict) -> float | None:
    """Compute FIP from MLB API pitching stats dict. Returns None if insufficient data."""
    ip  = _parse_ip(stats.get("inningsPitched", 0))
    if ip < 1:
        return None
    hr  = int(stats.get("homeRuns",    0) or 0)
    bb  = int(stats.get("baseOnBalls", 0) or 0)
    hbp = int(stats.get("hitByPitch",  0) or 0)
    k   = int(stats.get("strikeOuts",  0) or 0)
    return round((13 * hr + 3 * (bb + hbp) - 2 * k) / ip + FIP_CONST, 2)


def _nearest(val: float, candidates: list) -> float:
    return min(candidates, key=lambda x: abs(x - val))


def _side(proj: float, line: float) -> str:
    if proj > line + 0.01:
        return "OVER"
    if proj < line - 0.01:
        return "UNDER"
    return "PUSH"


# ---------------------------------------------------------------------------
# Pitcher projection
# ---------------------------------------------------------------------------
def project_pitcher(
    mlb_stats: dict,
    savant: dict,            # {xera, xba, xslg, xwoba, pa}
    park_factor: float,
) -> dict | None:
    gs = int(mlb_stats.get("gamesStarted", 0) or 0)
    if gs < 2:
        return None

    total_ip = _parse_ip(mlb_stats.get("inningsPitched", 0))
    if total_ip < 3:
        return None

    k   = int(mlb_stats.get("strikeOuts",    0) or 0)
    bb  = int(mlb_stats.get("baseOnBalls",   0) or 0)
    hbp = int(mlb_stats.get("hitByPitch",    0) or 0)
    hr  = int(mlb_stats.get("homeRuns",      0) or 0)
    bf  = int(mlb_stats.get("battersFaced",  0) or 0) or int(total_ip * BF_PER_IP)

    try:
        era  = float(str(mlb_stats.get("era",  LEAGUE_ERA) or LEAGUE_ERA))
    except ValueError:
        era = LEAGUE_ERA
    try:
        whip = float(str(mlb_stats.get("whip", 1.30) or 1.30))
    except ValueError:
        whip = 1.30

    fip  = calc_fip(mlb_stats) or era   # fall back to ERA if FIP can't be computed
    xera = savant.get("xera") or era     # fall back to ERA if Savant missing

    # Rate stats
    k_pct  = round(k  / bf * 100, 1) if bf > 0 else 0.0
    bb_pct = round(bb / bf * 100, 1) if bf > 0 else 0.0

    ip_per_gs = total_ip / gs
    # Park slightly affects pitcher totals (bigger park = slightly more IP)
    proj_ip   = round(ip_per_gs * (park_factor ** -0.12), 1)
    proj_bf   = proj_ip * BF_PER_IP

    # Use K% × projected BF (more accurate than K/IP × IP)
    k_rate   = k / bf if bf > 0 else (k / total_ip / BF_PER_IP)
    proj_k   = round(k_rate * proj_bf, 1)

    proj_outs = int(round(proj_ip * 3))

    # Use xERA for ER projection (better than raw ERA)
    proj_er   = round(xera / 9 * proj_ip, 1)

    # Standard lines + probabilities
    k_line    = _nearest(proj_k,    [3.5, 4.5, 5.5, 6.5, 7.5])
    outs_line = _nearest(proj_outs, [14.5, 15.5, 16.5, 17.5, 18.5, 19.5])
    er_line   = _nearest(proj_er,   [0.5, 1.5, 2.5])

    return {
        # Projections
        "proj_k":    proj_k,
        "proj_outs": proj_outs,
        "proj_er":   proj_er,
        "proj_ip":   proj_ip,
        # Lines + sides
        "k_line":    k_line,
        "outs_line": outs_line,
        "er_line":   er_line,
        "k_side":    _side(proj_k,    k_line),
        "outs_side": _side(proj_outs, outs_line),
        "er_side":   _side(proj_er,   er_line),
        # Over/Under probabilities (Poisson model, %)
        "k_over_pct":    over_prob(proj_k,    k_line),
        "k_under_pct":   under_prob(proj_k,   k_line),
        "outs_over_pct": over_prob(proj_outs, outs_line),
        "outs_under_pct":under_prob(proj_outs,outs_line),
        "er_over_pct":   over_prob(proj_er,   er_line),
        "er_under_pct":  under_prob(proj_er,  er_line),
        # Season metrics
        "season_era":        round(era,  2),
        "season_fip":        round(fip,  2),
        "season_xera":       round(xera, 2),
        "season_whip":       round(whip, 2),
        "season_k_pct":      k_pct,
        "season_bb_pct":     bb_pct,
        "season_k":          k,
        "season_gs":         gs,
        "season_ip_per_gs":  round(ip_per_gs, 1),
    }


# ---------------------------------------------------------------------------
# Batter projection
# ---------------------------------------------------------------------------
def project_batter(
    mlb_stats: dict,
    savant: dict,            # {xba, xslg, xwoba, pa}
    lineup_pos: int,
    opp_fip: float,
    park_factor: float,
) -> dict | None:
    gp  = int(mlb_stats.get("gamesPlayed",  0) or 0)
    ab  = int(mlb_stats.get("atBats",       0) or 0)
    h   = int(mlb_stats.get("hits",         0) or 0)
    d   = int(mlb_stats.get("doubles",      0) or 0)
    tri = int(mlb_stats.get("triples",      0) or 0)
    hr  = int(mlb_stats.get("homeRuns",     0) or 0)
    rbi = int(mlb_stats.get("rbi",          0) or 0)
    bb  = int(mlb_stats.get("baseOnBalls",  0) or 0)
    hbp = int(mlb_stats.get("hitByPitch",   0) or 0)
    sf  = int(mlb_stats.get("sacFlies",     0) or 0)
    k   = int(mlb_stats.get("strikeOuts",   0) or 0)

    season_pa = ab + bb + hbp + sf
    if gp < 5 or season_pa < 10:
        return None

    # AB rate per PA (official AB fraction excludes BB/HBP/SF)
    ab_rate = ab / season_pa

    # ── Expected stats from Savant (preferred) ───────────────────────────
    xba  = savant.get("xba")  or (h  / ab if ab  > 0 else 0.0)
    xslg = savant.get("xslg") or ((h + d + 2*tri + 3*hr) / ab if ab > 0 else 0.0)
    xwoba = savant.get("xwoba")

    # ── Derived sabermetrics ─────────────────────────────────────────────
    xiso   = round(xslg - xba, 3)                         # isolated power (expected)
    bb_pct = round(bb / season_pa * 100, 1)
    k_pct  = round(k  / season_pa * 100, 1)

    try:
        raw_avg = float(str(mlb_stats.get("avg", 0) or 0))
        raw_slg = float(str(mlb_stats.get("slg", 0) or 0))
        raw_obp = float(str(mlb_stats.get("obp", 0) or 0))
    except ValueError:
        raw_avg = raw_slg = raw_obp = 0.0

    iso = round(raw_slg - raw_avg, 3)   # actual ISO

    # ── HR rate: use actual rate (most stable for power metric) ──────────
    hr_rate = hr / season_pa if season_pa > 0 else 0.0

    # ── RBI: per-PA rate ─────────────────────────────────────────────────
    rbi_rate = rbi / season_pa if season_pa > 0 else 0.0

    # ── Pitcher quality factor using FIP ─────────────────────────────────
    opp_fip_eff = opp_fip if (opp_fip and opp_fip > 0) else LEAGUE_FIP
    p_factor = (opp_fip_eff / LEAGUE_FIP) ** 0.35

    # ── Project for this game ─────────────────────────────────────────────
    proj_pa = PA_BY_POS.get(lineup_pos, 3.8)
    proj_ab = proj_pa * ab_rate

    # Hits: proj_AB × xBA (expected hit rate on official ABs)
    proj_hits = round(proj_ab * xba  * p_factor * park_factor, 2)
    # Total bases: proj_AB × xSLG (expected TB per official AB)
    proj_tb   = round(proj_ab * xslg * p_factor * park_factor, 2)
    # HR: actual HR rate over all PAs (xISO doesn't isolate HR specifically)
    proj_hr   = round(proj_pa * hr_rate  * p_factor * park_factor, 2)
    # RBI: per-PA rate over all PAs
    proj_rbi  = round(proj_pa * rbi_rate * p_factor * park_factor, 2)

    hits_line = 0.5 if proj_hits < 1.2 else 1.5
    tb_line   = 1.5 if proj_tb   < 2.0 else 2.5
    rbi_line  = 0.5 if proj_rbi  < 0.75 else 1.5

    return {
        # Projections
        "proj_hits": proj_hits,
        "proj_tb":   proj_tb,
        "proj_hr":   proj_hr,
        "proj_rbi":  proj_rbi,
        # Standard lines + sides
        "hits_line":  hits_line,
        "hits_side":  _side(proj_hits, hits_line),
        "tb_line":    tb_line,
        "tb_side":    _side(proj_tb,   tb_line),
        "hr_side":    _side(proj_hr, 0.5),
        "rbi_line":   rbi_line,
        "rbi_side":   _side(proj_rbi,  rbi_line),
        # Over/Under probabilities (Poisson model, %)
        "hits_over_pct":  over_prob(proj_hits, hits_line),
        "hits_under_pct": under_prob(proj_hits, hits_line),
        "tb_over_pct":    over_prob(proj_tb,   tb_line),
        "tb_under_pct":   under_prob(proj_tb,  tb_line),
        "hr_over_pct":    over_prob(proj_hr,   0.5),
        "hr_under_pct":   under_prob(proj_hr,  0.5),
        "rbi_over_pct":   over_prob(proj_rbi,  rbi_line),
        "rbi_under_pct":  under_prob(proj_rbi, rbi_line),
        # Expected / sabermetric display stats
        "xba":    round(xba,   3),
        "xslg":   round(xslg,  3),
        "xwoba":  round(xwoba, 3) if xwoba else None,
        "xiso":   xiso,
        "bb_pct": bb_pct,
        "k_pct":  k_pct,
        "iso":    iso,
        # Raw season rates (for reference)
        "season_avg": round(raw_avg, 3),
        "season_obp": round(raw_obp, 3),
        "season_slg": round(raw_slg, 3),
        "season_hr":  hr,
        "season_gp":  gp,
    }


# ---------------------------------------------------------------------------
# Main generation function
# ---------------------------------------------------------------------------
def generate_props(date_str: str | None = None) -> dict:
    if date_str is None:
        date_str = _date.today().isoformat()
    season = int(date_str[:4])

    print(f"\n🎯 Generating player props for {date_str}")

    # ── Pre-fetch Savant expected stats for all batters + pitchers ───────
    try:
        savant_batters  = _fetch_savant("batter",  season)
    except Exception as e:
        print(f"  ⚠️  Savant batter fetch failed: {e} — using raw stats")
        savant_batters  = {}
    try:
        savant_pitchers = _fetch_savant("pitcher", season)
    except Exception as e:
        print(f"  ⚠️  Savant pitcher fetch failed: {e} — using raw stats")
        savant_pitchers = {}

    # ── Today's schedule ─────────────────────────────────────────────────
    sched = get_schedule(date_str)
    dates = sched.get("dates", [])
    if not dates:
        print("  No games found.")
        result = {"date": date_str, "games": []}
        _save(result, date_str)
        return result

    output_games = []
    for game in dates[0].get("games", []):
        gp        = str(game.get("gamePk", ""))
        home_info = game.get("teams", {}).get("home", {})
        away_info = game.get("teams", {}).get("away", {})
        home_name = home_info.get("team", {}).get("name", "")
        away_name = away_info.get("team", {}).get("name", "")
        game_time = game.get("gameDate", "")[:16]

        print(f"\n  {away_name} @ {home_name}  (gamePk={gp})")
        park_factor = PARK_FACTORS.get(home_name, 1.0)

        # Probable pitchers
        home_pitcher = _fetch_pitcher(
            home_info.get("probablePitcher", {}), park_factor, season,
            savant_pitchers, "home",
        )
        away_pitcher = _fetch_pitcher(
            away_info.get("probablePitcher", {}), park_factor, season,
            savant_pitchers, "away",
        )

        # FIP of opposing starter (for batter quality adjustment)
        home_sp_fip = (home_pitcher.get("projection") or {}).get("season_fip", LEAGUE_FIP)
        away_sp_fip = (away_pitcher.get("projection") or {}).get("season_fip", LEAGUE_FIP)

        # Lineups
        boxscore     = get_boxscore(gp)
        home_batters = _fetch_batters(
            boxscore, "home", away_sp_fip, park_factor, season, savant_batters
        )
        away_batters = _fetch_batters(
            boxscore, "away", home_sp_fip, park_factor, season, savant_batters
        )

        output_games.append({
            "gamePk":       gp,
            "away_name":    away_name,
            "home_name":    home_name,
            "game_time":    game_time,
            "park_factor":  park_factor,
            "home_pitcher": home_pitcher,
            "away_pitcher": away_pitcher,
            "home_batters": home_batters,
            "away_batters": away_batters,
        })
        time.sleep(0.2)

    result = {"date": date_str, "games": output_games}
    _save(result, date_str)
    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _fetch_pitcher(
    prob: dict,
    park_factor: float,
    season: int,
    savant_map: dict,
    side: str,
) -> dict:
    if not prob:
        return {"id": None, "name": "TBD", "projection": None}
    pid   = prob.get("id")
    pname = prob.get("fullName", "TBD")
    print(f"    {side} SP: {pname} (id={pid})")
    if not pid:
        return {"id": None, "name": pname, "projection": None}

    mlb_s  = get_pitching_stats(pid, season)
    savant = savant_map.get(str(pid), {})
    proj   = project_pitcher(mlb_s, savant, park_factor)
    time.sleep(0.15)
    return {"id": pid, "name": pname, "projection": proj}


def _fetch_batters(
    boxscore: dict | None,
    side: str,
    opp_fip: float,
    park_factor: float,
    season: int,
    savant_map: dict,
) -> list[dict]:
    if not boxscore:
        return []

    side_data  = boxscore.get("teams", {}).get(side, {})
    batter_ids = side_data.get("batters", [])[:9]
    players    = side_data.get("players", {})
    if not batter_ids:
        return []

    result = []
    for pid in batter_ids:
        info  = players.get(f"ID{pid}", {})
        pos   = info.get("position", {}).get("abbreviation", "")
        name  = info.get("person", {}).get("fullName", f"Player {pid}")
        try:
            lineup_pos = int(info.get("battingOrder", "500")) // 100
        except (ValueError, TypeError):
            lineup_pos = batter_ids.index(pid) + 1 if pid in batter_ids else 5

        print(f"    {side} #{lineup_pos}: {name}")
        mlb_s  = get_hitting_stats(pid, season)
        savant = savant_map.get(str(pid), {})
        proj   = project_batter(mlb_s, savant, lineup_pos, opp_fip, park_factor)
        time.sleep(0.06)

        result.append({
            "id": pid, "name": name, "position": pos,
            "batting_order": lineup_pos, "projection": proj,
        })
    return result


def _save(data: dict, date_str: str) -> None:
    RESULTS_DIR.mkdir(exist_ok=True)
    path = RESULTS_DIR / f"props_{date_str}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"\n✅ Saved → {path}")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    generate_props(date_arg)
