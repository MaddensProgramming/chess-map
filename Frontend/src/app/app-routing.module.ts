import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TournamentlistComponent } from './tournamentlist/tournamentlist.component';
import { MapComponent } from './map/map.component';
import { WelcomeComponent } from './welcome/welcome.component';

const routes: Routes = [
  {
    path: 'tournamentlist',
    component: TournamentlistComponent,
    data: { title: 'Chess Tournamentlist' },
  },
  { path: 'map', component: MapComponent, data: { title: 'Chess Map' } },
  {
    path: '',
    component: WelcomeComponent,
    data: { title: 'Chess tournament calendar map' },
  },
  { path: '**', redirectTo: '', data: { title: 'Not Found' } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
