import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TournamentlistComponent } from './tournamentlist/tournamentlist.component';
import { MapComponent } from './map/map.component';
import { DataComponent } from './data/data.component';

const routes: Routes = [
  { path: 'tournamentlist', component: TournamentlistComponent },
  { path: 'map', component: MapComponent },
  { path: 'data', component: DataComponent },
  { path: '**', redirectTo:'map' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
