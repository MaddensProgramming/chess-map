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

  filter: FormGroup;
  constructor(private service: ServiceService) {}
  ngOnInit(): void {
    this.filter = this.service.filter;
    this.service
      .getCurrentCityCountry()
      .subscribe((result) => this.filter.get('location').setValue(result));
    this.updateTournaments();
  }
  updateTournaments(): void {
    this.service.getTournaments(
      this.filter.value.startDate,
      this.filter.value.endDate,
      this.filter.value.minLength,
      this.filter.value.maxLength,
      this.filter.value.maxDistance,
      this.service.$currentLocation.getValue()
    );
  }

  clearFilter() {
    const locationValue = this.filter.get('location')?.value;
    this.filter.reset({ location: locationValue });
  }
}
