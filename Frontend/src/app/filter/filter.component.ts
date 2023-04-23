import { Component, OnInit } from '@angular/core';
import { ServiceService } from '../service.service';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent implements OnInit {
  expanded = true;
  //assigning here just to satisfy the typescript gods
  filter: FormGroup = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    minLength:new FormControl<number|null>(1),
    maxLength: new FormControl<number|null>(null),
    maxDistance: new FormControl<number|null>(null)
  });;
  constructor(private service: ServiceService){}
  ngOnInit(): void {
    this.filter = this.service.filter;
    this.updateTournaments();
  }
  updateTournaments(): void {
    console.log("Loading tournaments");
    this.service.getTournaments(this.filter.value.startDate,this.filter.value.endDate, this.filter.value.minLength, this.filter.value.maxLength,
      this.filter.value.maxDistance, {lat:50.8503, lng: 4.35171});
  }
}
