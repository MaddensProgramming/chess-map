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

  private baseUrl = 'http://localhost:3000/tournaments'

  public $tournaments: BehaviorSubject<Tournament[]>
  =   new BehaviorSubject<Tournament[]>([]);

  public tournaments: Tournament[] = [];

  public filter = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    minLength:new FormControl<number|null>(1),
    maxLength: new FormControl<number|null>(null),
    maxDistance: new FormControl<number|null>(null)
  });
  constructor(private http: HttpClient) {
    this.generateMonths().subscribe(tourn => {this.tournaments = tourn; this.$tournaments.next(tourn)});

  }

  uploadTournaments(tournaments: Tournament[]): Observable<any> {
    return this.http.post<any>(this.baseUrl, tournaments);
  }

  getTournaments(
    startDate?: Date,
    endDate?: Date,
    minLength?: number,
    maxLength?: number,
    maxDistance?: number,
    coordinates?: { lat: number, lng: number }
  ): void{
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
      params = params.set('coordinates', JSON.stringify(coordinates));
    }

   this.http.get<Tournament[]>(this.baseUrl, { params })
   .subscribe(tournaments => {this.tournaments = tournaments; this.$tournaments.next(tournaments);});
  }


  getHtmlFileAsString(month: string): Observable<string> {
    return this.http.get(month, { responseType: 'text' });
  }



  public generateMonths(): Observable<Tournament[]> {
   return this.getHtmlFileAsString('assets/June.html')
      .pipe(
        map((file) => this.generateMonth(file))
      );

  }

  public generateMonth(html: string): Tournament[] {
    var latinize = require('latinize');

    const events: Tournament[] = [];
    const $ = cheerio.load(html);
    $('.calItem').each((i, el) => {
      const startDate = parse(
        $(el).find('.startdate').text().trim(),
        'dd.MM.yyyy',
        new Date()
      );
      const endDateString = $(el).find('.endDate').text().trim();
      const endDate = endDateString
        ? parse(endDateString, 'dd.MM.yyyy', new Date())
        : null;
      let eventName = latinize( $(el).find('.weblink').text().trim());
      const city = $(el).find('.city').text().trim().substring(2);
      const country = $(el).find('.country').text().trim().substring(2);
      const sourceUrl = $(el).find('.source a').attr('href');
      const locationUrl = $(el).find('.extensions a').attr('href')??null;

      let lat=null;
      let lng=null;

      let length = 1;
      if(eventName.endsWith(" - ChessManager")){
       eventName= eventName.replace(" - ChessManager","")
      }

      if(endDate){
        length = (endDate.getTime()-startDate.getTime())/(1000*3600*24);
      }

      if (locationUrl) {
        const locationUrlParts = locationUrl.split('?q=')[1].split(',+');
        lat = parseFloat(locationUrlParts[0]);
        lng = parseFloat(locationUrlParts[1]);
      }
      const newEvent = {
        startDate,
        endDate,
        eventName,
        city,
        country,
        sourceUrl:[sourceUrl],
        locationUrl,
        length,
        lat,
        lng,

      };
      if (!events.some((tournament) => tournament.eventName === newEvent.eventName))
      {
       events.push(newEvent);
      }
      else
      {

        const oldEvent = events.find((tournament) => tournament.eventName ===newEvent.eventName);
        if(!oldEvent.sourceUrl.some(url => url===newEvent.sourceUrl[0])){
          oldEvent.sourceUrl.push(newEvent.sourceUrl[0]);
        }

        if(!oldEvent.locationUrl){
          oldEvent.locationUrl = newEvent.locationUrl;
          oldEvent.lat = newEvent.lat;
          oldEvent.lng = newEvent.lng;
        }

      }
    });

    return events;
  }
}
