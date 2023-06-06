import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { initializeMongoDb } from "./functions/initialize-mongo";
import { newLocations } from "./functions/fill-new-locations";
import { scrape } from "./functions/scrape";
import { app } from "./functions/rest-api";

admin.initializeApp(functions.config().firebase);
export const db = admin.firestore();
export const TournamentModel = initializeMongoDb();

const runtimeOpts = {
  timeoutSeconds: 540,
  memory: "1GB" as const,
};
exports.scrape = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(scrape);
exports.newLocations = functions.region("europe-west1").runWith(runtimeOpts).https.onRequest(newLocations);
exports.rest = functions.region("europe-west1").https.onRequest(app);
