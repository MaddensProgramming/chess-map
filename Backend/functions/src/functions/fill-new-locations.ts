import axios from "axios";
import mongoose from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const getCountryISO2 = require("country-iso-3-to-2");
import { TournamentModel } from "..";
import { Tournament } from "../models/tournament.model";

export const newLocations = async () => {
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
      })
    );
  } catch (error) {
    console.log(error);
  }
};

const countryMappings: { [index: string]: string } = {
  ENG: "GBR",
  GRE: "GRC",
  PHI: "PHL",
  CRO: "HRV",
  GER: "DEU",
  NED: "NLD",
  SLO: "SVN",
  VIE: "VNM",
  SUI: "CHE",
  DEN: "DNK",
  POR: "PRT",
  BUL: "BGR",
  WLS: "GBR",
  SCO: "GBR",
  LAT: "LVA",
  MAS: "MYS",
  NCA: "NIC",
  CHI: "CHL",
  TPE: "TWN",
  RSA: "ZAF",
  GCI: "SVN",
  ISV: "VIR",
  INA: "IDN",
};
function olympicToIsoCountryCode(tournament: mongoose.Document<unknown, object, Tournament> & Omit<Tournament & { _id: mongoose.Types.ObjectId }, never>) {
  if (countryMappings[tournament.country]) {
    tournament.country = countryMappings[tournament.country];
  }
}
