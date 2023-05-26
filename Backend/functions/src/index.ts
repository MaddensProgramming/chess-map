import express, { Request, Response } from "express";
import mongoose, { Document, Schema } from "mongoose";
import { load } from "cheerio";
import { parse } from "date-fns";
import axios from "axios";
import functions from "firebase-functions";
import latinize from "latinize";

const uri = process.env["TEST"] ?? "";

// Define the Tournament interface
export interface Tournament extends Document {
  startDate: Date;
  endDate?: Date;
  eventName: string;
  city: string;
  country: string;
  locationUrl?: string;
  sourceUrl: string[];
  length: number;
  lat?: number;
  lng?: number;
}
console.log(uri);

// Connect to MongoDB
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });

// Create the Tournament schema
const tournamentSchema = new Schema<Tournament>({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  eventName: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  locationUrl: { type: String },
  sourceUrl: { type: [String], required: true },
  length: { type: Number, required: true },
  lat: { type: Number },
  lng: { type: Number },
});

// Create the Tournament model
const TournamentModel = mongoose.model<Tournament>("Tournament", tournamentSchema);

// Create the Express app
const app = express();
app.use(express.json());

// Define a route to create a new tournament
app.post("/tournaments", async (req: Request, res: Response) => {
  try {
    const requestBody = req.body;

    // If the request body is an array, it represents multiple tournaments
    if (Array.isArray(requestBody)) {
      const added = 0;
      const updated = 0;
      // Loop through each tournament and update or insert it
      for (const tournament of requestBody) {
        const existingTournament = await TournamentModel.exists({ eventName: tournament.eventName });

        if (existingTournament) {
          // Tournament with the same eventName already exists, update it
          await TournamentModel.findByIdAndUpdate(existingTournament._id, tournament);
        } else {
          // Tournament doesn't exist, create a new one
          await TournamentModel.create(tournament);
        }
      }

      res.status(200).json({ message: `Tournaments uploaded successfully, ${added} added, ${updated} updated` });
    } else {
      // If the request body is a single object, it represents a single tournament
      const tournamentData: Tournament = requestBody;
      const tournament = new TournamentModel(tournamentData);
      await tournament.save();
      res.status(201).json(tournament);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to save tournament(s)" });
  }
});

app.get("/tournaments", async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      minLength,
      maxLength,
      maxDistance,
      coordinates,
    } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (startDate) {
      query.startDate = { $gte: new Date(startDate as string) };
    }

    if (endDate) {
      query.endDate = { $lte: new Date(endDate as string) };
    }

    if (minLength) {
      query.length = { $gte: parseInt(minLength as string, 10) };
    }

    if (maxLength) {
      query.length = { ...(query.length || {}), $lte: parseInt(maxLength as string, 10) };
    }

    if (maxDistance && coordinates) {
      const { lat, lng } = JSON.parse(coordinates as string);
      query.lat = {
        $lte: lat + (parseFloat(maxDistance as string) / 111),
        $gte: lat - (parseFloat(maxDistance as string) / 111),
      };
      query.lng = {
        $lte: lng + (parseFloat(maxDistance as string) / (111 * Math.cos(lat))),
        $gte: lng - (parseFloat(maxDistance as string) / (111 * Math.cos(lat))),
      };
    }

    const tournaments = await TournamentModel.find(query);
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

const scrape = async () => {
  getAllTournaments()
    .then(async (tournaments) => {
      const added = 0;
      const updated = 0;
      // Loop through each tournament and update or insert it
      for (const tournament of tournaments) {
        const existingTournament = await TournamentModel.exists({ eventName: tournament.eventName });

        if (existingTournament) {
          // Tournament with the same eventName already exists, update it
          await TournamentModel.findByIdAndUpdate(existingTournament._id, tournament);
        } else {
          // Tournament doesn't exist, create a new one
          await TournamentModel.create(tournament);
        }
      }

      console.log(`Tournaments uploaded successfully, ${added} added, ${updated} updated`);
    })
    .catch((error) => {
      console.error("Failed to fetch tournaments:", error);
    });
};

async function getAllTournaments(): Promise<Tournament[]> {
  const chessCalendarURLs = generateChessCalendarURLs();
  const allTournaments: Tournament[] = [];

  for (const url of chessCalendarURLs) {
    try {
      const html = await fetchHTML(url);
      const tournaments = generateMonth(html);
      allTournaments.push(...tournaments);
    } catch (error) {
      console.error(`Error processing URL: ${url}`);
      console.error(error);
    }
  }

  return allTournaments;
}

function generateMonth(html: string): Tournament[] {
  const events: Tournament[] = [];
  const $ = load(html);
  $(".calItem").each((i, el) => {
    const startDate = parse(
      $(el).find(".startdate").text().trim(),
      "dd.MM.yyyy",
      new Date()
    );
    const endDateString = $(el).find(".endDate").text().trim();
    const endDate = endDateString ?
      parse(endDateString, "dd.MM.yyyy", new Date()) :
      null;
    let eventName = latinize($(el).find(".weblink").text().trim());
    const city = $(el).find(".city").text().trim().substring(2);
    const country = $(el).find(".country").text().trim().substring(2);
    const sourceUrl = $(el).find(".source a").attr("href");
    const locationUrl = $(el).find(".extensions a").attr("href") ?? null;

    let lat = null;
    let lng = null;

    let length = 1;
    if (eventName.endsWith(" - ChessManager")) {
      eventName = eventName.replace(" - ChessManager", "");
    }

    if (endDate) {
      length = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    }

    if (locationUrl) {
      const locationUrlParts = locationUrl.split("?q=")[1].split(",+");
      lat = parseFloat(locationUrlParts[0]);
      lng = parseFloat(locationUrlParts[1]);
    }
    const newEvent = {
      startDate,
      endDate,
      eventName,
      city,
      country,
      sourceUrl: [sourceUrl],
      locationUrl,
      length,
      lat,
      lng,

    };
    if (!events.some((tournament) => tournament.eventName === newEvent.eventName)) {
      events.push(newEvent as Tournament);
    } else {
      const oldEvent = events.find((tournament) => tournament.eventName === newEvent.eventName);
      if (oldEvent && !oldEvent.sourceUrl?.some((url) => url === newEvent.sourceUrl[0])) {
        oldEvent.sourceUrl.push(newEvent.sourceUrl[0] ?? "");
      }

      if (oldEvent && !oldEvent?.locationUrl) {
        oldEvent.locationUrl = newEvent.locationUrl ?? undefined;
        oldEvent.lat = newEvent.lat ?? undefined;
        oldEvent.lng = newEvent.lng ?? undefined;
      }
    }
  });

  return events;
}

function generateChessCalendarURLs(): string[] {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Months are zero-based, so add 1
  const currentYear = currentDate.getFullYear();

  const urls: string[] = [];

  for (let month = currentMonth; month <= 12; month++) {
    const year = month === 12 ? currentYear + 1 : currentYear;
    const url = `https://chess-calendar.eu/?page=${year}-${month}`;
    urls.push(url);
  }

  return urls;
}

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch HTML for URL: ${url}`);
  }
}

exports.scrape = functions.https.onRequest(scrape);


