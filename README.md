# heartwood-last-bloom

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dajinxiaodui/heartwood-last-bloom/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dajinxiaodui/heartwood-last-bloom/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Heartwood: Last Bloom** — a neon forest wave-defense game in plain HTML5 canvas.
You are the Grove Guardian. Blight creatures pour in from the dark edges of the
clearing, wave after wave, all of them hungry for the Heart Tree at the centre.
Move with WASD or the arrow keys, aim with the mouse, and hold to fire seeds of
light. Catch the sparks that fallen enemies drop to heal the tree, raise a shield,
or overcharge your shots. Survive all eight waves and bring down the Blight Maw —
if the tree falls, or you do, the grove is lost.

No build step, no dependencies, no network: the whole game is static files under
`game/` and runs offline in a desktop browser.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

To produce the hand-in bundle (game + screenshots + dossier.json):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=qtgxrqfw&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
