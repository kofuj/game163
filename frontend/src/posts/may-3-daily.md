---
title: The Cardinals Have Now Beaten the Model Three Times in a Row
date: 2026-05-03
description: May 2 went 6 for 15. The Dodgers are 0–3 against St. Louis despite never being below 62% favorites. Pittsburgh outscored Cincinnati 26–8 across two games. A hard look at what is happening.
slug: may-3-daily
---

| May 2 Picks | Correct | Accuracy | Grade B | Grade C |
|---|---|---|---|---|
| **15** settled | **6** correct | **40.0%** | **4/7 (57%)** | **2/8 (25%)** |

---

40% is a bad day. There is no way to frame 6 for 15 as anything other than that. What makes it worth examining carefully is *how* the losses happened — because the pattern is specific, and specific patterns are either signal or coincidence, and right now it is not yet clear which.

---

## The Dodgers problem

Los Angeles went into St. Louis on May 1 as 62.9% favorites and lost 7–2. They went back on May 2 as 64.8% favorites and lost 2–3. The model has now been wrong on this matchup three days running, and today it returns the Dodgers at 64.8% for Game 4 of the series.

That confidence level — held firm despite three straight losses — is not stubbornness. It is a function of how Bayesian posteriors update. Three games against one opponent do not meaningfully move a team's win-rate distribution when that distribution is anchored on a full season of evidence. The Dodgers have one of the best road records in the National League. Their Elo rating remains the highest in the model. Their starting pitcher ERA over the last five starts is elite. None of that changed because the Cardinals have had an excellent homestand.

What the model does not fully encode: Jordan Walker has been hitting .360 against left-handed pitching this month, the Cardinals' bullpen has thrown fewer innings than any team in baseball over the last two weeks, and Busch Stadium plays significantly cooler at night in early May, suppressing the Dodgers' fly-ball offense. These are real factors. They are also the kind of factors that disappear in a larger sample — which is why the model does not hard-code them, and why a four-game series against one opponent cannot override a thousand-game prior.

Still. Three straight. It is worth watching.

---

## Pittsburgh is doing something to Cincinnati

**May 1:** Pirates 9, Reds 1.  
**May 2:** Pirates 17, Reds 7.

Across two games, Pittsburgh has outscored Cincinnati 26–8. The model picked the Reds both days — at 57.4% on May 1, at 56.4% on May 2. Both were comfortable Grade C picks, both lost by large margins.

The Reds' Bayesian win-rate posterior has been dropping daily since this series started. Pittsburgh's bullpen ERA over the last ten days is 2.1 — the best in the NL. Their rotation has given the offense early leads in five consecutive games. At some point, a team running this hot earns a model adjustment, and the Reds' posterior is updating accordingly.

The practical implication: Cincinnati does not appear again in today's picks.

---

## What held up

Four Grade B picks hit cleanly, and they hit by the margins you want to see.

**May 2 — Grade B results**

| Away | Home | Score | Pick | Prob | Result |
|---|---|---|---|---|---|
| Cleveland Guardians | Athletics | 14–6 | Guardians | 61.1% | HIT |
| Milwaukee Brewers | Washington Nationals | 4–1 | Brewers | 61.1% | HIT |
| Houston Astros | Boston Red Sox | 6–3 | Astros | 58.1% | HIT |
| Atlanta Braves | Colorado Rockies | 9–1 | Braves | 61.1% | HIT |
| Philadelphia Phillies | Miami Marlins | 0–4 | Phillies | 58.9% | MISS |
| Los Angeles Dodgers | St. Louis Cardinals | 2–3 | Dodgers | 64.8% | MISS |
| New York Mets | Los Angeles Angels | 3–4 | Mets | 58.9% | MISS |

Cleveland won by eight. Atlanta won by eight at Coors — the second straight dominant Braves win in that park, which is remarkable given how forgiving Coors is for opposing offenses. Milwaukee won a third consecutive series game against Washington. Houston took Boston on the road.

The three Grade B misses were tight: Phillies blanked 4–0, Dodgers edged 3–2, Mets lost by one in a close game. None of those were blowouts in the wrong direction. One good inning changes all three. That is the Grade B tier doing what it is supposed to do — lose close when it loses.

---

## May so far

| Date | Correct | Accuracy | Grade B |
|---|---|---|---|
| May 1 | 8/15 | 53.3% | 5/6 |
| May 2 | 6/15 | 40.0% | 4/7 |
| **May total** | **14/30** | **46.7%** | **9/13 (69%)** |

Two days in, May is 46.7% overall — below the home baseline. But Grade B is 9 for 13 across both days. The model's edges are real where they are large. The Grade C tier is dragging the headline number down, and the Dodgers situation is adding three losses to the Grade B column that the Cardinals have simply earned.

The running season record through May 2: **84 correct out of 163 settled picks. 51.5%.**

---

## Today: May 3

Same seven Grade B picks. The Cardinals series ends today.

| Away | Home | Pick | Grade | Prob |
|---|---|---|---|---|
| Los Angeles Dodgers | St. Louis Cardinals | Dodgers | B | 64.8% |
| Milwaukee Brewers | Washington Nationals | Brewers | B | 61.1% |
| Atlanta Braves | Colorado Rockies | Braves | B | 61.1% |
| Cleveland Guardians | Athletics | Guardians | B | 61.1% |
| New York Mets | Los Angeles Angels | Mets | B | 58.9% |
| Houston Astros | Boston Red Sox | Astros | B | 58.1% |
| Philadelphia Phillies | Miami Marlins | Phillies | B | 59.0% |

If the Dodgers lose a fourth straight, this series will have cost the model four Grade B misses in a row against the same opponent. That would be the kind of sustained underperformance that warrants a dedicated model review — not to retroactively explain the losses, but to ask whether the Cardinals' home splits deserve explicit representation in the feature set.

For now, the prior stands.
