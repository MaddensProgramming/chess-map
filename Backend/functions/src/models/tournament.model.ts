import { Document } from "mongoose";

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
