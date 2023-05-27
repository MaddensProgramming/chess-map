export interface Tournament {
  startDate: Date;
  endDate?: Date;
  eventName: string;
  city: string;
  country: string;
  locationUrl?: string;
  sourceUrl: string[];
  length: number;
  location?: {
    type: string;
    coordinates: number[];
  };
}

export interface TournamentByLocation {
  locationUrl: string;
  tournaments: Tournament[];
}
