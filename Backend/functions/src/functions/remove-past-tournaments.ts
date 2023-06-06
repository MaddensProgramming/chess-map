import { TournamentModel } from "..";

export async function removePastTournaments(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ensures we are only comparing the date, not the time

  try {
    await TournamentModel.deleteMany({ startDate: { $lt: today } });
    console.log("Successfully removed past tournaments");
  } catch (error) {
    console.error("Failed to remove past tournaments:", error);
  }
}
