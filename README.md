# Twilight Portal — Production WebXR Augmented Reality Experience

An atmospheric, production-quality WebXR AR portal experience built with **Vite**, **Three.js (r169)**, **WebXR Device API**, and **Procedural Web Audio API**.

A glowing cosmic threshold opens in the user's real room. Placed on the floor or a wall, users watch a cinematic opening sequence and can physically walk through the portal doorway into a bioluminescent twilight world filled with an aurora sky, glowing mushroom groves, floating jellyfish, reflective ripple water, giant faceted crystals, and ancient orbiting runes.

---

## ✦ 1. Concept & Palette

* **Mood**: Calm, mystical, deep cosmic twilight with soft blooms and drifting bioluminescent spores.
* **Shared Color Palette**:
  - **Indigo**: `#1b1464` (`--c-indigo`)
  - **Violet**: `#6d28d9` (`--c-violet`)
  - **Teal**: `#14f1d9` (`--c-teal`)
  - **Magenta**: `#ff3cac` (`--c-magenta`)
  - **Soft White**: `#e8f7ff` (`--c-white`)
* **Theme Palettes**: Switchable at runtime via the slide-up Effects Drawer:
  - **Twilight**: Deep indigo, violet, electric teal, and neon magenta.
  - **Ember**: Molten crimson, burning orange, flame gold, and hot embers.
  - **Frost**: Arctic navy, glacial cyan, ice shimmer, and aurora lilac.

---

## ✦ 2. Platform Support & Device Modes

The application automatically detects browser capabilities with `navigator.xr.isSessionSupported('immersive-ar')`:

1. **Android Chrome (ARCore)**:
   - Full WebXR `immersive-ar` mode.
   - Features: `hit-test` for real-world floor/wall placement, `dom-overlay` with UI container root, `local-floor` tracking, and optional `light-estimation`.
   - Displays: **"Enter AR Experience"** button.

2. **iOS Safari & Unsupported Mobile Browsers**:
   - Zero blank screens: seamlessly launches **"Camera Mode"**.
   - Rear camera stream via `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })`.
   - Motion tracking via `DeviceOrientationEvent` gyro controls with the iOS 13+ permission request triggered by user tap.
   - Portal positioned in front of the viewer with an interactive **"⚡ Step Through"** traversal button.
   - Displays: **"Open Camera Mode"** button.

3. **Desktop & Testing**:
   - Interactive **3D Desktop Preview Mode** with orbit mouse-drag controls and wheel zoom.
   - Full post-processing (UnrealBloom, chromatic aberration, dynamic film grain).
   - Displays: **"Desktop 3D Preview"** button.

---

## ✦ 3. Experience Flow

1. **Splash Screen**:
   - Animated particle-text title ("TWILIGHT PORTAL") assembling and floating in 2D canvas coordinates.
   - First user tap simultaneously unlocks the procedural Web Audio context and camera/AR hardware.
2. **Surface Scanning**:
   - Animated reticle (rotating ring with 24 ticks and central beacon) follows the hit-test surface.
   - "Move phone slowly across floor" coach hint.
   - Reticle smoothly snaps and pulses magenta when a surface is locked.
3. **Cinematic Opening**:
   - Tap places the portal.
   - Pinpoint singularity core appears, expands into a shockwave ring, screen flash ignites, letterbox cinema bars slide in, and a burst of 350+ velocity-driven sparks erupts with haptic vibration (`navigator.vibrate([30, 80, 140])`).
4. **Idle Portal**:
   - Domain-warped FBM swirl surface breathes and rotates.
   - Stencil buffer aperture acts as a real-time window into the Twilight World.
   - Thick energy ring pulses with electric arcs; ancient runes circle with glow trails.
5. **Physical Walk-Through Traversal**:
   - Doorway plane crossing detection tracks the camera's signed distance and aperture radius.
   - Crossing inward triggers a screen flash, FOV punch (widens camera FOV by 12° then dampens back), haptic buzz, spark burst, and acoustic cross-fade into open 360° virtual realm immersion.
   - Crossing back out seamlessly returns to the real room acoustic mix.
6. **On-Screen HUD & Controls**:
   - Re-place portal, Mute / Volume toggle, Screenshot with watermark and shutter flash, Portal scale slider, and Slide-up VFX Drawer.

---

## ✦ 4. The 43 Visual Effects Architecture

