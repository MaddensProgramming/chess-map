import { LatLngLiteral } from 'leaflet';
import { LatLng } from 'leaflet';

export interface Tournament {
  startDate: Date;
  endDate?: Date;
  eventName: string;
  city: string;
  country: string;
  sourceUrl: string[];
  length: number;
  location?: LatLngLiteral;
  distance?: number;
}

export interface TournamentByLocation {
  location: string;
  tournaments: Tournament[];
}
