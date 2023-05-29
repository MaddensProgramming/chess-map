import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TournamentlistComponent } from './tournamentlist/tournamentlist.component';
import { MapComponent } from './map/map.component';
import { WelcomeComponent } from './welcome/welcome.component';

const routes: Routes = [
  { path: 'tournamentlist', component: TournamentlistComponent },
  { path: 'map', component: MapComponent },
  { path: '', component: WelcomeComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