Every effect is an isolated, lifecycle-managed module in `/src/effects/` registered with the central `EffectsManager`:

```
src/effects/
├── core/
│   ├── vortexSurface.js        # Effect 1: Domain-warped FBM swirl & stencil aperture
│   ├── energyRing.js           # Effect 2: Glowing torus with electric arcs
│   ├── orbitingRunes.js        # Effect 3: Glyph sprites with motion trails
│   ├── gravityLens.js          # Effect 4: Spacetime distortion rim ripple
│   ├── lightningTendrils.js    # Effect 5: Branching crawling electric arcs
│   └── portalSequence.js       # Effects 6 & 7: Cinematic opening & implosion closing
├── particles/
│   ├── spiralSparks.js         # Effect 8: Inward curving rim sparks
│   ├── bioluminescentSpores.js # Effect 9: Drifting twinkling ambient dots
│   ├── fireflies.js            # Effect 10: Wandering camera-avoiding point lights
│   ├── risingEmbers.js         # Effect 11: Turbulent rising embers & ash
│   ├── dustMotes.js            # Effect 12: Light beam floating motes
│   ├── petalSwirl.js           # Effect 13: Instanced quad foliage vortex
│   ├── interactiveBurst.js     # Effect 14: Tap-to-spawn spark cluster with chime
│   └── ribbonTrail.js          # Effect 15: Phone 3D trajectory luminous ribbon
├── lighting/
│   ├── godRays.js              # Effect 16: Stacked translucent light shaft cones
│   ├── floorGlow.js            # Effect 17: Ground decal & contact shadow
│   ├── portalPointLight.js     # Effect 18: Audio-breathing dynamic PointLight
│   ├── volumetricFog.js        # Effect 19: Multi-octave scrolling base fog
│   ├── proximityGrading.js     # Effect 20: Approach-based color grading vignette
│   ├── lensFlare.js            # Effect 21: Anamorphic streaks & halo glare
│   ├── fakeCaustics.js         # Effect 22: Radiating water caustics projection
│   └── lightEstimation.js      # Effect 23: Real-world room ambient light tinting
├── postprocessing/
│   └── postManager.js          # Effect 42: Bloom, Chromatic Aberration & Film Grain
```

### The Twilight Realm (`src/world/`):
* **Effect 24 (Aurora Sky)**: Layered scrolling ribbon shaders in teal, violet, and magenta over a star dome with shooting stars.
* **Effect 25 (Glowing Mushrooms)**: `InstancedMesh` mushroom grove pulsing in travelling light waves.
* **Effect 26 (Floating Jellyfish)**: Translucent dome bodies with swaying tentacles contracting to bass pulses.
* **Effect 27 (Reflective Water)**: Shimmering water plane with interactive ripples spawning on user tap.
* **Effect 28 (Giant Crystals)**: Tall faceted crystal spires with edge fresnel and internal audio resonance.
* **Effect 29 (Twilight Mist)**: Multi-depth parallax horizontal fog planes.
* **Effect 30 (Bioluminescent Grass)**: Instanced blades swaying in the breeze that illuminate near the camera.
* **Effect 31 (Twilight Moon)**: Luminous celestial orb with soft atmospheric radiant halo.

---

## ✦ 5. Spatial Audio Architecture (`src/audio/engine.js`)

Synthesized entirely via the procedural Web Audio API with **zero external sound files**:
1. **Algorithmic Reverb**: Synthetic impulse-response convolver providing realistic room acoustic reflections.
2. **Layer 1 (Ambient Synth Drone)**: Detuned multi-oscillator pads with slow resonant LFO filter sweeps.
3. **Layer 2 (Spatial Portal Hum)**: `PannerNode` with HRTF panning attached to the portal's 3D position; volume and modulation frequency rise as the user approaches.
4. **Layer 3 (Procedural One-Shots)**: Placement whoosh, opening swell, crossing whoomp, and UI chimes.
5. **Layer 4 (Twilight Realm Ambience)**: Filtered wind, nocturnal crickets, and procedural pentatonic glass chimes.
6. **Audio Reactivity**: `AnalyserNode` extracting live frequency energy:
   - **Bass (20–150 Hz)**: Drives portal breathing, crystal glow, and water wave amplitude.
   - **Mid (200–2000 Hz)**: Modulates energy ring light pulses.
   - **Treble (2000–12000 Hz)**: Controls spore twinkle and electric arc jitter.
