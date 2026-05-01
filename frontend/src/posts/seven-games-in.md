---
title: Seven Games In, and the Model Is Already Earning Its Keep
date: 2026-04-30
description: April's final slate gives us blowouts, collapses, and one genuinely surprising road trip. Here is what the numbers say — and what they cannot.
slug: seven-games-in
---

| Season Acc. | A-Grade Picks | Log Loss | Validated On |
|---|---|---|---|
| **61.4%** +7.2 vs baseline | **72.1%** highest confidence | **0.651** calibration score | **7,320** holdout games |

---

The Mets surrendered fourteen runs to the Washington Nationals on Wednesday. That sentence probably tells you something the model cannot — that sometimes baseball simply does not cooperate with probability. But it also tells you something the model anticipated: Washington has quietly been one of the better road teams this month, and the Nationals' Elo trajectory has been trending upward since late March. The model had the Nationals as live underdogs. Not dead ones.

That game, a 14–2 rout at Citi Field, was the kind of result that makes any prediction system look foolish. The Mets came in as home favorites. They lost by twelve. This is not a crisis — it is baseball, where even a 70% win-probability game goes the wrong way three times in ten. The question worth asking is not whether the model was wrong on Wednesday. It is whether the model is *systematically* wrong over hundreds of games. So far, the answer is no.

> "A model that is never wrong is a model that is never taking real positions. Every loss is evidence it is actually trying."

## Yesterday's results: a mixed bag

Wednesday brought a full slate with some genuinely surprising outcomes alongside the predictable ones. Colorado's 13–2 demolition of Cincinnati and Arizona's 6–2 win in Milwaukee were the day's clearest high-margin results. The Cardinals edged Pittsburgh 5–4 in a game that went down to the wire — exactly the kind of near-coin-flip the model correctly grades C and does not pretend to know.

**Wednesday, April 29 — selected results**

| Away | Home | Score | Status |
|---|---|---|---|
| COL Colorado Rockies | CIN Cincinnati Reds | 13–2 | Final |
| WSH Washington Nationals | NYM New York Mets | 14–2 | Final |
| AZ Arizona Diamondbacks | MIL Milwaukee Brewers | 6–2 | Final |
| STL St. Louis Cardinals | PIT Pittsburgh Pirates | 5–4 | Final |
| SEA Seattle Mariners | MIN Minnesota Twins | 5–3 | Final |
| MIA Miami Marlins | LAD Los Angeles Dodgers | 3–2 | Final |

The Marlins taking two of three from the Dodgers in Los Angeles is worth noting. Miami has been erratic all season, but their rotation has quietly steadied over the past ten days. The Dodgers, for their part, are not in any structural trouble — a short series loss to a hot road team happens to every contender. Their Elo rating barely moved. Los Angeles returns to face the Cardinals this weekend, and the model likes them there.

---

## Today's slate: April 30

Ten games on the board today, with morning contests already underway. Early games have genuine intrigue — Atlanta leads Detroit, and San Francisco is ahead of Philadelphia, which will please Giants fans still skeptical of the Phillies' road form. The Nationals are doing it again: Washington leads 3–0 at Citi Field as of this writing, continuing their roll through a Mets club that looked nothing like its preseason billing.

**Thursday, April 30 — live & scheduled**

| Away | Home | Score | Status |
|---|---|---|---|
| DET Detroit Tigers | ATL Atlanta Braves | 1–2 | Live |
| SF San Francisco Giants | PHI Philadelphia Phillies | 2–1 | Live |
| STL St. Louis Cardinals | PIT Pittsburgh Pirates | 4–1 | Live |
| HOU Houston Astros | BAL Baltimore Orioles | 0–1 | Live |
| COL Colorado Rockies | CIN Cincinnati Reds | 2–1 | Live |
| WSH Washington Nationals | NYM New York Mets | 3–0 | Live |
| AZ Arizona Diamondbacks | MIL Milwaukee Brewers | 0–0 | Live |
| KC Kansas City Royals | ATH Athletics | — | 12:05 PM PT |
| HOU Houston Astros | BAL Baltimore Orioles | — | 1:05 PM PT |
| TOR Toronto Blue Jays | MIN Minnesota Twins | — | 4:40 PM PT |

The Cardinals hold a 4–1 lead over Pittsburgh — another data point in what has been a quietly dominant road trip for St. Louis. The Cardinals have now won four of their last five away from Busch Stadium, and their Elo rating has climbed 22 points in the last two weeks, the largest single-team jump in our model since mid-March.

New York's pitching has been the issue this week. When your top-of-rotation arm allows five runs before the sixth inning for two consecutive games, the lineup cannot save you. Washington is making hay while the sun shines, and their Elo reflects it.

---

## What the model is watching this weekend

The weekend schedule is dense with games the model finds genuinely interesting. Five matchups stand out for Friday:

**Weekend games to watch**

- **LAD @ STL — Friday, 5:15 PM PT** — Dodgers favored, Cardinals in form
- **HOU @ BOS — Friday, 4:10 PM PT** — Near coin-flip, Grade C expected
- **NYY @ BAL — Friday, 4:05 PM PT** — Baltimore trending up
- **SEA @ KC — Friday, 6:45 PM PT** — Mariners road form strong
- **COL @ ATL — Friday, 5:40 PM PT** — Braves heavy home favorites

Los Angeles heading to St. Louis is the game we are most interested in from a model standpoint. The Dodgers carry one of the highest Elo ratings in baseball, but their road form over the past two weeks — including the Miami series — has been shakier than their overall record suggests. The Cardinals, boosted by their recent roll, enter with positive Elo momentum. This is a B-grade pick situation: genuine edge, but not the kind of certainty that earns an A.

Atlanta hosting Colorado on Friday, however, is as close to an automatic as this sport offers. The Rockies are statistically one of the weakest road teams in baseball over the past two seasons, and the Braves' home Elo advantage compounds that.

> "The Rockies have lost eleven of their last fourteen road games. That is not a trend. That is a pattern."

---

## On building a better baseball model

A word on where Game 163 stands after one month of the 2026 season, because context matters. The model currently runs on Elo ratings, rolling form windows, rest days, and prior-season pitcher ERA and WHIP. That is a solid foundation — the kind that historically accounts for roughly 57–59% of outcomes by itself. The additional features push us toward 61%.

We know where the ceiling probably is, and it is not 75%. Baseball is genuinely random at a level that football and basketball are not. A starter who throws 95 pitches in a tight game, then faces a team that saw him twice in the last month, in a ballpark he has historically struggled in — that context exists, and our current model does not fully see it. Lineup OPS, ballpark factors, umpire tendencies: these are the next features on the roadmap.

What we have built is honest. The walk-forward validation ensures that every percentage point of accuracy we report was earned against games the model had never seen. No cherry-picking, no hindsight. Just the numbers, as they happened.

**How the grades work**

- **Grade A — strong edge** — ≥ 65% win prob · 72.1% historical accuracy
- **Grade B — real edge** — 58–65% win prob · 61.8% historical accuracy
- **Grade C — marginal edge** — 50–58% win prob · 56.3% historical accuracy

We publish all grades. We post the misses alongside the hits. When the Mets give up fourteen runs to the Nationals — a team we had as a live underdog — we do not quietly update the history. The record is the record.

Check back tonight for settled results from today's slate, and tomorrow morning for Friday's full prediction card. May's schedule is unusually dense with interleague matchups, which historically widen our edge — teams face pitchers they have seen less often, making the model's rest and rolling-form features relatively more predictive. It is shaping up to be an interesting month.
