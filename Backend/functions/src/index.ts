import express, { Request, Response } from "express";
import mongoose, { Document, Schema } from "mongoose";
import { load } from "cheerio";
import { parse } from "date-fns";
import axios from "axios";
import * as functions from "firebase-functions";
import latinize from "latinize";
import cors from "cors";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const getCountryISO2 = require("country-iso-3-to-2");

const uri = process.env["PASSWORD"] ?? "";

// Define the Tournament interface
export interface Tournament extends Document {
	startDate: Date;
	endDate?: Date;
	eventName: string;
	city: string;
	country: string;
	sourceUrl: string[];
	length: number;
	location?: {
		type: string;
		coordinates: number[];
	};
}

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
	city: { type: String },
	country: { type: String },
	sourceUrl: { type: [String], required: true },
	length: { type: Number, required: true },
	location: {
		type: {
			type: String,
			enum: ["Point"], // Specify the type as Point
			required: false,
		},
		coordinates: {
			type: [Number], // Array of numbers [longitude, latitude]
			required: false,
		},
	},
});

// Create indexes
tournamentSchema.index({ eventName: 1 }); // Index on eventName field in ascending order
tournamentSchema.index({ length: 1 }); // Index on length field in ascending order
tournamentSchema.index({ startDate: 1 }); // Index on startDate field in ascending order
tournamentSchema.index({ endDate: 1 }); // Index on endDate field in ascending order
tournamentSchema.index({ location: "2dsphere" }); // Create a 2dsphere index on location field for geospatial queries

// Create the Tournament model
const TournamentModel = mongoose.model<Tournament>("Tournament", tournamentSchema);

