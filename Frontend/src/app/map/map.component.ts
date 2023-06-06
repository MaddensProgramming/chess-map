import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
} from '@angular/core';
import * as L from 'leaflet';
import { Tournament } from '../models/tournament-model';
import { ServiceService } from '../services/service.service';
import { LatLngExpression } from 'leaflet';
import { MatDialog } from '@angular/material/dialog';
import { EditTournamentComponent } from '../edit-tournament/edit-tournament.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnInit {
  constructor(
    private service: ServiceService,
    private dialog: MatDialog,
    private renderer: Renderer2,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.service.$currentLocation.subscribe((location) => {
      if (
        this.currentLocationMarker &&
        this.currentLocationMarker.getLatLng() !== location
      ) {
        this.currentLocationMarker.setLatLng(location);
      }
    });
  }

  public markers = [];
  public currentLocationMarker: L.Marker<any>;

  ngAfterViewInit(): void {
    const mapDiv = document.getElementById('map');
    const map = L.map(mapDiv).setView(
      this.service.$currentLocation.getValue() as LatLngExpression,
      7
    );

    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create an info window to share between markers.
    const infoWindow = L.popup({ maxWidth: 5000 });

    this.service.$tournaments.subscribe((tournaments) => {
      this.addMarkers(tournaments, map, infoWindow);
    });
    this.addCurrentLocationIcon(map, infoWindow);
  }

  private addClickToEdit(): void {
    const editIcons = this.el.nativeElement.querySelectorAll('.edit-icon');
    editIcons.forEach((icon) => {
      this.renderer.listen(icon, 'click', () => {
        const tournamentTitle = icon.parentElement.firstChild.innerText;
        this.openTournamentDialog(tournamentTitle);
      });
    });
  }

  private addMarkers(
    tournaments: Tournament[],
    map: L.Map,
    infoWindow: L.Popup
  ) {
    this.markers.forEach((marker) => marker.remove());
    this.markers.length = 0;

    const groupedTournaments = this.groupByLocation(tournaments);

    for (const tournamentsArray of groupedTournaments.values()) {
      let title = this.generatePopup(tournamentsArray);
      const marker = L.marker(
        [tournamentsArray[0].location.lat, tournamentsArray[0].location.lng],
        {
          title: `${tournamentsArray.length} tournament${
            tournamentsArray.length > 1 ? 's' : ''
          }`,
        }
      ).addTo(map);
      this.markers.push(marker);
      marker.on('click', () => {
        infoWindow.setLatLng(marker.getLatLng());
        infoWindow.setContent(title);
        infoWindow.openOn(map);
        this.addClickToEdit();
      });
    }
  }

  private addCurrentLocationIcon(map: L.Map, infoWindow: L.Popup) {
    this.currentLocationMarker = L.marker(
      this.service.$currentLocation.getValue() as LatLngExpression,
      {
        title: 'Your location',
        draggable: true,
        icon: L.icon({
          iconUrl: 'assets/location.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }
    ).addTo(map);
    this.currentLocationMarker.setZIndexOffset(1000);

    this.currentLocationMarker.on('click', () => {
      infoWindow.setLatLng(this.currentLocationMarker.getLatLng());
      infoWindow.setContent(
        '<div>Your location</div><div>Drag me around to change</div>'
      );
      infoWindow.openOn(map);
    });

    this.currentLocationMarker.on('dragend', () => {
      const newLocation = this.currentLocationMarker.getLatLng();
      this.service.$currentLocation.next(newLocation);
    });
  }

  private generatePopup(tournaments: Tournament[]): string {
    let title = '';
    const groupedByDates: Map<string, Tournament[]> =
      this.groupByDates(tournaments);
    for (const dateGroup of groupedByDates.values()) {
      const startDate = dateGroup[0].startDate.toDateString();
      const endDate = dateGroup[0].endDate
        ? '-' + dateGroup[0].endDate.toDateString()
        : '';
      title += `<strong>${startDate}${endDate}</strong>`;
      dateGroup.forEach((tournament) => {
        title += `<div><span>${tournament.eventName}</span><span class="edit-icon">✎</span> `;
        for (let i = 0; i < tournament.sourceUrl.length; i++) {
          title += `<sup><a href="${
            tournament.sourceUrl[i]
          }" target="_blank" rel="noopener noreferrer">[${i + 1}]</a></sup> `;
        }
        title += '</div>';
      });
      title += '<br>';
    }
    return title;
  }

  private groupByLocation(
    tournaments: Tournament[]
  ): Map<string, Tournament[]> {
    const tournamentsWithLocation = tournaments.filter(
      (tournament) => !!tournament.location
    );
    const groupedTournaments = new Map<string, Tournament[]>();

    tournamentsWithLocation.forEach((tournament) => {
      const locationKey =
        tournament.location.lat + ',' + tournament.location.lng;
      if (groupedTournaments.has(locationKey)) {
        groupedTournaments.get(locationKey).push(tournament);
      } else {
        groupedTournaments.set(locationKey, [tournament]);
      }
    });

    return groupedTournaments;
  }

  private groupByDates(tournaments: Tournament[]): Map<string, Tournament[]> {
    const groupedTournaments = new Map<string, Tournament[]>();

    tournaments.forEach((tournament) => {
      const startDate = tournament.startDate?.toDateString() || 'null';
      const endDate = tournament.endDate?.toDateString() || 'null';
      const dateString = `${startDate}-${endDate}`;

      if (groupedTournaments.has(dateString)) {
        groupedTournaments.get(dateString).push(tournament);
      } else {
        groupedTournaments.set(dateString, [tournament]);
      }
    });

    return groupedTournaments;
  }

  private openTournamentDialog(tournamentTitle: string): void {
    console.log(tournamentTitle);
    const tournament = this.service.tournaments.find(
      (t) => t.eventName === tournamentTitle
    );
    const dialogRef = this.dialog.open(EditTournamentComponent, {
      width: '300px',
      data: { tournament },
    });
  }
}
