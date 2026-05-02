"""
data_fetcher.py
---------------
Pulls game-by-game results from the free public MLB Stats API.
No API key required.

Endpoints used:
  schedule  → https://statsapi.mlb.com/api/v1/schedule
  boxscore  → https://statsapi.mlb.com/api/v1/game/{gamePk}/boxscore
  pitchers  → embedded in boxscore

Usage:
    from data_fetcher import fetch_season
    df = fetch_season(2024)
"""

import requests
import pandas as pd
import time
import json
from pathlib import Path

BASE = "https://statsapi.mlb.com/api/v1"

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)


def _get(url: str, params: dict = None) -> dict:
    """Simple GET with error handling."""
    r = requests.get(url, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_schedule(season: int) -> list[dict]:
    """
    Returns a list of completed regular-season games for a given season.
    Each item has: gamePk, date, home team, away team, home score, away score.
    """
    cache_file = CACHE_DIR / f"schedule_{season}.json"
    if cache_file.exists():
        print(f"  [cache] schedule {season}")
        return json.loads(cache_file.read_text())

    print(f"  [fetch] schedule {season}...")
    data = _get(f"{BASE}/schedule", params={
        "sportId": 1,
        "season": season,
        "gameType": "R",           # Regular season only
        "fields": (
            "dates,date,games,gamePk,status,abstractGameState,"
            "teams,home,away,team,id,name,score,leagueRecord"
        ),
    })

    games = []
    for date_block in data.get("dates", []):
        for g in date_block.get("games", []):
            if g.get("status", {}).get("abstractGameState") != "Final":
                continue
            home = g["teams"]["home"]
            away = g["teams"]["away"]
            games.append({
                "gamePk":     g["gamePk"],
                "date":       date_block["date"],
                "home_id":    home["team"]["id"],
                "home_name":  home["team"]["name"],
                "away_id":    away["team"]["id"],
                "away_name":  away["team"]["name"],
                "home_score": home.get("score", 0),
                "away_score": away.get("score", 0),
                "home_win":   int(home.get("score", 0) > away.get("score", 0)),
            })

    cache_file.write_text(json.dumps(games))
    return games


def fetch_starting_pitchers(game_pk: int) -> tuple[int | None, int | None]:
    """
    Returns (home_pitcher_id, away_pitcher_id) for a game.
    Falls back to None if the boxscore is unavailable.
    """
    cache_file = CACHE_DIR / f"box_{game_pk}.json"
    if cache_file.exists():
        d = json.loads(cache_file.read_text())
        return d["home"], d["away"]

    try:
        data = _get(f"{BASE}/game/{game_pk}/boxscore")
        home_p = _extract_starter(data, "home")
        away_p = _extract_starter(data, "away")
        cache_file.write_text(json.dumps({"home": home_p, "away": away_p}))
        time.sleep(0.1)   # be polite to the API
        return home_p, away_p
    except Exception:
        return None, None


def _extract_starter(boxscore: dict, side: str) -> int | None:
    """Find the pitcher who recorded the first out — i.e., the starter."""
    try:
        pitchers = boxscore["teams"][side]["pitchers"]
        if pitchers:
            pid = pitchers[0]
            return pid
    except (KeyError, IndexError):
        pass
    return None


def fetch_pitcher_stats(season: int, pitcher_ids: set[int]) -> pd.DataFrame:
    """
    Pulls season-level ERA and WHIP for a set of pitcher IDs.
    Returns a DataFrame indexed by pitcher_id with columns [era, whip].

    Note: we use *prior season* stats as a feature so there's no data leakage.
    """
    cache_file = CACHE_DIR / f"pitchers_{season}.json"
    if cache_file.exists():
        return pd.read_json(cache_file, orient="index")

    print(f"  [fetch] pitcher stats {season}...")
    rows = []
    for pid in pitcher_ids:
        try:
            data = _get(f"{BASE}/people/{pid}/stats", params={
                "stats": "season",
                "season": season,
                "group": "pitching",
                "sportId": 1,
            })
            splits = data.get("stats", [{}])[0].get("splits", [])
            if splits:
                s = splits[0]["stat"]
                rows.append({
                    "pitcher_id": pid,
                    "era":  float(s.get("era",  4.5)),
                    "whip": float(s.get("whip", 1.35)),
                    "ip":   float(s.get("inningsPitched", 0)),
                })
            time.sleep(0.05)
        except Exception:
            pass

    df = pd.DataFrame(rows).set_index("pitcher_id") if rows else pd.DataFrame(
        columns=["era", "whip", "ip"])
    df.to_json(cache_file, orient="index")
    return df


def fetch_season(season: int, include_pitchers: bool = False) -> pd.DataFrame:
    """
    Master function. Returns a clean DataFrame of all regular-season games
    for the requested season.

    Columns:
        gamePk, date, home_id, home_name, away_id, away_name,
        home_score, away_score, home_win
        (optional) home_pitcher_id, away_pitcher_id
    """
    games = fetch_schedule(season)
    df = pd.DataFrame(games)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    if include_pitchers:
        print(f"  [fetch] pitcher assignments {season}...")
        home_pitchers, away_pitchers = [], []
        for pk in df["gamePk"]:
            hp, ap = fetch_starting_pitchers(pk)
            home_pitchers.append(hp)
            away_pitchers.append(ap)
        df["home_pitcher_id"] = home_pitchers
        df["away_pitcher_id"] = away_pitchers

    print(f"  ✓ {len(df)} games loaded for {season}")
    return df


def fetch_pitcher_game_logs(pitcher_id: int, season: int) -> pd.DataFrame:
    """
    Returns per-start game log for one pitcher in a given season.

    Columns: date, ip, er, h, bb, so, game_pk

    Used for current-season rolling ERA/WHIP (no data leakage — each game
    only sees starts that happened BEFORE it when features are built).
    """
    cache_file = CACHE_DIR / f"gamelogs_{pitcher_id}_{season}.json"
    if cache_file.exists():
        try:
            df = pd.read_json(cache_file, orient="records")
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"])
            return df
        except Exception:
            pass  # re-fetch if cache is corrupt

    try:
        data = _get(f"{BASE}/people/{pitcher_id}/stats", params={
            "stats":   "gameLog",
            "season":  season,
            "group":   "pitching",
            "sportId": 1,
        })
        rows = []
        splits = data.get("stats", [{}])[0].get("splits", [])
        for split in splits:
            s = split.get("stat", {})
            ip_raw = str(s.get("inningsPitched", "0.0"))
            try:
                ip = float(ip_raw)
            except ValueError:
                ip = 0.0
            rows.append({
                "date":    split.get("date", ""),
                "ip":      ip,
                "er":      int(s.get("earnedRuns",   0)),
                "h":       int(s.get("hits",          0)),
                "bb":      int(s.get("baseOnBalls",   0)),
                "so":      int(s.get("strikeOuts",    0)),
                "game_pk": split.get("game", {}).get("gamePk", 0),
            })

        if rows:
            df = pd.DataFrame(rows)
            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date").reset_index(drop=True)
        else:
            df = pd.DataFrame(columns=["date", "ip", "er", "h", "bb", "so", "game_pk"])

        cache_file.write_text(df.to_json(orient="records", date_format="iso"))
        time.sleep(0.05)
        return df

    except Exception:
        return pd.DataFrame(columns=["date", "ip", "er", "h", "bb", "so", "game_pk"])


def fetch_season_pitcher_gamelogs(season: int,
                                   pitcher_ids: set) -> dict[int, pd.DataFrame]:
    """
    Batch-fetch current-season game logs for a set of pitcher IDs.
    Returns {pitcher_id: DataFrame[date, ip, er, h, bb, so]}.
    Cached per pitcher per season — subsequent calls are instant.
    """
    result: dict[int, pd.DataFrame] = {}
    for pid in pitcher_ids:
        try:
            result[int(pid)] = fetch_pitcher_game_logs(int(pid), season)
        except Exception:
            pass
    return result


def fetch_probable_pitchers(target_date: str) -> dict[int, dict]:
    """
    Fetch probable starting pitchers for a given date from the schedule endpoint.

    Returns:
        {game_pk: {
            "home_pitcher_id":   int|None,
            "away_pitcher_id":   int|None,
            "home_pitcher_name": str|None,
            "away_pitcher_name": str|None,
        }}
    """
    try:
        data = _get(f"{BASE}/schedule", params={
            "sportId":  1,
            "date":     target_date,
            "gameType": "R",
            "hydrate":  "probablePitcher",
        })
        result: dict[int, dict] = {}
        for date_block in data.get("dates", []):
            for g in date_block.get("games", []):
                pk      = g["gamePk"]
                home_pp = g["teams"]["home"].get("probablePitcher") or {}
                away_pp = g["teams"]["away"].get("probablePitcher") or {}
                result[pk] = {
                    "home_pitcher_id":   int(home_pp["id"])       if home_pp.get("id")       else None,
                    "away_pitcher_id":   int(away_pp["id"])       if away_pp.get("id")       else None,
                    "home_pitcher_name": home_pp.get("fullName")  or None,
                    "away_pitcher_name": away_pp.get("fullName")  or None,
                }
        return result
    except Exception:
        return {}


if __name__ == "__main__":
    # Quick smoke test
    df = fetch_season(2023)
    print(df.head())
    print(df.dtypes)
