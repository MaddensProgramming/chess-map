import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { initializeMongoDb } from "./functions/initialize-mongo";
import { newLocations } from "./functions/fill-new-locations";
import { scrape } from "./functions/scrape";
import { app } from "./functions/rest-api";
import { removePastTournaments } from "./functions/remove-past-tournaments";

admin.initializeApp(functions.config().firebase);
export const db = admin.firestore();
export const TournamentModel = initializeMongoDb();

const runtimeOpts = {
  timeoutSeconds: 540,
  memory: "1GB" as const,
};

exports.newLocations = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(newLocations);

exports.removePastTournamentsOnShedule = functions
  .region("europe-west1")
  .runWith(runtimeOpts)
  .pubsub.schedule("0 0 * * *") // Schedule at 0:00
  .timeZone("Europe/Paris")
  .onRun(removePastTournaments);

exports.scrapeOnSchedule = functions
  .region("europe-west1")
  .runWith(runtimeOpts)
  .pubsub.schedule("0 1 * * *") // Schedule at 1:00
  .timeZone("Europe/Paris")
  .onRun(scrape);

exports.scrape = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(scrape);
exports.removePastTournaments = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(removePastTournaments);

exports.rest = functions.region("europe-west1").https.onRequest(app);
