# OPIA LED Previs

Real-time LED wall + camera previsualization for church production. Built from the technical architecture PRD with UI aligned to the **OPIA Stage Visualization Platform** Stitch design system.

## Stack

- React + TypeScript + Vite
- Three.js (WebGL2) with procedural LED shaders
- Optional **Firebase** (Firestore + Storage) for **shared events and scenes** across browsers
- Deploy the static app to **Netlify** (or any static host)

## Phase 1 (current)

- 3D stage with main + optional side LED walls
- Media upload (image/video → GPU texture)
- LED shader: quantization, circular diodes, bloom, panel gaps, scanline hint
- Exposure / ISO / aperture per camera (basic)
- **Scenes** strip: save / rename / apply looks (media per screen)
- **Events**: multiple shows; each event has its own scene list. With Firebase you land on an **event picker** first; open a show or create one, then enter the stage. Share a direct link with `?event=<eventId>` to skip the picker when the id exists.

## Cloud sync (Firebase + Netlify)

1. Create a Firebase project, enable **Firestore** and **Storage**.
2. Register a **Web app** and copy the config into `.env.local` (see `.env.example`). Vite exposes only variables prefixed with `VITE_`.
3. Deploy Firestore + Storage rules (open by default — **replace with auth-based rules before a public launch**):

   ```bash
   npm install -g firebase-tools   # if needed
   firebase login
   firebase use --add            # select your project
   firebase deploy --only firestore:rules,storage
   ```

4. **Storage CORS** (required for scene media upload from the browser — fixes **Failed to fetch** on Render/Netlify):

   ```bash
   gcloud auth application-default login   # once
   npm run firebase:cors
   ```

   Or paste `firebase/storage-cors.json` in [Google Cloud Console → Storage → your bucket → Configuration → CORS](https://console.cloud.google.com/storage/browser?project=opia-c21b8).

5. **Netlify / Render**: set all `VITE_FIREBASE_*` variables in the host dashboard, then **rebuild** (Vite bakes them in at build time). Publish directory: `dist`. Render can use `render.yaml` in this repo.

Without env vars, the deploy shows “Cloud not configured” on the event hub and scenes stay in the browser only. With vars + CORS, scenes and media sync for everyone on the same event.

## Run

```bash
cd Opia
npm install
npm run dev
```

Open http://localhost:5173

## Stitch design

Project: **OPIA Stage Visualization Platform** (`2681785047498202998`)

Design tokens live in `.stitch/DESIGN.md`. Configure Stitch MCP in Cursor (do not commit API keys):

```json
{
  "mcpServers": {
    "stitch": {
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "${STITCH_API_KEY}"
      }
    }
  }
}
```

## Roadmap

| Phase | Focus |
|-------|--------|
| 2 | LED realism (viewing distance, clipping) |
| 3 | Rolling shutter, moiré, compression post-FX |
| 4 | Stage atmosphere, haze |
| 5 | OBS, NDI, presets |

## Structure

```
src/
├── core/          # renderer, shaders, cameras, stage
├── systems/       # led, media, firebase, scenes
├── hooks/         # event workspace (sync)
└── ui/            # controls, layouts, theme
```
