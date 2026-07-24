import { NextResponse } from "next/server";
import { buildLeagueData } from "@/lib/fpl";
import { TEAM_IDS } from "@/lib/teamIds";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await buildLeagueData(TEAM_IDS);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "The FPL data could not be loaded.", detail: message },
      { status: 500 },
    );
  }
}
