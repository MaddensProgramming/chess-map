import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) {}

  sendFeedback(feedback, file: File) {
    if (file) {
      const filePath = `feedbacks/${new Date().getTime()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      // get notified when the download URL is available
      task
        .snapshotChanges()
        .pipe(
          finalize(() =>
            fileRef.getDownloadURL().subscribe((downloadURL) => {
              feedback.fileURL = downloadURL;
              this.firestore.collection('reviews').add(feedback);
            })
          )
        )
        .subscribe();
    } else {
      // Just add the feedback without fileURL if no file is selected
      this.firestore.collection('reviews').add(feedback);
    }
  }
}
