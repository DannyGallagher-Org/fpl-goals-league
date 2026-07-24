"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameweekScore, LeagueData, TeamStanding } from "@/lib/fpl";

type ViewMode = "season" | "gameweek";

function LoadingTable() {
  return (
    <div className="panel loading-panel">
      <div className="spinner" aria-hidden="true" />
      <p>Calculating goal points from the FPL data…</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return <span className={`rank rank-${rank}`}>{rank}</span>;
}

function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="rank-column">Pos</th>
            <th>Team</th>
            <th className="number-column">Goals</th>
            <th className="number-column">Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.id}>
              <td><RankBadge rank={index + 1} /></td>
              <td>
                <strong>{team.teamName}</strong>
                <span className="manager-name">{team.managerName}</span>
              </td>
              <td className="number-cell">{team.goals}</td>
              <td className="number-cell points-cell">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameweekStandings({ gameweek, seasonStandings }: {
  gameweek: GameweekScore;
  seasonStandings: TeamStanding[];
}) {
  const managerById = new Map(seasonStandings.map((team) => [team.id, team.managerName]));
  const sorted = [...gameweek.teams].sort(
    (a, b) => b.points - a.points || b.goals - a.goals || a.teamName.localeCompare(b.teamName),
  );

  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="rank-column">Pos</th>
            <th>Team</th>
            <th className="number-column">Goals</th>
            <th className="number-column">Points</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, index) => (
            <tr key={team.id}>
              <td><RankBadge rank={index + 1} /></td>
              <td>
                <strong>{team.teamName}</strong>
                <span className="manager-name">{managerById.get(team.id)}</span>
              </td>
              <td className="number-cell">{team.goals}</td>
              <td className="number-cell points-cell">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrackerTable({ data }: { data: LeagueData }) {
  return (
    <div className="table-scroll tracker-scroll">
      <table className="tracker-table">
        <thead>
          <tr>
            <th rowSpan={2} className="sticky-gameweek">GW</th>
            {data.standings.map((team) => (
              <th colSpan={2} key={team.id} className="team-group">{team.teamName}</th>
            ))}
          </tr>
          <tr>
            {data.standings.flatMap((team) => [
              <th key={`${team.id}-goals`} className="small-header">Goals</th>,
              <th key={`${team.id}-points`} className="small-header">Pts</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {[...data.gameweeks].reverse().map((gameweek) => {
            const scoreById = new Map(gameweek.teams.map((team) => [team.id, team]));
            return (
              <tr key={gameweek.gameweek}>
                <th className="sticky-gameweek">
                  {gameweek.gameweek}
                  {!gameweek.finished && <span className="live-dot" title="In progress" />}
                </th>
                {data.standings.flatMap((team) => {
                  const score = scoreById.get(team.id);
                  return [
                    <td key={`${gameweek.gameweek}-${team.id}-g`}>{score?.goals ?? 0}</td>,
                    <td key={`${gameweek.gameweek}-${team.id}-p`} className="tracker-points">{score?.points ?? 0}</td>,
                  ];
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<LeagueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("season");
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/league", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || json.error || "Unable to load FPL data");
      setData(json);
      setSelectedGameweek(json.currentGameweek || json.gameweeks.at(-1)?.gameweek || 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load FPL data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedGameweekData = useMemo(
    () => data?.gameweeks.find((gameweek) => gameweek.gameweek === selectedGameweek),
    [data, selectedGameweek],
  );

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">Unofficial FPL mini-league</div>
        <h1>FPL Goals League</h1>
        <p className="intro">
          Ranked only by points earned from goals. Captain and Triple Captain multipliers count;
          assists, clean sheets, appearances and bonus points do not.
        </p>
      </section>

      {loading && <LoadingTable />}

      {error && (
        <div className="panel error-panel">
          <h2>Couldn’t load the league</h2>
          <p>{error}</p>
          <button onClick={loadData}>Try again</button>
        </div>
      )}

      {!loading && data && (
        <>
          {data.warnings.length > 0 && (
            <div className="notice">
              {data.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}

          {data.standings.length > 0 && (
            <>
              <section className="panel">
                <div className="panel-heading controls-heading">
                  <div>
                    <p className="section-label">Leaderboard</p>
                    <h2>{mode === "season" ? "Season standings" : `Gameweek ${selectedGameweek}`}</h2>
                  </div>
                  <div className="controls">
                    <div className="segmented" aria-label="Leaderboard period">
                      <button className={mode === "season" ? "active" : ""} onClick={() => setMode("season")}>Season</button>
                      <button className={mode === "gameweek" ? "active" : ""} onClick={() => setMode("gameweek")}>Gameweek</button>
                    </div>
                    {mode === "gameweek" && (
                      <select
                        aria-label="Choose gameweek"
                        value={selectedGameweek}
                        onChange={(event) => setSelectedGameweek(Number(event.target.value))}
                      >
                        {[...data.gameweeks].reverse().map((gameweek) => (
                          <option key={gameweek.gameweek} value={gameweek.gameweek}>
                            Gameweek {gameweek.gameweek}{gameweek.finished ? "" : " · live"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {mode === "season" ? (
                  <StandingsTable standings={data.standings} />
                ) : selectedGameweekData ? (
                  <GameweekStandings gameweek={selectedGameweekData} seasonStandings={data.standings} />
                ) : (
                  <p>No data is available for that gameweek.</p>
                )}
              </section>

              <section className="panel tracker-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Week-by-week</p>
                    <h2>Gameweek tracker</h2>
                  </div>
                  <p className="hint">Scroll sideways to see every team</p>
                </div>
                <TrackerTable data={data} />
              </section>
            </>
          )}

          <footer>
            <span>Updated {new Date(data.generatedAt).toLocaleString("en-GB")}</span>
            <button className="refresh" onClick={loadData}>Refresh data</button>
            <span>Unofficial site · not affiliated with the Premier League</span>
          </footer>
        </>
      )}
    </main>
  );
}
