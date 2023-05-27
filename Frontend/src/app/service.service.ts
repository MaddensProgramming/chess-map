import { Injectable, inject } from '@angular/core';
import cheerio from 'cheerio';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';

import { Tournament } from './models/tournament-model';
import { parse } from 'date-fns';
import { BehaviorSubject } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  private baseUrl =
    'https://europe-west1-chess-calendar-map.cloudfunctions.net/rest/tournaments';

  constructor(private http: HttpClient) {}

  public $tournaments: BehaviorSubject<Tournament[]> = new BehaviorSubject<
    Tournament[]
  >([]);

  public tournaments: Tournament[] = [];

  public filter = new FormGroup({
    startDate: new FormControl<Date | null>(new Date(2023, 5, 1)),
    endDate: new FormControl<Date | null>(new Date(2023, 6, 1)),
    minLength: new FormControl<number | null>(1),
    maxLength: new FormControl<number | null>(null),
    maxDistance: new FormControl<number | null>(null),
    location: new FormControl<string | null>(null),
  });

  public $currentLocation = new BehaviorSubject<number[]>([50.8503, 4.35171]);

  getCurrentCityCountry(): Observable<string> {
    const url = 'https://nominatim.openstreetmap.org/reverse';
    return this.$currentLocation.pipe(
      switchMap((coords) => {
        let params = new HttpParams();
        params = params.set('format', 'json');
        params = params.set('lat', this.$currentLocation.getValue()[0]);
        params = params.set('lon', this.$currentLocation.getValue()[1]);
        return this.http.get<any>(url, { params }).pipe(
          tap((result) => console.log(result)),
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
    coordinates?: number[]
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
      params = params.set('coordinates', `${coordinates[1]},${coordinates[0]}`);
    }

    this.http
      .get<Tournament[]>(this.baseUrl, { params })
      .subscribe((tournaments) => {
        this.tournaments = tournaments.map((tournament) => ({
          ...tournament,
          startDate: new Date(tournament.startDate),
          endDate: tournament.endDate ? new Date(tournament.endDate) : null,
        }));
        this.$tournaments.next(this.tournaments);
      });
  }
}
