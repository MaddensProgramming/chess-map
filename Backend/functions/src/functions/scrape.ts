import { Tournament } from "../models/tournament.model";
import { LogData } from "../models/logdata.model";
import { getAllTournaments } from "./get-tournaments-chesscalendar";
import { TournamentModel, db } from "..";

let changeLogs: LogData[] = [];

export const scrape = async (): Promise<void> => {
  try {
    changeLogs = []; // Reset the logs at the start of each scraping session

    const tournaments: Tournament[] = await getAllTournaments();
    console.log(`${tournaments.length} tournaments found`);

    const stats: Record<"added" | "updated" | "ignored", number> = { added: 0, updated: 0, ignored: 0 };

    for (const tournament of tournaments) {
      const existingTournament: Tournament[] = await TournamentModel.find({ eventName: tournament.eventName });

      if (existingTournament && existingTournament.length > 0) {
        const result = await handleExistingTournament(tournament, existingTournament);
        stats[result]++;
      } else {
        const result = await handleNewTournament(tournament);
        stats[result]++;
      }
    }

    // Once the scraping is done, write the log entries to a Firestore document
    const logDocId = new Date().toString();
    await db.collection("changeLogs").doc(logDocId).set({ entries: changeLogs, source: "chess-calendar" });

    console.log(`Tournaments uploaded successfully, ${stats.added} added, ${stats.updated} updated, ${stats.ignored} already ok`);
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
  }
};

const logAction = async (action: string, tournament: Tournament, existingTournament?: Tournament[]): Promise<void> => {
  const logData: LogData = {
    action,
    eventName: tournament.eventName,
    newSourceUrl: JSON.stringify(tournament.sourceUrl),
    previousSourceUrl: action === "Updated" ? JSON.stringify(existingTournament?.[0]?.sourceUrl) : undefined,
    timestamp: new Date(),
  };
  changeLogs.push(logData);
};
const handleExistingTournament = async (tournament: Tournament, existingTournament: Tournament[]): Promise<"added" | "updated" | "ignored"> => {
  if (existingTournament.length > 1) {
    await logAction("Ignored", tournament);
    console.error("Error", tournament);
    return "ignored";
  }
  if (JSON.stringify(existingTournament[0].sourceUrl) !== JSON.stringify(tournament.sourceUrl)) {
    await logAction("Updated", tournament, existingTournament);
    existingTournament[0].sourceUrl = tournament.sourceUrl;
    await existingTournament[0].save();
    return "updated";
  }
  return "ignored";
};
const handleNewTournament = async (tournament: Tournament): Promise<"added"> => {
  await TournamentModel.create(tournament);
  await logAction("Added", tournament);
  return "added";
};
