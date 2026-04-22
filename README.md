# ⚾ Game 163 — MLB Win Probability Model

A full prediction pipeline that mirrors the PuckCast methodology, built for MLB.

## How it works

```
MLB Stats API → data_fetcher.py → features.py → model.py → predict_today.py
```

### 1. Data (`data_fetcher.py`)
Pulls free data from `statsapi.mlb.com` — no API key needed:
- Full game schedule & scores (2015–present)
- Starting pitcher assignments (from boxscores)
- Pitcher ERA / WHIP (prior season stats, lag-safe)

Results are cached locally so you don't re-hit the API.

### 2. Features (`features.py`)
All features computed using **only pre-game information** (no leakage):

| Feature | Description |
|---|---|
| `elo_diff` | Home team Elo minus away team Elo (with home field) |
| `elo_win_prob` | Elo-implied win probability |
| `diff_win_L10` | Win rate differential, last 10 games |
| `diff_win_L30` | Win rate differential, last 30 games |
| `diff_run_diff_L10` | Run differential gap, last 10 games |
| `diff_rest_days` | Rest advantage (home minus away) |
| `pitcher_era_diff` | Away starter ERA minus home starter ERA |
| `home_pitcher_whip` | Home starter WHIP (prior season) |

### 3. Model (`model.py`)
- Default: **Gradient Boosting** (sklearn `GradientBoostingClassifier`)
- Calibrated with **isotonic regression** (fixes overconfident probabilities)
- Drop-in XGBoost support (see comment in `make_model()`)
- **Walk-forward validation**: train on years 1..N-1, test on year N

### 4. Grading
| Grade | Edge from 50% | Example |
|---|---|---|
| A | ≥ 15 pts | 65%+ or 35%- |
| B | 8–15 pts | 58–65% |
| C | < 8 pts | 50–58% |

---

## Quickstart

```bash
# Install dependencies
pip install requests pandas numpy scikit-learn pyarrow

# Optional but recommended (better accuracy)
pip install xgboost

# Run full pipeline (fetches data, validates, prints report)
python run.py

# Use cached data only
python run.py --no-fetch

# Try logistic regression instead
python run.py --model lr

# Just today's predictions
python run.py --predict-only

# Predictions for a specific date
python run.py --predict-only --date 2025-07-04
```

---

## Upgrade to XGBoost

In `model.py`, replace `make_model()` with:

```python
from xgboost import XGBClassifier

def make_model(model_type="xgb"):
    base = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )
    calibrated = CalibratedClassifierCV(base, method="isotonic", cv=3)
    return Pipeline([("scaler", StandardScaler()), ("clf", calibrated)])
```

XGBoost typically adds ~1–2% accuracy over GBM on this type of data.

---

## Adding More Features (Ideas)

- **Ballpark factors** — some parks heavily favor hitters/pitchers
- **Umpire tendencies** — some umpires have larger/smaller strike zones
- **Implied odds from betting markets** — use as a calibration signal
- **Weather** — wind direction/speed at open-air parks matters
- **Lineup quality** — weighted OPS of projected batting order
- **Bullpen ERA** — matters more in late-game situations

---

## File Structure

```
mlb_model/
├── data_fetcher.py      # MLB Stats API client + caching
├── features.py          # Elo, rolling stats, pitcher features
├── model.py             # GBM/LR/RF + walk-forward validation
├── predict_today.py     # Daily prediction generator
├── run.py               # Top-level runner
├── cache/               # API response cache (auto-created)
└── results/
    ├── predictions.csv      # All holdout predictions
    ├── season_summary.csv   # Per-season accuracy breakdown
    ├── trained_model.pkl    # Production model (for daily preds)
    └── daily/               # Per-day prediction CSVs
```

---

## Expected Performance

Based on similar MLB models in the literature:

| Metric | Expected Range |
|---|---|
| Overall accuracy | 57–63% |
| vs home baseline (+54.2%) | +3–9% |
| A-pick accuracy | 65–72% |
| Log loss | 0.64–0.68 |

Elo alone gets you ~57%. Adding pitcher ERA/WHIP typically adds +1–2%.
Adding rolling run differential adds another +1%.

---

## Connecting to the Game 163 Frontend

The `results/predictions.csv` output maps directly to the dashboard:

```python
preds = pd.read_csv("results/predictions.csv")
# Columns: gamePk, date, home_name, away_name, home_win_prob, grade, correct
```

Feed this into your React performance dashboard to populate the
"Recent Predictions" table and accuracy metrics.
