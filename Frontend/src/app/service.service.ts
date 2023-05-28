import { Injectable, inject } from '@angular/core';
import cheerio from 'cheerio';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';

import { Tournament } from './models/tournament-model';
import { BehaviorSubject } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { LatLngLiteral } from 'leaflet';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  private baseUrl =
    'https://europe-west1-chess-calendar-map.cloudfunctions.net/rest/tournaments';

  constructor(private http: HttpClient) {
    this.oneMonthLater = new Date();
    this.oneMonthLater.setMonth(this.oneMonthLater.getMonth() + 1);
  }

  public $tournaments: BehaviorSubject<Tournament[]> = new BehaviorSubject<
    Tournament[]
  >([]);

  public tournaments: Tournament[] = [];
  public today: Date = new Date();
  public oneMonthLater = new Date(
    this.today.getFullYear(),
    this.today.getMonth() + 1,
    this.today.getDate()
  );

  public filter = new FormGroup({
    startDate: new FormControl<Date | null>(new Date()),
    endDate: new FormControl<Date | null>(this.oneMonthLater),
    minLength: new FormControl<number | null>(null),
    maxLength: new FormControl<number | null>(null),
    maxDistance: new FormControl<number | null>(null),
    location: new FormControl<string | null>(null),
  });

  public $currentLocation = new BehaviorSubject<LatLngLiteral>({
    lat: 50.8503,
    lng: 4.35171,
  });

  getCurrentCityCountry(): Observable<string> {
    const url = 'https://nominatim.openstreetmap.org/reverse';
    return this.$currentLocation.pipe(
      switchMap((coords) => {
        let params = new HttpParams();
        params = params.set('format', 'json');
        params = params.set('lat', coords.lat);
        params = params.set('lon', coords.lng);
        return this.http.get<any>(url, { params }).pipe(
          map((result) => {
            if (result.address) {
              const town =
                result.address.city ??
                result.address.town ??
                result.address.village ??
                '';
              return `${town}${town ? ', ' : ''}${result.address.country}`;
            } else return 'unknown';
          })
        );
      })
    );
  }

  getTournaments(
    startDate?: Date,
    endDate?: Date,
    minLength?: number,
    maxLength?: number,
    maxDistance?: number,
    coordinates?: LatLngLiteral
  ): void {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    if (minLength) {
      params = params.set('minLength', minLength.toString());
    }
    if (maxLength) {
      params = params.set('maxLength', maxLength.toString());
    }
    if (maxDistance && coordinates) {
      params = params.set('maxDistance', maxDistance.toString());
      params = params.set(
        'coordinates',
        `${coordinates.lng},${coordinates.lat}`
      );
    }

    this.http.get<any[]>(this.baseUrl, { params }).subscribe((tournaments) => {
      this.tournaments = tournaments.map((tournament) => ({
        ...tournament,
        startDate: new Date(tournament.startDate),
        endDate: tournament.endDate ? new Date(tournament.endDate) : null,
        location: tournament.location
          ? {
              lat: tournament.location.coordinates[1],
              lng: tournament.location.coordinates[0],
            }
          : null,
      }));
      this.$tournaments.next(this.tournaments);
    });
  }

  getLocationBasedOnIp(): Observable<{ lat: number; lon: number }> {
    const url = 'https://ip-api.com/json';
    return this.http.get<{ lat: number; lon: number }>(url);
  }
}
