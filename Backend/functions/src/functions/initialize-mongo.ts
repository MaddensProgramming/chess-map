import mongoose, { Schema } from "mongoose";
import { Tournament } from "../models/tournament.model";

export function initializeMongoDb() {
  const uri = "mongodb+srv://matte0007:NULyjaEVdsEvgd5K@chesstournaments.ntk7st6.mongodb.net/?retryWrites=true&w=majority";
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
        enum: ["Point"],
        required: false,
      },
      coordinates: {
        type: [Number],
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
  return TournamentModel;
}
