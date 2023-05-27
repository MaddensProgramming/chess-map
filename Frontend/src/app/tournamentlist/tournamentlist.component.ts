import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ServiceService } from '../service.service';
import { Observable, map, of } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Tournament } from '../models/tournament-model';
import { MatSort, Sort } from '@angular/material/sort';
import haversine from 'haversine-distance';

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
                {
                  lat: tournament.location.coordinates[1],
                  lng: tournament.location.coordinates[0],
                },
                {
                  lat: this.service.$currentLocation.getValue()[0],
                  lng: this.service.$currentLocation.getValue()[1],
                }
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

  constructor(private service: ServiceService) {}
}
