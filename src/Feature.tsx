import { useEffect, useMemo } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
const ROUNDS = [
  { left: ["☀", "◆", "☂", "♬"], right: ["✦", "☀", "♥", "☾"], answer: "☀" },
  { left: ["⚡", "●", "☾", "♣"], right: ["◆", "☾", "☂", "✦"], answer: "☾" },
  { left: ["♥", "⚡", "✦", "●"], right: ["♬", "♥", "☂", "◆"], answer: "♥" },
  { left: ["♣", "☀", "◆", "⚡"], right: ["⚡", "☾", "♬", "●"], answer: "⚡" },
  { left: ["☂", "✦", "♥", "♣"], right: ["●", "☂", "☀", "♬"], answer: "☂" },
] as const;
type GameState = {
  id: "game";
  round: number;
  scores: Record<string, number>;
  lastWinner: string | null;
  updatedAt: number;
};
const initialState: GameState = {
  id: "game",
  round: 0,
  scores: {},
  lastWinner: null,
  updatedAt: 0,
};
function safeScores(value: unknown): value is Record<string, number> {
  return (
    !!value &&
    typeof value === "object" &&
    Object.entries(value).length <= 16 &&
    Object.entries(value).every(
      ([name, score]) =>
        name.length > 0 &&
        name.length <= 32 &&
        /^[\p{L}\p{N} ._-]+$/u.test(name) &&
        Number.isInteger(score) &&
        score >= 0 &&
        score <= 99,
    )
  );
}
/** Reject malformed peer data before it can enter the shared game document. */
export function isValidGameState(value: GameState): boolean {
  return (
    value?.id === "game" &&
    Number.isInteger(value.round) &&
    value.round >= 0 &&
    value.round <= ROUNDS.length &&
    safeScores(value.scores) &&
    (value.lastWinner === null ||
      (typeof value.lastWinner === "string" && value.lastWinner.length <= 32)) &&
    Number.isFinite(value.updatedAt)
  );
}

export function Feature({ room, config }: Props) {
  const { name, setName, myName } = useNamedPeer(config, room);
  const game = useSharedCollection<GameState>(room, "mesh-spot-it:game", {
    validate: isValidGameState,
  });
  const state = game.byId("game");
  useEffect(() => {
    if (room && !state) game.add(initialState);
  }, [room, state, game]);
  const current = state && state.round < ROUNDS.length ? ROUNDS[state.round] : null;
  const leaders = useMemo(
    () =>
      Object.entries(state?.scores ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [state?.scores],
  );
  const status = !room
    ? "Connecting to the shared race…"
    : !state
      ? "Preparing the cards…"
      : !current
        ? "Round complete. Start a new race whenever everyone is ready."
        : state.lastWinner
          ? `${state.lastWinner} spotted the last match. Find the next shared symbol!`
          : "Find the one symbol shown on both cards, then select it.";
  const choose = (symbol: string) => {
    if (!state || !current || !myName || symbol !== current.answer) return;
    game.update("game", {
      round: state.round + 1,
      scores: { ...state.scores, [myName]: (state.scores[myName] ?? 0) + 1 },
      lastWinner: myName,
      updatedAt: Date.now(),
    });
  };
  const reset = () => state && game.update("game", { ...initialState, updatedAt: Date.now() });
  return (
    <main className="spot-it" aria-labelledby="game-title">
      <header className="spot-it__hero">
        <p className="eyebrow">Shared, browser-local symbol race</p>
        <h1 id="game-title">Spot it</h1>
        <p className="lede">
          Two cards, one shared symbol. Be the first to spot it—no accounts or tracking.
        </p>
      </header>
      <section className="race-panel" aria-label="Shared symbol race">
        <div className="race-panel__bar">
          <p className="race-status" aria-live="polite">
            {status}
          </p>
          <button type="button" className="reset-button" onClick={reset} disabled={!state}>
            New race
          </button>
        </div>
        <p className="game-help" id="game-help">
          Use Tab to explore each card. Select the matching symbol only after adding your display
          name.
        </p>
        {current ? (
          <div className="cards" aria-describedby="game-help">
            {(["left", "right"] as const).map((side, cardIndex) => (
              <div className="symbol-card" key={side}>
                <h2>Card {cardIndex ? "B" : "A"}</h2>
                <div className="symbol-grid">
                  {current[side].map((symbol, index) => (
                    <button
                      key={`${side}-${symbol}-${index}`}
                      type="button"
                      onClick={() => choose(symbol)}
                      aria-label={`Card ${cardIndex ? "B" : "A"} symbol ${symbol}`}
                      disabled={!myName}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="complete-card">
            <p>Five matches complete.</p>
            <p>Keep the room open to play another shared race.</p>
          </div>
        )}
        <p className="round-count" aria-live="polite">
          Round {(state?.round ?? 0) + (current ? 1 : 0)} of {ROUNDS.length}
        </p>
      </section>
      <section className="score-panel" aria-labelledby="score-title">
        <div>
          <p className="eyebrow">Shared score</p>
          <h2 id="score-title">Scoreboard</h2>
        </div>
        <ol>
          {leaders.length ? (
            leaders.map(([player, score]) => (
              <li key={player}>
                <span>{player}</span>
                <strong>{score}</strong>
              </li>
            ))
          ) : (
            <li className="empty-score">No scores yet—find the first match.</li>
          )}
        </ol>
      </section>
      <section className="player-panel" aria-label="Player identity">
        <div>
          <p className="eyebrow">Your local display name</p>
          <p className="player-note">
            {myName
              ? `${myName} is ready to race.`
              : "Add a name to enable your choices and shared score."}
          </p>
        </div>
        <MeshNameInput
          value={name}
          onChange={setName}
          ariaLabel="Your display name"
          placeholder="Your name"
          maxLength={32}
        />
      </section>
      <footer className="privacy-note">
        Symbols and scores sync directly among browsers in this room. No account, location, or
        server-stored score is needed.
      </footer>
    </main>
  );
}
