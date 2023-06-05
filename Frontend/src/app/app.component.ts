import { Component, Inject, OnInit } from '@angular/core';
import { ServiceService } from './services/service.service';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import {
  Router,
  NavigationEnd,
  RouterState,
  ActivatedRoute,
} from '@angular/router';
import haversine from 'haversine-distance';
import { FeedbackComponent } from './feedback/feedback.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public gotGeoLocation = false;

  constructor(
    private service: ServiceService,
    private router: Router,
    private titleService: Title,
    public dialog: MatDialog,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.handleRouteEvents();
  }
  ngOnInit(): void {
    this.service.getTournamentNoParmaters();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        //if location moved more than 50 km we reload the map
        const updateAfter =
          haversine(this.service.$currentLocation.getValue(), position.coords) >
          50000;

        this.service.$currentLocation.next({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        if (updateAfter) this.service.getTournamentNoParmaters();

        this.gotGeoLocation = true;
      });
    }
    if (!this.gotGeoLocation)
      this.service.getLocationBasedOnIp().subscribe((location) => {
        if (!this.gotGeoLocation) {
          //if location moved more than 50 km we reload the map
          const updateAfter =
            haversine(this.service.$currentLocation.getValue(), location) >
            50000;

          this.service.$currentLocation.next({
            lat: location.latitude,
            lng: location.longitude,
          });

          if (updateAfter) this.service.getTournamentNoParmaters();
        }
      });
  }

  handleRouteEvents() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const title = this.getTitle(
          this.router.routerState,
          this.router.routerState.root
        ).join('-');
        this.titleService.setTitle(title);
        gtag('event', 'page_view', {
          page_title: title,
          page_path: event.urlAfterRedirects,
          page_location: this.document.location.href,
        });
      }
    });
  }

  getTitle(state: RouterState, parent: ActivatedRoute): string[] {
    const data = [];
    if (parent && parent.snapshot.data && parent.snapshot.data['title']) {
      data.push(parent.snapshot.data['title']);
    }
    if (state && parent && parent.firstChild) {
      data.push(...this.getTitle(state, parent.firstChild));
    }
    return data;
  }

  openFeedbackDialog(): void {
    const dialogRef = this.dialog.open(FeedbackComponent, {
      width: '500px',
    });
  }
}