7. **Cross-Fading**: Traversal cross-fades the acoustic mix between the low-passed real-world exterior and the expansive virtual realm.
8. **Lifecycle**: Automatically pauses audio on tab background (`visibilitychange`) and resumes on focus.

---

## ✦ 6. Running Locally & Development

### Prerequisites
* Node.js (v18+)
* npm

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000/`.

### Build for Production
```bash
npm run build
```
Generates the minified, production-ready bundle in the `dist/` directory.

---

## ✦ 7. Testing on Physical Mobile Devices over HTTPS

WebXR `immersive-ar` requires a **secure HTTPS context** (or `localhost`).

### Option A: Local HTTPS with Vite
To serve over HTTPS on your local Wi-Fi network:
```bash
npx vite --host --https
```
Or use the `vite-plugin-mkcert` plugin for auto-generated local certificates.

### Option B: Cloudflare Tunnel / ngrok (Recommended)
1. Run Vite locally:
   ```bash
   npm run dev
   ```
2. In a second terminal, open a secure tunnel:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   # or
   npx ngrok http 3000
   ```
3. Open the generated HTTPS URL on your Android or iOS phone.

### Option C: Chrome Remote Debugging (Android via USB)
1. Connect your Android phone to your computer via USB with **USB Debugging** enabled.
2. Open Chrome on your desktop and navigate to `chrome://inspect`.
3. In **Port Forwarding**, forward port `3000` to `localhost:3000`.
4. On your Android Chrome, browse directly to `http://localhost:3000` — Chrome treats `localhost` as a secure context!

---

## ✦ 8. Deploying to Cloud Hosts

### Deploying to Vercel
```bash
npx vercel
```
Or link your repository on [vercel.com](https://vercel.com). Build command: `npm run build`, output directory: `dist`.

### Deploying to Netlify
```bash
npx netlify deploy --prod --dir=dist
```
Or drag-and-drop the `dist` directory into Netlify.

### Deploying to GitHub Pages
Add a base path in `vite.config.js`:
```javascript
export default defineConfig({
  base: '/AR-PORTAL-EXPERIENCE/',
  // ...
});
```
Then build and push the `dist/` folder to the `gh-pages` branch.

---

## ✦ 9. Engineering Notes & Fallback Simplifications

### WebXR Immersive-AR Rendering Considerations
* **Standard EffectComposer Post-Processing in AR**:
  Standard post-processing passes (such as `UnrealBloomPass`) require rendering to offscreen WebGL framebuffers and copying the result back to the canvas. In WebXR `immersive-ar` on Android Chrome, the XR session directly manages the underlying hardware framebuffer binding (`renderer.xr`). Intercepting this pipeline with standard `EffectComposer` frequently causes black screens, depth buffer clipping, or camera feed corruption on mobile GPUs.
* **Solution Used in Twilight Portal**:
  In `immersive-ar`, full post-processing is intentionally bypassed. Vibrant glows are achieved directly inside the forward WebGL pipeline using **emissive materials**, **additive blending sprites**, and **custom GLSL fresnel rim shaders**. Real `EffectComposer` post-processing (bloom, chromatic aberration, film grain) is enabled specifically in **Desktop 3D Preview** and **Camera Mode**.

### Hardware-Dependent Features Requiring Physical Device Verification
* **Real-World Surface Plane Hit-Testing**: While math and reticle snapping are fully verified, physical floor/wall plane anchor stability depends on the device's ARCore visual-inertial odometry.
* **Physical Haptic Feedback**: `navigator.vibrate` is functional on Android devices; iOS Safari restricts vibration via Web APIs.
* **WebXR Light Estimation**: Physical room spherical harmonics tinting activates on devices with ARCore light probe support. Fallback ambient lighting is provided for unsupported hardware.

---

## ✦ 10. Automated Verification Suite

Run the automated engine test suite:
```bash
node scripts/verify-full-app.mjs
```
Verifies:
- All 43 visual effect subsystems across Groups A, B, C, D, E, F.
- Quality profiles (`low`, `medium`, `high`) and dynamic LOD adjustments.
- Color palette switching (`twilight`, `ember`, `frost`).
- 10 consecutive portal placement, opening sequence, crossing detection, and removal stress cycles with zero memory leaks.
- Real-time procedural audio synthesis, HRTF panner nodes, and frequency analyzer updates.
