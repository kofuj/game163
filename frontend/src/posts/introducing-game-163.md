---
title: Introducing Game 163
date: 2026-04-21
description: Why we built a walk-forward validated MLB win probability model, and what makes it different from the noise.
slug: introducing-game-163
---

Baseball is a sport obsessed with data. Yet most prediction sites still rely on gut feel dressed up in statistics — power rankings, hot streaks, vague "expert picks." We built Game 163 to do something different.

## What is Game 163?

Game 163 is a machine learning model that predicts the winner of every MLB game before first pitch. It's named after the tiebreaker games that decide playoff spots — the moments where every percentage point matters.

The model combines three inputs:

- **Elo ratings** — a dynamic team strength measure updated after every game
- **Rolling form** — 10- and 30-game win rate, run differential, and rest days
- **Pitcher matchup** — prior-season ERA and WHIP for each starter

## Why walk-forward validation?

Most prediction models are tested on the same data they were trained on. That's cheating. A model that "learned" from 2023 games and is then tested on 2023 games will always look good — because it already saw the answers.

We use **walk-forward validation**: the model is trained only on seasons before the test season. 2022 predictions are made using a model trained on 2019–2021 data only. No peeking at the future.

This is the only honest way to evaluate a sports prediction model. Our 55.1% overall accuracy and 64.3% Grade A accuracy come from real out-of-sample forecasts across 9,936 games.

## The grade system

Not every prediction is equally confident. We grade picks A, B, or C based on the model's predicted edge over 50/50:

- **Grade A** — ≥65% win probability. Highest edge, 64.3% historical accuracy.
- **Grade B** — 58–65% win probability. Solid edge.
- **Grade C** — 50–58% win probability. Marginal edge.

We publish every pick, every day — including the ones that lose. The full history is always visible on the [History](/history) page.
