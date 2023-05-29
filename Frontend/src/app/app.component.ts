import { Component, Inject, OnInit } from '@angular/core';
import { ServiceService } from './service.service';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import {
  Router,
  NavigationEnd,
  RouterState,
  ActivatedRoute,
} from '@angular/router';

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
    @Inject(DOCUMENT) private document: Document
  ) {
    this.handleRouteEvents();
  }
  ngOnInit(): void {
    this.service.getTournamentNoParmaters();
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
}
