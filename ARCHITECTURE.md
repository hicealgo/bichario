# Bichario — Architecture & Design Rationale

**Bichario** is a cozy, living hand-drawn terrarium app designed for playing with family & kids (starting as a closed family beta, architected to scale cleanly to Web, Android, and iOS).

Draw a *bicho* (bug/critter), give it a name, drop it into a glass terrarium filled with living hand-drawn plants and paintable moss, keep a permanent Field Guide (*Bichodex*), and send your bichos to visit shared family/friends jars with visiting passports.

---

## 1. Core Design Pillars

1. **Simple on the surface, lovingly deep underneath**: Default UI is clean, roundish, tactile, and joyful for fingers on any Android phone/tablet. Stylus/S-Pen pressure, tilt, and palm rejection work silently and naturally without cluttering the interface.
2. **Cozy indie warmth (not infantile, not corporate)**: Curated cozy color palettes by default, warm organic ink tones, tactile feedback, subtle handcrafted textures.
3. **Cozy-light physics**: Bichos walk across moss, twigs, and glass curves, hop with soft gravity, gently bump and react to each other with tiny emotes, and interact with swaying hand-drawn plants (napping under leaves, climbing stems, nibbling, hiding in moss).
4. **Iterative Lab-Driven Development**: Instead of guessing look/feel/physics upfront, we build modular interactive Labs packaged into real installable Android APKs (`v0.x.x` GitHub Releases) that export `.zip` bundles containing tuned parameters, ratings, notes, and hand-scribbled UI layouts.

---

## 2. Tech Stack

| Layer | Technology | Why |
| :--- | :--- | :--- |
| **App Shell & UI** | TypeScript + React + Vite | Rapid UI iteration, crisp responsive layouts for phones & tablets, offline bundled cozy fonts (`@fontsource/*`). |
| **2D Engine & Drawing** | High-DPI HTML5 Canvas2D -> PixiJS (WebGL) for full terrarium | 60-120fps 2D rendering, full W3C Pointer Events (`pressure`, `tiltX`, `tiltY`, `pointerType`), zero friction between Web & Android. |
| **Optional Native Speedup** | C++ -> WebAssembly (Emscripten) | Clean escape hatch if procedural mesh deformation or dense physics simulation ever demands native C++ throughput. |
| **Mobile Packaging** | Capacitor 7 (Android / iOS) | Single codebase -> native Android APK, iOS app, and Web app. Native Filesystem, Share Sheet (for `.zip` exports), and Haptics. |
| **Cloud & Multi-User (Phase 2)** | Firebase (Auth + Firestore + Cloud Storage) | Realtime shared terrariums, easy family invite codes, and a dedicated Admin/Parent Oversight web console. |

---

## 3. Firebase Data Model & Oversight Plan (Phase 2)

Designed from day one to support **Bichodex**, **Shared Jars**, **Visiting Passports**, and **Full Parent/Admin Oversight**:

```text
users/{uid}
  - displayName, avatarColor, role ("member" | "admin")
  - createdAt, status ("active" | "muted" | "suspended")
  - familyCodes: string[]

bichos/{bichoId}
  - ownerUid, creatorName
  - name, birthday, speciesTag, movementStyle ("crawler" | "hopper" | "flyer" | "inchworm")
  - spritePath (Cloud Storage PNG/WebP + vector strokes JSON)
  - outlineColor, scale, personalityTraits[]
  - status: "in_jar" | "resting" | "visiting"
  - activeTerrariumId: string | null
  - passport: {
      stamps: [{ terrariumId, terrariumName, visitedAt, note, stickerId }]
    }
  - moderation: { state: "approved" | "pending" | "hidden", reviewedBy, reviewedAt }

terrariums/{terrariumId}
  - name, ownerUid, jarShape, themeId
  - visibility: "private" | "invite_only"
  - inviteCode (hashed/short human code for family & friends)
  - memberUids: string[]
  - requireApprovalForGuests: boolean
  - mossLayerPath, plants: [{ id, name, spritePath, x, y, growthStage, ownerUid }]

moderation_log/{eventId}
  - targetType ("bicho" | "plant" | "user"), targetId, action, adminUid, timestamp, reason
```

### Oversight & Family Safety
- **Closed Family Beta**: New shared terrariums require an invite code.
- **Admin Oversight Console**: Separate lightweight web view gated by Firebase Custom Claim `admin: true` (your account only). Lists every user, every uploaded bicho/plant thumbnail, active visits, and one-tap hide/delete/suspend controls.

---

## 4. Iterative Lab Roadmap

- **v0.1.0 — Lab 1: UI Aesthetic Arena & Menu Scribbler** *(Current)*
  - 8 radically distinct cozy indie visual themes
  - 5 menu layout archetypes (Dock, Corners, Pull-up Drawer, Side Rail, Radial Satchel)
  - Live interactive mini Bichario preview (Terrarium, Draw Studio, Bichodex)
  - Real-time feel sliders + palette tinkerer + curated drawing palette sampler
  - Built-in Menu Scribbler (multi-page finger & stylus sketchpad with faint screen ghosts)
  - Native Android & Web `.zip` exporter (`manifest.json`, `feedback.md`, `sketches/*.png`)
- **v0.2.0 — Lab 2: Bicho Drawing & Brush Lab**
  - Tactile brushes (crayon, soft ink, marker, firefly glow), stabilizer, pressure/velocity curves, mirror mode, auto sticker-outline, curated cozy palettes.
- **v0.3.0 — Lab 3: "Bring It To Life" Animation & Cozy-Light Physics Lab**
  - Compare 1-piece procedural animation vs multi-part vs auto-rig; test moss/twig climbing, soft hops, gentle bumps, emote bubbles.
- **v0.4.0 — Lab 4: Terrarium, Living Moss & Plants Lab**
  - Paintable living moss brush, swaying & growing hand-drawn plants, bicho-plant interactions, jar glass & lighting ambiance.
- **v0.5.0 — Lab 5: Bichodex, Visiting Passports & Firebase Family Sync + Admin Panel**
