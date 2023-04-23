import { Component } from '@angular/core';
import { ServiceService } from '../service.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
})
export class DataComponent {
  logs: string = '';

  constructor(public service: ServiceService) {}

  upload(): void {
    console.log("Uploading");
    this.service.generateMonths()
    .pipe(switchMap(tournaments => this.service.uploadTournaments(tournaments)))
    .subscribe(logs => console.log(logs));
  }
}
