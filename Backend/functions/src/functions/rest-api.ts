import express, { Request, Response } from "express";
import cors from "cors";
import url from "url";
import { Tournament } from "../models/tournament.model";
import { TournamentModel } from "..";

// Create the Express app
export const app = express();
app.use(cors({ origin: "*" }));
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
    const { startDate, endDate, minLength, maxLength, maxDistance, coordinates, noLocationAllowed } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    let tournaments: Tournament[] = [];

    if (startDate && endDate) {
      query.startDate = query.startDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (startDate && !endDate) {
      query.startDate = query.startDate = { $gte: new Date(startDate as string) };
    }

    if (endDate) {
      query.$or = [{ endDate: null }, { endDate: { $lte: new Date(endDate as string) } }];
    }

    if (minLength) {
      query.length = { $gte: parseInt(minLength as string, 10) };
    }

    if (maxLength) {
      query.length = { ...(query.length || {}), $lte: parseInt(maxLength as string, 10) };
    }

    if (!noLocationAllowed) {
      query.location = { $ne: null };
    }

    if (maxDistance && coordinates) {
      if (noLocationAllowed) {
        // find tournaments with no specified location
        query.location = null;
        tournaments = tournaments.concat(await TournamentModel.find(query));
      }

      const [longitude, latitude] = (coordinates as string).split(",").map(parseFloat);
      query.location = {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: parseInt(maxDistance as string, 10) * 1000,
        },
      };
    }

    tournaments = tournaments.concat(await TournamentModel.find(query));
    res.status(200).json(tournaments);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});
app.get("/usedUrls", async (req: Request, res: Response) => {
  try {
    const tournaments = await TournamentModel.find({});

    const urlCountMap = new Map<string, number>();
    const uniqueUrlCountMap = new Map<string, number>();

    for (const tournament of tournaments) {
      for (const sourceUrl of tournament.sourceUrl) {
        const hostname = url.parse(sourceUrl).hostname || "";

        // Increment the total count for this domain
        urlCountMap.set(hostname, (urlCountMap.get(hostname) || 0) + 1);

        // If this is the only source URL for this tournament, increment the unique count
        if (tournament.sourceUrl.length === 1) {
          uniqueUrlCountMap.set(hostname, (uniqueUrlCountMap.get(hostname) || 0) + 1);
        }
      }
    }

    // Build arrays of results
    const totalCountResults = Array.from(urlCountMap).map(([hostname, count]) => ({ hostname, count }));
    const uniqueCountResults = Array.from(uniqueUrlCountMap).map(([hostname, count]) => ({ hostname, count }));

    // Sort results by count
    totalCountResults.sort((a, b) => b.count - a.count);
    uniqueCountResults.sort((a, b) => b.count - a.count);

    // Return results as JSON
    res.json({
      totalCounts: totalCountResults,
      uniqueCounts: uniqueCountResults,
    });
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});
