const FPL_API = "https://fantasy.premierleague.com/api";

export type TeamStanding = {
  id: number;
  teamName: string;
  managerName: string;
  goals: number;
  points: number;
};

export type GameweekTeamScore = {
  id: number;
  teamName: string;
  goals: number;
  points: number;
};

export type GameweekScore = {
  gameweek: number;
  finished: boolean;
  teams: GameweekTeamScore[];
};

export type LeagueData = {
  generatedAt: string;
  currentGameweek: number;
  gameweeks: GameweekScore[];
  standings: TeamStanding[];
  warnings: string[];
};

type Bootstrap = {
  events: Array<{
    id: number;
    name: string;
    finished: boolean;
    is_current: boolean;
    data_checked: boolean;
  }>;
  elements: Array<{
    id: number;
    element_type: number;
    web_name: string;
  }>;
};

type Entry = {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
};

type PicksResponse = {
  picks: Array<{
    element: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

type LiveResponse = {
  elements: Array<{
    id: number;
    stats: {
      goals_scored: number;
      minutes: number;
    };
  }>;
};

const GOAL_POINTS_BY_POSITION: Record<number, number> = {
  1: 10, // Goalkeeper
  2: 6,  // Defender
  3: 5,  // Midfielder
  4: 4,  // Forward
};

async function fetchFpl<T>(path: string): Promise<T> {
  const response = await fetch(`${FPL_API}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FPL-Goals-League/1.0",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`FPL request failed (${response.status}) for ${path}`);
  }

  return response.json() as Promise<T>;
}

function managerDisplayName(entry: Entry): string {
  const fullName = `${entry.player_first_name ?? ""} ${entry.player_last_name ?? ""}`.trim();
  return fullName || `Manager ${entry.id}`;
}

export async function buildLeagueData(teamIds: number[]): Promise<LeagueData> {
  if (teamIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      currentGameweek: 0,
      gameweeks: [],
      standings: [],
      warnings: ["No team IDs have been added yet. Edit lib/teamIds.ts to add them."],
    };
  }

  const uniqueTeamIds = [...new Set(teamIds)].filter((id) => Number.isInteger(id) && id > 0);
  const warnings: string[] = [];
  const bootstrap = await fetchFpl<Bootstrap>("/bootstrap-static/");

  const completedOrStartedEvents = bootstrap.events.filter(
    (event) => event.finished || event.is_current || event.data_checked,
  );

  const currentGameweek =
    bootstrap.events.find((event) => event.is_current)?.id ??
    completedOrStartedEvents.at(-1)?.id ??
    0;

  const elementPosition = new Map(
    bootstrap.elements.map((element) => [element.id, element.element_type]),
  );

  const entriesSettled = await Promise.allSettled(
    uniqueTeamIds.map((id) => fetchFpl<Entry>(`/entry/${id}/`)),
  );

  const entries: Entry[] = [];
  entriesSettled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      entries.push(result.value);
    } else {
      warnings.push(`Could not load FPL team ID ${uniqueTeamIds[index]}. Check that the ID is correct.`);
    }
  });

  const totals = new Map<number, TeamStanding>();
  entries.forEach((entry) => {
    totals.set(entry.id, {
      id: entry.id,
      teamName: entry.name,
      managerName: managerDisplayName(entry),
      goals: 0,
      points: 0,
    });
  });

  const gameweeks: GameweekScore[] = [];

  // Work one gameweek at a time. This limits the number of simultaneous calls
  // while still fetching all teams for a gameweek in parallel.
  for (const event of completedOrStartedEvents) {
    const [liveResult, ...pickResults] = await Promise.allSettled([
      fetchFpl<LiveResponse>(`/event/${event.id}/live/`),
      ...entries.map((entry) =>
        fetchFpl<PicksResponse>(`/entry/${entry.id}/event/${event.id}/picks/`),
      ),
    ]);

    if (liveResult.status === "rejected") {
      warnings.push(`Gameweek ${event.id} live player data could not be loaded.`);
      continue;
    }

    const goalsByPlayer = new Map(
      liveResult.value.elements.map((element) => [element.id, element.stats.goals_scored]),
    );

    const teamScores: GameweekTeamScore[] = [];

    pickResults.forEach((result, index) => {
      const entry = entries[index];
      let goals = 0;
      let points = 0;

      if (result.status === "rejected") {
        warnings.push(`Could not load ${entry.name}'s picks for Gameweek ${event.id}.`);
      } else {
        for (const pick of result.value.picks) {
          // FPL's final pick multiplier handles bench players, auto-subs,
          // captaincy and Triple Captain. A multiplier of 0 means the player's
          // score does not count for the manager that gameweek.
          if (pick.multiplier <= 0) continue;

          const playerGoals = goalsByPlayer.get(pick.element) ?? 0;
          if (playerGoals <= 0) continue;

          const position = elementPosition.get(pick.element);
          const pointsPerGoal = position ? GOAL_POINTS_BY_POSITION[position] : 0;

          goals += playerGoals;
          points += playerGoals * pointsPerGoal * pick.multiplier;
        }
      }

      const total = totals.get(entry.id);
      if (total) {
        total.goals += goals;
        total.points += points;
      }

      teamScores.push({ id: entry.id, teamName: entry.name, goals, points });
    });

    gameweeks.push({
      gameweek: event.id,
      finished: event.finished,
      teams: teamScores,
    });
  }

  const standings = [...totals.values()].sort(
    (a, b) => b.points - a.points || b.goals - a.goals || a.teamName.localeCompare(b.teamName),
  );

  return {
    generatedAt: new Date().toISOString(),
    currentGameweek,
    gameweeks,
    standings,
    warnings: [...new Set(warnings)],
  };
}
