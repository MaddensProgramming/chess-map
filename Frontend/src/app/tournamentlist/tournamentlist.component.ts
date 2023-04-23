import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ServiceService } from '../service.service';
import { Observable, of } from 'rxjs';

declare const google: any;

@Component({
  selector: 'app-tournamentlist',
  templateUrl: './tournamentlist.component.html',
  styleUrls: ['./tournamentlist.component.scss'],
})
export class TournamentlistComponent implements OnInit {
  displayedColumns: string[] = [
    'eventName',
    'city',
    'country',
    'startDate',
    'endDate',
    'locationUrl',
    'sourceUrl',
  ];

  ngOnInit(): void {
    this.calendar = this.service.$tournaments;
  }
  public calendar: Observable<any[]> = of([]);

  constructor(private service: ServiceService) {}
}
