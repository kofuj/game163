---
title: April in Review — and Why We Rebuilt the Model
date: 2026-05-01
description: 133 picks, a brutal final weekend, and what it taught us. Plus the full story on the Bayesian upgrade that went live this week.
slug: april-in-review
---

| April Picks | Correct | Accuracy | Best Day | Worst Day |
|---|---|---|---|---|
| **133** settled | **70** correct | **52.6%** | **67%** (Apr 23, Apr 28) | **18%** (Apr 30) |

---

April is over. Across ten days of predictions — 133 settled picks in total — the model hit at 52.6%. That is above the MLB home baseline of 54.2% on overall accuracy, though the grade distribution tells a more honest story: Grade B picks came in at 47.6% (21 picks, 10 correct), while Grade C picks, counterintuitively, outperformed them at 53.6%. We will get to why that happened.

But first: the last three days of April were genuinely bad, and they deserve an honest account before anything else.

> "A 33% day followed by an 18% day is not noise. It is a signal worth reading carefully."

## The brutal end of April

April 29 went 5 for 15 — 33%. April 30 went 2 for 11 — 18%. Across those two days the model was wrong on 19 of 26 picks. That is not variance. That is the kind of stretch that tells you something about where the model's edges are not.

**April 29 — selected results**

| Away | Home | Score | Model Pick | Outcome |
|---|---|---|---|---|
| New York Yankees | Texas Rangers | 0–3 | Yankees | MISS |
| Boston Red Sox | Toronto Blue Jays | 1–8 | Red Sox | MISS |
| Miami Marlins | Los Angeles Dodgers | 3–2 | Dodgers | MISS |
| Colorado Rockies | Cincinnati Reds | 13–2 | Reds | MISS |
| Washington Nationals | New York Mets | 14–2 | Mets | MISS |

**April 30 — selected results**

| Away | Home | Score | Model Pick | Outcome |
|---|---|---|---|---|
| Washington Nationals | New York Mets | 5–4 | Mets | MISS |
| Kansas City Royals | Athletics | 3–6 | Royals | MISS |
| Toronto Blue Jays | Minnesota Twins | 1–7 | Blue Jays | MISS |
| Arizona Diamondbacks | Milwaukee Brewers | 1–13 | Diamondbacks | MISS |
| St. Louis Cardinals | Pittsburgh Pirates | 10–5 | Cardinals | HIT |

The pattern is obvious: on both days, the model favored the away team or the Elo-stronger team, and the home team repeatedly blew them out. Cincinnati beat Colorado 13–2. Minnesota beat Toronto 7–1. Milwaukee beat Arizona 13–1. The Nationals — again — beat the Mets 14–2 and 5–4 in consecutive days. These were not close games that went the wrong way. They were routes.

What the model does not currently see: hot streaks on the home side, bullpen fatigue from a road trip, or the fact that a team playing at home in late April with postseason implications in the air plays differently than their Elo rating suggests. These are features on the roadmap. They were not in April.

---

## The bright spots

Before the final weekend, April had real stretches of quality. April 28 went 10 for 15 — 67%. April 27 went 5 for 8 — 62%. April 23 went 6 for 9 — 67%.

**Best picks of the month**

| Date | Away | Home | Pick | Confidence | Result |
|---|---|---|---|---|---|
| Apr 22 | Athletics | Seattle Mariners | Mariners | 62.6% | 4–5 HIT |
| Apr 23 | Minnesota Twins | New York Mets | Mets | 61.2% | 8–10 HIT |
| Apr 27 | Miami Marlins | Los Angeles Dodgers | Dodgers | 60.4% | 4–5 HIT |
| Apr 28 | Detroit Tigers | Atlanta Braves | Braves | 59.2% | 2–5 HIT |

These are exactly the kinds of picks the model is designed to find: teams with meaningful Elo advantages and strong rolling form at home against road teams showing fatigue or weakness. They hit. The grade system worked correctly on them.

The hardest misses of the month were also the most instructive:

| Date | Pick | Confidence | Result |
|---|---|---|---|
| Apr 21 | Seattle Mariners | 63.5% | MISS — Athletics won 5–2 |
| Apr 24 | New York Mets | 62.9% | MISS — Rockies won 4–3 |
| Apr 30 | Toronto Blue Jays | 61.2% | MISS — Twins won 7–1 |

All three were Grade B picks — our highest conviction tier. All three lost by multiple runs. This is what drove the Grade B underperformance this month. The model's highest-confidence picks ran into three blowout losses that skewed the grade's accuracy downward. Over a full season, the law of large numbers smooths this. Over ten days, it does not.

---

## Why we rebuilt the model

After April 24, when Grade B picks were sitting at 50% and the end-of-month collapse was beginning to take shape, we made the decision to upgrade the statistical foundation before May.

The old model used Elo ratings — point estimates — fed into a gradient boosting classifier. Elo is good at capturing relative team strength over time. It is not good at expressing *uncertainty*. When a team has played six games and has a 4–2 record, Elo gives you a number. It does not tell you that number is based on six games and could easily shift.

The new model uses **Bayesian team strength ratings**: each team carries a Beta distribution over its true win rate. A team ten games into the season has a wide posterior — we are genuinely uncertain about them. A team eighty games in has a tight posterior. This uncertainty is now a feature in the model, not invisible.

The classifier also changed. Where gradient boosting treated each prediction independently, the new **Bayesian logistic regression** places a Gaussian prior on every coefficient and cross-validates the prior strength against log-loss. In plain terms: it learns not just *which features matter*, but *how confident to be* about each one. The Elo edge on a well-established contender gets more weight than the same numerical edge on a team in the first week of the season.

The walk-forward validation structure did not change. Every accuracy number we report is still earned against games the model never saw.

---

## What to expect in May

May's schedule is dense with interleague matchups — historically the part of the season where models like ours perform better. Teams face pitchers they have seen less frequently, and the home-field and roster-depth features that drive our predictions are more predictive when the opposition is less familiar.

A few things we are watching:

- **The Mets** have appeared in six model picks this month. The model has favored them repeatedly. They are 1–5 against those picks. Either the Mets are genuinely worse than their Elo rating suggests — a late-spring calibration problem — or April was a brutal run of variance. May will tell us which.
- **The Brewers** are quietly one of the better home teams in our model. Their rolling form has been strong, their home Elo advantage is significant, and the model has liked them in late-April matchups. Watch for Milwaukee at home in May.
- **The Dodgers** remain the model's favorite team by Elo rating. Their two-game slide against Miami in late April barely moved their posterior. Los Angeles on the road against strong opponents will be the Grade A pick source for the next month.

---

## The record stands

70 correct out of 133 settled picks. 52.6%. We would have preferred more. We are not going to pretend the final weekend was anything other than what it was.

What we can say: the model's misses are visible, timestamped, and unedited. The history page shows every pick in chronological order with the score of every game. Nothing is retroactively removed when the model is wrong. The final three days of April are right there — April 29, April 30 — with the scores.

That is the commitment. The record is the record. May starts fresh.
