import { Injectable, inject } from '@angular/core';
import cheerio from 'cheerio';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
  });

  public currentLocation = [50.8503, 4.35171];
  constructor(private http: HttpClient) {}

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
        console.log(tournaments);
        this.tournaments = tournaments.map((tournament) => ({
          ...tournament,
          startDate: new Date(tournament.startDate),
          endDate: tournament.endDate ? new Date(tournament.endDate) : null,
        }));
        this.$tournaments.next(this.tournaments);
      });
  }
}
