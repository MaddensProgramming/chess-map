import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ServiceService } from '../services/service.service';
import { Observable, map, of } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Tournament } from '../models/tournament-model';
import { MatSort, Sort } from '@angular/material/sort';
import haversine from 'haversine-distance';
import { LatLngLiteral } from 'leaflet';

declare const google: any;

@Component({
  selector: 'app-tournamentlist',
  templateUrl: './tournamentlist.component.html',
  styleUrls: ['./tournamentlist.component.scss'],
})
export class TournamentlistComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  public calendar: Observable<MatTableDataSource<Tournament>>;

  displayedColumns: string[] = [
    'eventName',
    'city',
    'startDate',
    'endDate',
    'distance',
  ];

  ngOnInit(): void {}
  ngAfterViewInit(): void {
    this.calendar = this.service.$tournaments.pipe(
      map((tournaments) => {
        const withDistance = tournaments.map((tournament) => {
          if (tournament.location)
            tournament.distance = Math.round(
              haversine(
                tournament.location,
                this.service.$currentLocation.getValue()
              ) / 1000
            );
          return tournament;
        });

        const datasource = new MatTableDataSource<Tournament>(withDistance);
        datasource.paginator = this.paginator;
        datasource.sort = this.sort;

        const sortState: Sort = { active: 'startDate', direction: 'asc' };
        this.sort.active = sortState.active;
        this.sort.direction = sortState.direction;
        this.sort.sortChange.emit(sortState);

        return datasource;
      })
    );
  }

  getGoogleMapsUrl(location: LatLngLiteral): string {
    return `https://www.google.com/maps/place/${location.lat},${location.lng}/@${location.lat},${location.lng},7z`;
  }

  constructor(private service: ServiceService) {}
}
