import { AfterViewInit, Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { Tournament } from '../models/tournament-model';
import { ServiceService } from '../service.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnInit {
  constructor(private service: ServiceService) {}
  ngOnInit(): void {}

  public markers = [];

  ngAfterViewInit(): void {
    const mapDiv = document.getElementById('map');
    const map = L.map(mapDiv).setView([50.8503, 4.35171], 7);

    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create an info window to share between markers.
    const infoWindow = L.popup({ maxWidth: 5000 });

    this.service.$tournaments.subscribe((tournaments) => {
      // Remove existing markers
      this.markers.forEach((marker) => marker.remove());
      this.markers.length = 0; // Clear the markers array

      const groupedTournaments = this.groupByLocation(tournaments);
      for (const locationUrl in groupedTournaments) {
        if (
          locationUrl &&
          locationUrl != 'undefined' &&
          locationUrl != 'null'
        ) {
          const tournaments: Tournament[] = groupedTournaments[locationUrl];
          let title = this.generatePopup(tournaments);
          const marker = L.marker(
            [
              tournaments[0].location.coordinates[1],
              tournaments[0].location.coordinates[0],
            ],
            {
              title: title,
            }
          ).addTo(map);
          this.markers.push(marker);
          marker.on('click', () => {
            infoWindow.setLatLng(marker.getLatLng());
            infoWindow.setContent(marker.options.title);
            infoWindow.openOn(map);
          });
        }
      }
    });
  }

  private generatePopup(tournaments: Tournament[]): string {
    let title = '';
    const groupedByDates = this.groupByDates(tournaments);
    for (const date in groupedByDates) {
      const dateGroup = groupedByDates[date];
      title += `<strong>${dateGroup[0].startDate.toDateString()}${
        dateGroup[0].endDate ? '-' + dateGroup[0].endDate.toDateString() : ''
      }</strong>`;
      dateGroup.forEach((tournament) => {
        title += `<div>${tournament.eventName}`;
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

  private groupByLocation(tournaments: Tournament[]): {
    [key: string]: Tournament[];
  } {
    const groupedTournaments: { [key: string]: Tournament[] } =
      tournaments.reduce((acc, tournament) => {
        const { locationUrl } = tournament;
        if (acc[locationUrl]) {
          acc[locationUrl].push(tournament);
        } else {
          acc[locationUrl] = [tournament];
        }
        return acc;
      }, {});

    return groupedTournaments;
  }
  private groupByDates(tournaments: Tournament[]): {
    [key: string]: Tournament[];
  } {
    const groupedTournaments: { [key: string]: Tournament[] } =
      tournaments.reduce((acc, tournament) => {
        const dateString = tournament.startDate
          ? tournament.startDate.toDateString()
          : 'null' + tournament.endDate
          ? tournament.endDate.toDateString()
          : 'null';
        if (acc[dateString]) {
          acc[dateString].push(tournament);
        } else {
          acc[dateString] = [tournament];
        }
        return acc;
      }, {});

    return groupedTournaments;
  }
}
