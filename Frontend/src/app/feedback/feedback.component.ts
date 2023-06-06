import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
})
export class FeedbackComponent implements OnInit {
  feedbackForm: FormGroup;
  selectedFile: File = null;

  constructor(
    private feedbackService: FirebaseService,
    public dialogRef: MatDialogRef<FeedbackComponent>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.feedbackForm = new FormGroup({
      title: new FormControl(null, Validators.required),
      type: new FormControl(null, Validators.required),
      description: new FormControl(null, Validators.required),
      contactInfo: new FormControl(null, Validators.nullValidator),
    });
  }

  onFileSelected(event) {
    this.selectedFile = <File>event.target.files[0];
  }

  onSubmit() {
    if (this.feedbackForm.valid) {
      this.feedbackService.sendFeedback(
        this.feedbackForm.value,
        this.selectedFile
      );

      this.dialogRef.close();
      this.snackBar.open('Feedback Submitted Successfully!', 'Close', {
        duration: 5000,
      });
    }
  }

  onCloseClick(): void {
    this.dialogRef.close();
  }
}
