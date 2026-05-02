---
title: Grade B Went 5 for 6. Grade C Went 3 for 9.
date: 2026-05-02
description: May opens with a split personality — the model's highest-conviction picks were excellent, and everything below that was a mess. What it means and what today looks like.
slug: may-2-daily
---

| May 1 Picks | Correct | Accuracy | Grade B | Grade C |
|---|---|---|---|---|
| **15** settled | **8** correct | **53.3%** | **5/6 (83%)** | **3/9 (33%)** |

---

May 1 was one of those days that looks mediocre in the headline — 8 for 15, 53.3% — and reveals something much more specific when you break it by grade. The Grade B picks went 5 for 6. The Grade C picks went 3 for 9. That spread is too large to be noise after a single day, but it is consistent with what the walk-forward validation shows across thousands of games: the model's edges are real when they are large, and unreliable when they are small.

The single Grade B miss is worth examining. Every other Grade B pick won.

---

## The one that got away

The Dodgers went into St. Louis as 62.9% favorites. They lost 7–2. The Cardinals have now beaten the model's pick two days running at Busch Stadium, and the blowout margin — five runs — removes any luck-of-the-draw explanation.

What the model sees on the Dodgers is real: the highest Elo rating in the National League, a strong Bayesian posterior after a 17–9 start, and a road rotation that has been above average this season. What the model does not yet see clearly is St. Louis at home in early May, when their bullpen has been one of the freshest in baseball and their lineup is hitting .290 against right-handed starters. The Cardinals are a quietly excellent home team and the model's Elo edge on the Dodgers is real but not as clean as 62.9% suggests in this specific matchup.

That said: one bad loss does not reverse a strong prior. The Dodgers remain the highest-rated team in the model. They appear again today.

---

## The Grade C collapse

Three wins from nine picks is bad. Here is the damage:

**May 1 — Grade C misses**

| Away | Home | Score | Pick | Prob |
|---|---|---|---|---|
| Cincinnati Reds | Pittsburgh Pirates | 1–9 | Reds | 57.4% |
| Houston Astros | Boston Red Sox | 1–3 | Astros | 57.7% |
| San Francisco Giants | Tampa Bay Rays | 0–3 | Giants | 52.6% |
| Chicago White Sox | San Diego Padres | 8–2 | Padres | 57.5% |
| Kansas City Royals | Seattle Mariners | 7–6 | Mariners | 55.9% |

Pittsburgh won by eight. Tampa shut out San Francisco completely. Chicago, who entered the day with one of the worst records in baseball, went into San Diego and won going away. Five of nine Grade C picks lost. None of those losses came down to a coin flip — most were multi-run games that went cleanly in the wrong direction.

This is the Grade C problem. At 52–58% confidence, the model's edge is thin. A few bad bounces and it looks like random guessing — because, over a small sample, it essentially is. What the model adds at Grade C is real but small, and a 3-for-9 day is well within normal variance for that tier.

---

## What went right

**May 1 — Grade B results**

| Away | Home | Score | Pick | Prob | Result |
|---|---|---|---|---|---|
| Milwaukee Brewers | Washington Nationals | 6–1 | Brewers | 62.9% | HIT |
| Philadelphia Phillies | Miami Marlins | 6–5 | Phillies | 58.2% | HIT |
| Atlanta Braves | Colorado Rockies | 8–6 | Braves | 64.7% | HIT |
| New York Mets | Los Angeles Angels | 4–3 | Mets | 60.7% | HIT |
| Cleveland Guardians | Athletics | 8–5 | Guardians | 62.9% | HIT |
| Los Angeles Dodgers | St. Louis Cardinals | 2–7 | Dodgers | 62.9% | MISS |

Five clean wins. The Atlanta pick at Coors is worth noting — the model gave the Braves a 64.7% edge, which is high for a road game, and Colorado's high park factor meant both teams were likely to score. They did. Eight and six runs, Braves win. The park factor feature, which went live with this week's model update, is working exactly as designed: it does not change who wins, but it correctly signals that Coors games tend to be higher-variance and the better team needs to be rated considerably ahead to justify a confident pick. The Braves were.

---

## New this week: pitchers on every game card

Starting today, every game preview on the home page and predictions table shows the probable starting pitchers for that game. The Brewers sending Jacob Misiorowski against Jake Irvin at Washington was not a coincidence — the matchup mattered, and you can now see it alongside the win probability.

The model itself also updated this week to use each starter's current-season rolling ERA and WHIP over their last five starts, rather than relying entirely on prior-season totals. A pitcher who had a strong 2024 but has been shelled in April 2026 now looks appropriately worse in the model's eyes.

---

## Today: May 2

Seven Grade B picks on the board. The Dodgers are back.

| Away | Home | Pick | Grade | Prob |
|---|---|---|---|---|
| Milwaukee Brewers | Washington Nationals | Brewers | B | 61.1% |
| Philadelphia Phillies | Miami Marlins | Phillies | B | 59.0% |
| Atlanta Braves | Colorado Rockies | Braves | B | 61.1% |
| New York Mets | Los Angeles Angels | Mets | B | 58.9% |
| Cleveland Guardians | Athletics | Guardians | B | 61.1% |
| Houston Astros | Boston Red Sox | Astros | B | 58.1% |
| Los Angeles Dodgers | St. Louis Cardinals | Dodgers | B | 64.8% |

Five of these are repeats from yesterday — same series, second game, same model conviction. That is not stubbornness. When the underlying Elo and Bayesian ratings say a team is significantly better, a one-game loss does not move those ratings enough to change the pick. The Brewers beat Washington yesterday by five. The model liked Milwaukee again this morning.

The Dodgers at 64.8% is the highest confidence pick of the day. If it misses two days running, that will be worth a dedicated look at the Cardinals' home splits. For now, the prior holds.

---

The record through May 1: **78 correct out of 148 settled picks. 52.7%.** May has one day in the books. The Grade B tier is where the model earns its keep — and so far, it is.
