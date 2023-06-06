import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Tournament } from '../models/tournament-model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-edit-tournament',
  templateUrl: './edit-tournament.component.html',
  styleUrls: ['./edit-tournament.component.scss'],
})
export class EditTournamentComponent {
  public tournamentForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EditTournamentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tournament: Tournament },
    private formBuilder: FormBuilder,
    private tournamentService: FirebaseService,
    private snackBar: MatSnackBar
  ) {
    this.tournamentForm = this.formBuilder.group({
      address: ['', Validators.nullValidator],
      startDate: [data.tournament.startDate, Validators.required],
      endDate: [data.tournament.endDate, Validators.nullValidator],
    });
  }

  onSubmit(): void {
    if (this.tournamentForm.valid) {
      this.tournamentService
        .createTournamentCorrection(
          this.data.tournament.eventName,
          this.tournamentForm.value
        )
        .then((docRef) => {
          this.snackBar.open('Update saved successfully', 'Close', {
            duration: 2000,
          });
          this.dialogRef.close();
        })
        .catch((error) => {
          this.snackBar.open(
            'Error while saving update: ' + error.message,
            'Close',
            {
              duration: 3000,
            }
          );
        });
    }
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
