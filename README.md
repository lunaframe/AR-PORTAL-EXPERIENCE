# Dream Gate — WebXR AR Experience (Shadow Slave)

An atmospheric WebXR Augmented Reality portal experience based on the **Dream Gates** (waking world -> Dream Realm) from the web novel *Shadow Slave*. A razor-clean vertical slash opens through the user's physical room, revealing the cold, desolate expanse of the Dream Realm.

- **Theme**: Dream Gate (*Shadow Slave*).
- **Style**: Dark, cold, restrained, physical. No neon, no cyan/purple glow, no glass pills, no sci-fi HUD clichés.
- **Palette**: Near-black (`#08080a`), ash grey (`#6a6b70`), bone white (`#dcd8cf`), one dull brass accent (`#967d4e`), and dried-blood red (`#6b1c1c`) used only in the Forgotten Shore world.

---

## ✦ Phase 2: The Dream Gate

1. **Shape & Edge**:
   - **1:4 Razor-Clean Slash**: A tall, narrow vertical slash through the air (width `0.70m`, height `2.80m`), pointed at both ends, slanted with a subtle `2.8°` tilt.
   - **Edge Sharpness**: Seeded noise on the outline at very low amplitude (`0.012`) so each placement varies slightly while maintaining a razor-clean blade cut rather than a jagged rip.
   - **Hovering Base**: The bottom hovers `15cm` (`0.15m`) above the floor so light pours underneath onto the floor plane.
   - **Edge Treatment**: A hairline bright line along the cut with a slow traveling highlight, plus a narrow screen-space lens warp bending the real room toward the cut (within ~10% of the gate width). No glow rings or thick outlines.
   - **Recessed Parallax**: Inside the stencil-buffer window, 3 recessed depth layers create real motion parallax when the user moves around the phone.

2. **Two Variants (Radiant vs Shadow)**:
   - Toggleable via runtime config (`gateVariant`) or top-right HUD button (`RADIANT` / `SHADOW`).
   - **A) Radiant (Changing Star)**:
     - Interior depths feature a warm white to pale gold core (`#fdfbf7` to `#e8dfc8`), layered volumetric light fog, slow rays radiating from a vanishing point deep inside, and drifting motes. Desaturated gold with no cyan or purple.
     - Light spill: A soft warm floor light pool, a thin bright light streak pouring under the hovering base, and a subtle vertical anamorphic streak.
     - Real-camera exposure adaptation: Approaching the bright slit darkens the surrounding room feed and clips highlights.
   - **B) Shadow (Dark type)**:
     - Impenetrable black core (`#020203`) with faint depth.
     - Inner layers counter-shift toward the viewer's position so the darkness follows the user's movement.
     - The gate drinks in nearby light: the real room dims within `1.5m`, and dust motes drift toward the edge and vanish.
     - Thin cold pale edge line and 3-5% slow breathing movement of the slit width.

---

## ✦ Phase 3: Opening & Re-placement Sequence

1. **Gate Manifestation**:
   - **Step 1 (0.0s - 0.2s)**: A single pinprick appears at gate height (`1.55m`) with a faint rising audio tone (`triggerRisingTone`).
   - **Step 2 (0.2s - 0.8s)**: A hairline vertical line draws outward from the center point, up and down, over ~0.6s while the room warps slightly around it.
   - **Step 3 (0.8s - 2.0s)**: The slit parts sideways like a blade cut opening over ~1.2s. Light floods out (radiant) or darkness settles in (shadow), accompanied by a soft pressure ripple on the camera feed and a tonal swell (`triggerOpeningSwell`).
   - **Step 4**: A bracketed editorial notification fades in: `[A Dream Gate has opened.]`.
2. **Re-place Portal**:
   - Tapping "Re-place Portal" closes the slit in reverse over ~0.8s (`openingProgress` 1 -> 0, then `lineProgress` 1 -> 0), repositions the gate in front of the user's current gaze, and reopens it.

---

## ✦ Phase 5: Threshold Traversal & Room Integration

1. **Boundary Behavior**:
   - **Radiant**: Slow light motes stream forward out of the slit and drift upward into the room; nearby surfaces flicker faintly warm.
   - **Shadow**: Dust motes drift inward toward the cut and vanish at the edge (light-drinking effect).
2. **Two-Way Crossing**:
   - **Step Through & Step Out**: Both directions supported with matching reverse trajectory and FOV punch.
   - **Shadow-Step Dissolve**: Black tendrils pulling to the center during threshold traversal (`#shadow-step-overlay`).
   - **Gradual Return**: Room exposure and colors ease back to normal upon exiting the Dream Realm.

---

## ✦ Master Tuning Parameters (`src/config.ts`)

| Parameter | Default | Range | Description |
| :--- | :--- | :--- | :--- |
| `slashHalfWidth` | `0.35` | `0.20 - 0.50` | Center half-width (1:4 ratio with height) |
| `slashHalfHeight` | `1.40` | `1.00 - 1.80` | Half-height (2.8m total height) |
| `gateTilt` | `2.8` | `2.0 - 4.0` | Slanted tilt angle in degrees |
| `hoverElevation` | `0.15` | `0.05 - 0.30` | Hover elevation above floor in meters |
| `edgeSharpnessNoise`| `0.012` | `0.005 - 0.030`| Low-amplitude seeded edge variation |
| `edgeTravelingSpeed`| `1.6` | `0.5 - 3.5` | Traveling highlight speed along hairline cut |
| `recedingLayers` | `3` | `2 - 4` | Number of recessed depth parallax layers |
| `lensWarpStrength` | `0.012` | `0.004 - 0.030`| Screen-space lens warp bending room toward cut |
| `lightPoolIntensity`| `0.35` | `0.10 - 0.60` | Floor light pool intensity |
| `lightStreakIntensity`| `0.85` | `0.40 - 1.00` | Light streak intensity under hovering base |
| `cameraExposureShift`| `0.35` | `0.10 - 0.60` | Camera feed darkening amount when approaching gate |

---

## ✦ Running & Testing Locally

```bash
# Install dependencies
npm install

# Start local dev server (default port 3000)
npm run dev

# Build production bundle
npm run build
```
