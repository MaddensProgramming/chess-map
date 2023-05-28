import { Component, OnInit } from '@angular/core';
import { ServiceService } from './service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public gotGeoLocation = false;

  constructor(private service: ServiceService) {}
  ngOnInit(): void {
    this.service.getLocationBasedOnIp().subscribe((location) => {
      if (!this.gotGeoLocation) {
        this.service.$currentLocation.next({
          lat: location.lat,
          lng: location.lon,
        });
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.service.$currentLocation.next({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        this.gotGeoLocation = true;
      });
    }
  }
  title = 'chess-map';
}
