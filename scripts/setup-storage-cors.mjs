#!/usr/bin/env node
/**
 * Sets CORS on the Firebase Storage bucket (required for browser uploads
 * from Render, Netlify, localhost, etc.).
 *
 * Prereq (once):
 *   gcloud auth application-default login
 *   gcloud config set project opia-c21b8
 *
 * Then: npm run firebase:cors
 */
import { Storage } from '@google-cloud/storage';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectId = process.env.FIREBASE_PROJECT_ID || 'opia-c21b8';
const corsPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../firebase/storage-cors.json',
);
const cors = JSON.parse(readFileSync(corsPath, 'utf8'));

const bucketNames = [
  `${projectId}.appspot.com`,
  `${projectId}.firebasestorage.app`,
];

const storage = new Storage({ projectId });

let ok = false;
for (const name of bucketNames) {
  try {
    await storage.bucket(name).setCorsConfiguration(cors);
    console.log(`✔ CORS applied to gs://${name}`);
    ok = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`✗ gs://${name}: ${msg}`);
  }
}

if (!ok) {
  console.error(`
Could not set CORS automatically. Do it manually:

1. Open https://console.cloud.google.com/storage/browser?project=${projectId}
2. Open bucket "${projectId}.appspot.com" (or your Firebase default bucket)
3. Configuration tab → Edit CORS → paste firebase/storage-cors.json
4. Save

Or install Google Cloud SDK and run:
  gcloud auth application-default login
  npm run firebase:cors
`);
  process.exit(1);
}

console.log('\nDone. Redeploy / refresh your Render site and try Save scene again.');
