---
title: How Elo Ratings Work in Baseball
date: 2026-04-22
description: Elo was invented for chess. Here's how we adapted it to MLB and why it outperforms win percentage as a team strength signal.
slug: how-elo-works-in-baseball
---

Elo ratings were invented by physicist Arpad Elo to rank chess players. The core idea is elegant: your rating goes up when you beat strong opponents and down when you lose to weak ones. The amount it moves depends on how surprising the result was.

We adapted this system for MLB — and it turns out to be one of the strongest predictors of game outcomes we have.

## The basics

Every team starts each season with a rating near 1500. After each game:

1. We calculate the expected win probability based on the Elo difference
2. We compare that to the actual result (1 for a win, 0 for a loss)
3. We update both teams' ratings by `K × (result - expected)`

The **K factor** controls how fast ratings move. We use K=20 for regular season games — enough to respond to hot and cold streaks without overreacting to a single result.

## Why Elo beats win percentage

Win percentage treats a 2–1 victory over the Yankees the same as a 12–0 victory over the Rockies. Elo doesn't. It rewards winning against strong opponents and penalizes losing to weak ones.

It also handles schedule strength automatically. A .500 team in a tough division is rated higher than a .500 team in a weak one.

## Carry-over between seasons

We carry 75% of a team's end-of-season Elo rating into the following season, then regress 25% back toward 1500. This reflects the real world: roster changes and regression to the mean happen over the offseason, but strong teams tend to stay strong.

## The Elo edge stat

On the [Predictions](/predictions) page, you'll see an "Elo edge" column. This is simply the Elo rating difference between the two teams — positive means our pick has the stronger Elo rating. It's one of the clearest signals we have for game-day edge.
