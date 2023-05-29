import { Component, OnInit } from '@angular/core';
import { ServiceService } from '../service.service';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent implements OnInit {
  expanded = true;
  loading = true;

  filter: FormGroup;
  constructor(private service: ServiceService) {}
  ngOnInit(): void {
    this.filter = this.service.filter;
    this.service
      .getCurrentCityCountry()
      .subscribe((result) => this.filter.get('location').setValue(result));
    this.service.$tournaments.subscribe(() => {
      this.loading = false;
    });
  }
  updateTournaments(): void {
    this.loading = true;
    this.service.getTournamentNoParmaters();
  }

  clearFilter() {
    const locationValue = this.filter.get('location')?.value;
    this.filter.reset({ location: locationValue });
  }
}
