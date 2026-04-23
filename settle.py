"""
settle.py — fetch MLB scores for any PENDING past picks and mark HIT/MISS.
Run each morning after games complete.
"""
import pandas as pd
import requests
from pathlib import Path
from datetime import date

RECORD = Path(__file__).parent / "results" / "record.csv"

def main():
    if not RECORD.exists():
        print("No record.csv found.")
        return

    df = pd.read_csv(RECORD, dtype={"gamePk": str})
    if "outcome" not in df.columns:
        df["outcome"] = "PENDING"
    if "result" not in df.columns:
        df["result"] = ""

    today = date.today().isoformat()
    pending_mask = (df["outcome"] == "PENDING") & (df["date"].astype(str) < today)
    to_settle = df[pending_mask]

    if to_settle.empty:
        print("No pending picks to settle.")
        return

    print(f"Settling {len(to_settle)} picks...")
    settled = 0
    for idx, row in to_settle.iterrows():
        try:
            r = requests.get(
                f"https://statsapi.mlb.com/api/v1/game/{row['gamePk']}/linescore",
                timeout=10,
            ).json()
            hr = r.get("teams", {}).get("home", {}).get("runs")
            ar = r.get("teams", {}).get("away", {}).get("runs")
            if hr is None or ar is None:
                continue
            home_win = int(hr) > int(ar)
            pick_home = str(row["pick"]) == str(row["home_name"])
            outcome = "HIT" if (home_win == pick_home) else "MISS"
            df.at[idx, "outcome"] = outcome
            df.at[idx, "result"] = f"{ar}-{hr}"
            print(f"  {row['away_name']} @ {row['home_name']}: {ar}-{hr} -> {outcome}")
            settled += 1
        except Exception as e:
            print(f"  Error for gamePk {row['gamePk']}: {e}")

    df.to_csv(RECORD, index=False)
    print(f"\nDone. Settled {settled} of {len(to_settle)} pending picks.")

if __name__ == "__main__":
    main()
