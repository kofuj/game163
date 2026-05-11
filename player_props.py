#!/usr/bin/env python3
"""
player_props.py
Generate model-projected player prop lines for today's MLB games.

Usage:
    python player_props.py              # today
    python player_props.py 2026-05-11   # specific date

Output: results/props_{date}.json
"""

import json
import sys
import time
from datetime import date as _date
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LEAGUE_ERA  = 4.30
RESULTS_DIR = Path(__file__).parent / "results"

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

SESS = requests.Session()
SESS.headers.update({"User-Agent": "Game163/1.0 props-generator"})


# ---------------------------------------------------------------------------
# MLB Stats API helpers
# ---------------------------------------------------------------------------
def _get(url: str, params: dict | None = None) -> dict:
    r = SESS.get(url, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def get_schedule(date_str: str) -> dict:
    return _get("https://statsapi.mlb.com/api/v1/schedule", {
        "sportId": 1,
        "date":    date_str,
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
# Projection math
# ---------------------------------------------------------------------------
def _parse_ip(ip_str: str) -> float:
    """Convert MLB innings-pitched string (e.g. '35.2') to decimal innings."""
    try:
        parts = str(ip_str).split(".")
        full  = int(parts[0])
        outs  = int(parts[1]) if len(parts) > 1 else 0
        return full + outs / 3
    except (ValueError, IndexError):
        return 0.0


def project_pitcher(stats: dict, park_factor: float) -> dict | None:
    gs = int(stats.get("gamesStarted", 0) or 0)
    if gs < 2:
        return None

    total_ip = _parse_ip(stats.get("inningsPitched", "0"))
    if total_ip < 3:
        return None

    k  = int(stats.get("strikeOuts",  0) or 0)
    er = int(stats.get("earnedRuns",  0) or 0)

    try:
        era  = float(str(stats.get("era",  LEAGUE_ERA) or LEAGUE_ERA))
    except ValueError:
        era = LEAGUE_ERA
    try:
        whip = float(str(stats.get("whip", 1.30) or 1.30))
    except ValueError:
        whip = 1.30

    ip_per_gs = total_ip / gs
    k_per_ip  = k / total_ip if total_ip > 0 else 0.0

    # Park slightly affects pitcher totals (higher-run parks = slightly fewer innings)
    proj_ip   = round(ip_per_gs * (park_factor ** -0.12), 1)
    proj_k    = round(k_per_ip * proj_ip, 1)
    proj_outs = int(round(proj_ip * 3))
    proj_er   = round(era / 9 * proj_ip, 1)

    # Nearest standard lines
    k_line    = _nearest(proj_k,    [3.5, 4.5, 5.5, 6.5, 7.5])
    outs_line = _nearest(proj_outs, [14.5, 15.5, 16.5, 17.5, 18.5, 19.5])
    er_line   = _nearest(proj_er,   [0.5, 1.5, 2.5])

    return {
        "proj_k":    proj_k,
        "proj_outs": proj_outs,
        "proj_er":   proj_er,
        "proj_ip":   proj_ip,
        "k_line":    k_line,
        "outs_line": outs_line,
        "er_line":   er_line,
        "k_side":    _side(proj_k,    k_line),
        "outs_side": _side(proj_outs, outs_line),
        "er_side":   _side(proj_er,   er_line),
        "season_era":        round(era, 2),
        "season_whip":       round(whip, 2),
        "season_k":          k,
        "season_gs":         gs,
        "season_ip_per_gs":  round(ip_per_gs, 1),
    }


def project_batter(
    stats: dict,
    lineup_pos: int,
    opp_era: float,
    park_factor: float,
) -> dict | None:
    gp = int(stats.get("gamesPlayed", 0) or 0)
    if gp < 5:
        return None

    ab  = int(stats.get("atBats",       0) or 0)
    h   = int(stats.get("hits",         0) or 0)
    d   = int(stats.get("doubles",      0) or 0)
    tri = int(stats.get("triples",      0) or 0)
    hr  = int(stats.get("homeRuns",     0) or 0)
    rbi = int(stats.get("rbi",          0) or 0)
    bb  = int(stats.get("baseOnBalls",  0) or 0)
    hbp = int(stats.get("hitByPitch",   0) or 0)
    sf  = int(stats.get("sacFlies",     0) or 0)

    season_pa = ab + bb + hbp + sf
    if season_pa < 10:
        return None

    tb = h + d + 2 * tri + 3 * hr  # total bases this season

    # Per-PA rates
    hit_rate = h   / season_pa
    tb_rate  = tb  / season_pa
    hr_rate  = hr  / season_pa
    # RBI rate per game (RBI correlates with lineup spot, keep simple)
    rbi_rate = rbi / gp

    # Pitcher quality factor: ace suppresses offense, weak pitcher inflates it
    opp_era  = opp_era if (opp_era and opp_era > 0) else LEAGUE_ERA
    p_factor = (opp_era / LEAGUE_ERA) ** 0.35

    projected_pa = PA_BY_POS.get(lineup_pos, 3.8)

    proj_hits = round(projected_pa * hit_rate * p_factor * park_factor, 2)
    proj_tb   = round(projected_pa * tb_rate  * p_factor * park_factor, 2)
    proj_hr   = round(projected_pa * hr_rate  * p_factor * park_factor, 2)
    proj_rbi  = round(rbi_rate     * p_factor * park_factor,            2)

    try:
        avg = float(str(stats.get("avg", 0) or 0))
        slg = float(str(stats.get("slg", 0) or 0))
    except ValueError:
        avg = slg = 0.0

    return {
        "proj_hits": proj_hits,
        "proj_tb":   proj_tb,
        "proj_hr":   proj_hr,
        "proj_rbi":  proj_rbi,
        # Standard lines and sides
        "hits_line":  0.5 if proj_hits < 1.2 else 1.5,
        "hits_side":  _side(proj_hits, 0.5 if proj_hits < 1.2 else 1.5),
        "tb_line":    1.5 if proj_tb < 2.0 else 2.5,
        "tb_side":    _side(proj_tb, 1.5 if proj_tb < 2.0 else 2.5),
        "hr_side":    _side(proj_hr, 0.5),
        "rbi_line":   0.5 if proj_rbi < 0.75 else 1.5,
        "rbi_side":   _side(proj_rbi, 0.5 if proj_rbi < 0.75 else 1.5),
        # Season rates for display
        "season_avg": round(avg, 3),
        "season_slg": round(slg, 3),
        "season_hr":  hr,
        "season_gp":  gp,
    }


def _nearest(val: float, candidates: list[float]) -> float:
    return min(candidates, key=lambda x: abs(x - val))


def _side(proj: float, line: float) -> str:
    if proj > line + 0.01:
        return "OVER"
    if proj < line - 0.01:
        return "UNDER"
    return "PUSH"


# ---------------------------------------------------------------------------
# Main generation function
# ---------------------------------------------------------------------------
def generate_props(date_str: str | None = None) -> dict:
    if date_str is None:
        date_str = _date.today().isoformat()
    season = int(date_str[:4])

    print(f"\n🎯 Generating player props for {date_str}")

    sched = get_schedule(date_str)
    dates = sched.get("dates", [])
    if not dates:
        print("  No games found.")
        result = {"date": date_str, "games": []}
        _save(result, date_str)
        return result

    games_raw   = dates[0].get("games", [])
    output_games = []

    for game in games_raw:
        gp        = str(game.get("gamePk", ""))
        home_info = game.get("teams", {}).get("home", {})
        away_info = game.get("teams", {}).get("away", {})
        home_name = home_info.get("team", {}).get("name", "")
        away_name = away_info.get("team", {}).get("name", "")
        game_time = game.get("gameDate", "")[:16]

        print(f"\n  {away_name} @ {home_name}  (gamePk={gp})")

        park_factor = PARK_FACTORS.get(home_name, 1.0)

        # ── Probable pitchers ────────────────────────────────────────────
        home_prob = home_info.get("probablePitcher", {})
        away_prob = away_info.get("probablePitcher", {})

        home_pitcher = _fetch_pitcher(home_prob, park_factor, season, "home")
        away_pitcher = _fetch_pitcher(away_prob, park_factor, season, "away")

        # ERA of opposing pitcher for batter adjustments
        home_sp_era = (home_pitcher.get("projection") or {}).get("season_era", LEAGUE_ERA)
        away_sp_era = (away_pitcher.get("projection") or {}).get("season_era", LEAGUE_ERA)

        # ── Lineups via boxscore ─────────────────────────────────────────
        boxscore = get_boxscore(gp)
        home_batters = _fetch_batters(boxscore, "home", away_sp_era, park_factor, season)
        away_batters = _fetch_batters(boxscore, "away", home_sp_era, park_factor, season)

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

        time.sleep(0.3)

    result = {"date": date_str, "games": output_games}
    _save(result, date_str)
    return result


def _fetch_pitcher(prob: dict, park_factor: float, season: int, side: str) -> dict:
    if not prob:
        return {"id": None, "name": "TBD", "projection": None}
    pid   = prob.get("id")
    pname = prob.get("fullName", "TBD")
    print(f"    {side} SP: {pname} (id={pid})")
    if not pid:
        return {"id": None, "name": pname, "projection": None}
    pstats = get_pitching_stats(pid, season)
    proj   = project_pitcher(pstats, park_factor)
    time.sleep(0.15)
    return {"id": pid, "name": pname, "projection": proj}


def _fetch_batters(
    boxscore: dict | None,
    side: str,
    opp_era: float,
    park_factor: float,
    season: int,
) -> list[dict]:
    if not boxscore:
        return []

    side_data = boxscore.get("teams", {}).get(side, {})
    batter_ids = side_data.get("batters", [])[:9]
    players    = side_data.get("players", {})

    if not batter_ids:
        return []

    result = []
    for pid in batter_ids:
        player_key  = f"ID{pid}"
        player_info = players.get(player_key, {})
        person      = player_info.get("person", {})
        pos         = player_info.get("position", {}).get("abbreviation", "")
        order_str   = player_info.get("battingOrder", "")

        try:
            lineup_pos = int(order_str) // 100
        except (ValueError, TypeError):
            lineup_pos = batter_ids.index(pid) + 1 if pid in batter_ids else 5

        name = person.get("fullName", f"Player {pid}")
        print(f"    {side} #{lineup_pos}: {name}")

        hstats = get_hitting_stats(pid, season)
        proj   = project_batter(hstats, lineup_pos, opp_era, park_factor)
        time.sleep(0.06)

        result.append({
            "id":           pid,
            "name":         name,
            "position":     pos,
            "batting_order": lineup_pos,
            "projection":   proj,
        })

    return result


def _save(data: dict, date_str: str) -> None:
    RESULTS_DIR.mkdir(exist_ok=True)
    out_path = RESULTS_DIR / f"props_{date_str}.json"
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"\n✅ Saved → {out_path}")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    generate_props(date_arg)
