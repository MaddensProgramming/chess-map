import { load } from "cheerio";
import { parse } from "date-fns";
import axios from "axios";
import latinize from "latinize";
import { Tournament } from "../models/tournament.model";

// This function fetches all tournaments from multiple URLs and consolidates the results.
export async function getAllTournaments(): Promise<Tournament[]> {
  const chessCalendarURLs = generateChessCalendarURLs();
  const allTournaments: Tournament[] = [];

  for (const url of chessCalendarURLs) {
    try {
      const html = await fetchHTML(url);
      const tournaments = extractTournamentsFromHTML(html);
      allTournaments.push(...tournaments);
    } catch (error) {
      console.error(`Error processing URL: ${url}`);
      console.error(error);
    }
  }

  return allTournaments;
}
// This function parses a month's worth of tournaments from a HTML string.
function extractTournamentsFromHTML(html: string): Tournament[] {
  const events: Tournament[] = [];
  const $ = load(html);

  $(".calItem").each((i, el) => {
    const tournament = createTournamentFromElement($, el);
    const existingTournament = events.find(({ eventName }) => eventName === tournament.eventName);

    if (existingTournament) {
      updateTournament(existingTournament, tournament);
    } else {
      events.push(tournament);
    }
  });
  events.forEach((tournament) => tournament.sourceUrl.sort());

  return events;
}
// This function creates a tournament object from a jQuery element.
function createTournamentFromElement($: any, el: any): Tournament {
  const startDate = parse($(el).find(".startdate").text().trim(), "dd.MM.yyyy", new Date());
  const endDateString = $(el).find(".endDate").text().trim();
  const endDate = endDateString ? parse(endDateString, "dd.MM.yyyy", new Date()) : null;
  const eventName = latinize($(el).find(".weblink").text().trim()).replace(" - ChessManager", "");
  const city = $(el).find(".city").text().trim().substring(2);
  const country = $(el).find(".country").text().trim().substring(2);
  const sourceUrl = $(el).find(".source a").attr("href")?.split("<td>")[0];
  const locationUrl = $(el).find(".extensions a").attr("href") ?? null;

  const length = endDate ? 1 + (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) : 1;
  const location = locationUrl ? parseLocation(locationUrl) : undefined;

  return {
    startDate,
    endDate,
    eventName,
    city,
    country,
    sourceUrl: [sourceUrl],
    length,
    location,
  } as Tournament;
}
// This function updates an existing tournament object with a new one.
function updateTournament(existingTournament: Tournament, newTournament: Tournament): void {
  if (existingTournament.sourceUrl?.every((url) => url !== newTournament.sourceUrl[0])) {
    existingTournament.sourceUrl.push(newTournament.sourceUrl[0] ?? "");
  }

  if (!existingTournament?.location && newTournament.location) {
    existingTournament.location = newTournament.location;
  }
}
// This function parses a location URL and returns a GeoJSON object.
function parseLocation(locationUrl: string): any {
  const locationUrlParts = locationUrl.split("?q=")[1].split(",+");
  const coordinates = [parseFloat(locationUrlParts[1]), parseFloat(locationUrlParts[0])];

  return {
    type: "Point",
    coordinates,
  };
}
// This function generates URLs for chess calendars from the current month up to the same month of the next year.
function generateChessCalendarURLs(): string[] {
  const currentDate = new Date();
  const startMonth = currentDate.getMonth();
  const startYear = currentDate.getFullYear();

  const urls: string[] = [];

  for (let i = 0; i < 12; i++) {
    const month = ((startMonth + i) % 12) + 1; // Month count should start from 1
    const year = startYear + Math.floor((startMonth + i) / 12);

    const url = `https://chess-calendar.eu/?page=${year}-${month}`;
    urls.push(url);
  }

  return urls;
}
// This function fetches the HTML of a given URL.
async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      throw new Error(`Received status code ${response.status}`);
    }
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch HTML for URL: ${url} with error: ${error}`);
  }
}