// Create the Express app
const app = express();
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
		const { startDate, endDate, minLength, maxLength, maxDistance, coordinates } = req.query;

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

		if (maxDistance && coordinates) {
			// find tournaments with no specified location
			query.location = null;
			tournaments = tournaments.concat(await TournamentModel.find(query));

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

app.get("/newLocations", async (req: Request, res: Response) => {
	try {
		const geocodeapi = "ce6e7e63007c4968a25c23283bd6ffca";

		const query: any = {};
		query.location = null;
		query.city = { $ne: "" };
		query.country = { $ne: "" };
		const tournaments = await TournamentModel.find(query);

		const url = "https://api.geoapify.com/v1/geocode/search";
		const results: { city: string; country: string }[] = [];

		await Promise.all(
			tournaments.map(async (tournament, index) => {
				olympicToIsoCountryCode(tournament);

				const lettercode = getCountryISO2(tournament.country);
				if (!lettercode) {
					console.log(tournament.country);
				} else {
					const params = {
						format: "json",
						city: tournament.city,
						countrycodes: lettercode.toLowerCase(),
						apiKey: geocodeapi,
						limit: 1,
					};
					const delay = index * 200;
					await new Promise((resolve) => setTimeout(resolve, delay));
					const result = await axios.get(url, { params });
					if (result.status === 200) {
						if (result.data?.results?.length > 0) {
							const coordinates = [result.data.results[0].lon, result.data.results[0].lat];
							tournament.location = {
								type: "Point",
								coordinates,
							};
							await tournament.save();
						} else {
							results.push({ city: tournament.city, country: tournament.country });
						}
					}
				}
			}),
		);

		res.status(200).json({ results });
	} catch (error) {
		console.log(error);
		res.status(500).json(error);
	}
});

const scrape = async () => {
	getAllTournaments()
		.then(async (tournaments) => {
			console.log(tournaments.length + " tournaments found");
			let added = 0;
			let updated = 0;

			// Loop through each tournament and update or insert it
			for (const tournament of tournaments) {
				try {
					const existingTournament = await TournamentModel.exists({ eventName: tournament.eventName });

					if (existingTournament) {
						// Tournament with the same eventName already exists, update it
						await TournamentModel.findByIdAndUpdate(existingTournament._id, tournament);
						updated++;
					} else {
						// Tournament doesn't exist, create a new one
						await TournamentModel.create(tournament);
						added++;
					}
				} catch (error) {
					console.log(error);
				}
			}

			console.log(`Tournaments uploaded successfully, ${added} added, ${updated} updated`);
		})
		.catch((error) => {
			console.error("Failed to fetch tournaments:", error);
		});
};

function olympicToIsoCountryCode(tournament: mongoose.Document<unknown, object, Tournament> & Omit<Tournament & { _id: mongoose.Types.ObjectId }, never>) {
	if (tournament.country === "ENG") tournament.country = "GBR";
	if (tournament.country === "GRE") tournament.country = "GRC";
	if (tournament.country === "PHI") tournament.country = "PHL";
	if (tournament.country === "CRO") tournament.country = "HRV";
	if (tournament.country === "GER") tournament.country = "DEU";
	if (tournament.country === "NED") tournament.country = "NLD";
	if (tournament.country === "SLO") tournament.country = "SVN";
	if (tournament.country === "VIE") tournament.country = "VNM";
	if (tournament.country === "SUI") tournament.country = "CHE";
	if (tournament.country === "DEN") tournament.country = "DNK";
	if (tournament.country === "POR") tournament.country = "PRT";
	if (tournament.country === "BUL") tournament.country = "BGR";
	if (tournament.country === "WLS") tournament.country = "GBR";
	if (tournament.country === "SCO") tournament.country = "GBR";
	if (tournament.country === "LAT") tournament.country = "LVA";
	if (tournament.country === "MAS") tournament.country = "MYS";
	if (tournament.country === "NCA") tournament.country = "NIC";
	if (tournament.country === "CHI") tournament.country = "CHL";
	if (tournament.country === "TPE") tournament.country = "TWN";
	if (tournament.country === "RSA") tournament.country = "ZAF";
	if (tournament.country === "GCI") tournament.country = "SVN";
	if (tournament.country === "ISV") tournament.country = "VIR";
	if (tournament.country === "INA") tournament.country = "IDN";
}

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
		const startDate = parse($(el).find(".startdate").text().trim(), "dd.MM.yyyy", new Date());
		const endDateString = $(el).find(".endDate").text().trim();
		const endDate = endDateString ? parse(endDateString, "dd.MM.yyyy", new Date()) : null;
		let eventName = latinize($(el).find(".weblink").text().trim());
		const city = $(el).find(".city").text().trim().substring(2);
		const country = $(el).find(".country").text().trim().substring(2);
		let sourceUrl = $(el).find(".source a").attr("href");
		const locationUrl = $(el).find(".extensions a").attr("href") ?? null;

		// bugifxing urls from the weekinchess
		if (sourceUrl) {
			sourceUrl = sourceUrl.split("<td>")[0];
		}

		let length = 1;
		if (eventName.endsWith(" - ChessManager")) {
			eventName = eventName.replace(" - ChessManager", "");
		}

		if (endDate) {
			length += (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
		}

		let location;

		if (locationUrl) {
			const locationUrlParts = locationUrl.split("?q=")[1].split(",+");
			const coordinates = [parseFloat(locationUrlParts[1]), parseFloat(locationUrlParts[0])];
			location = {
				type: "Point",
				coordinates,
			};
		}

		const newEvent = {
			startDate,
			endDate,
			eventName,
			city,
			country,
			sourceUrl: [sourceUrl],
			length,
			location, // Assign the GeoJSON object to the location property
		};

		if (!events.some((tournament) => tournament.eventName === newEvent.eventName)) {
			events.push(newEvent as Tournament);
		} else {
			const oldEvent = events.find((tournament) => tournament.eventName === newEvent.eventName);
			if (oldEvent && !oldEvent.sourceUrl?.some((url) => url === newEvent.sourceUrl[0])) {
				oldEvent.sourceUrl.push(newEvent.sourceUrl[0] ?? "");
			}

			if (oldEvent && !oldEvent?.location) {
				oldEvent.location = newEvent.location;
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

const runtimeOpts = {
	timeoutSeconds: 540,
	memory: "1GB" as const,
};
exports.scrape = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(scrape);

exports.rest = functions.region("europe-west1").https.onRequest(app);
