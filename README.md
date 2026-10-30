# Dream Gate — Production WebXR Augmented Reality Experience

An atmospheric, production-quality WebXR Augmented Reality dream portal experience built with **Vite**, **Three.js (r169)**, **WebXR Device API**, and **Procedural Web Audio API**.

A surreal, carved door-like archway summons into the user's real room. Placed on the floor or wall, users step through the threshold into 360° immersive dreamscapes, explore floating celestial islands with gliding sky-whales, calm bioluminescent midnight oceans with glowing jellyfish, and quiet cosmic star libraries with floating flutter-page books. Users collect **7 hidden Dream Fragments** with ascending musical chimes and "wake up" with a golden pulse back into their room, preserving their journey in a persistent **Dream Journal**.

---

## ✦ 1. Concept & Palette

* **Mood**: Soft, strange, beautiful, calm — like a lucid dream.
* **Palette**:
  - **Midnight**: `#0b0a2a` (`--c-midnight`)
  - **Dream violet**: `#7c4dff` (`--c-violet`)
  - **Moon silver**: `#dfe9ff` (`--c-silver`)
  - **Aurora teal**: `#3df2d0` (`--c-teal`)
  - **Rose gold**: `#ff9ecb` (`--c-rose`)
  - **Warm lantern**: `#ffd27a` (`--c-lantern`)

---

## ✦ 2. Three Dream Realms

Switchable directly on the gate via 3 floating glowing sigils or through the HUD:

1. **Realm 1: Sky Garden (`src/realms/skyGarden.js`)**
   - Floating celestial islands that drift gently in the breeze.
   - Proximity-reactive glowing flowers that open their petals as the camera approaches.
   - Soft, instanced **Sky-Whales** gliding overhead with gentle low resonant calls.
   - Multi-depth parallax cloud layers and a gigantic glowing moon with radiant halo and shooting stars.
2. **Realm 2: Midnight Ocean (`src/realms/midnightOcean.js`)**
   - Endless calm sea at night with bioluminescent wave crests.
   - Interactive water plane with ripples spawning on user tap.
   - Translucent **Jellyfish Orbs** rising slowly with swaying tentacles that contract to bass pulses.
   - Upward underwater light beams and buoyant rising air bubbles.
3. **Realm 3: Star Library (`src/realms/starLibrary.js`)**
   - Floating hardcover tomes with fluttering parchment pages.
   - Constellations drawn as glowing lines across the cosmic backdrop.
   - Orbiting celestial planets with ring shaders.
   - Warm paper lanterns floating slowly toward the stars.

---

## ✦ 3. Platform Support & Device Modes

Automatic detection with `navigator.xr.isSessionSupported('immersive-ar')`:

1. **Android Chrome (ARCore)**:
   - Full WebXR `immersive-ar` session.
   - Features: `hit-test` surface detection, `dom-overlay` with UI container root, `local-floor` space, optional `light-estimation`.
   - Displays: **"Enter AR Dream"** button.
2. **iPhone Safari & Unsupported Mobile Browsers**:
   - Zero blank screens: launches **"Camera Mode"**.
   - Rear camera stream via `getUserMedia` (`facingMode: { ideal: 'environment' }`).
   - Motion look-around via `DeviceOrientationEvent` gyro controls (requesting iOS 13+ permission on user tap).
   - Dream Gate placed in front of the viewer with an interactive **"⚡ Step Through"** traversal button.
   - Displays: **"Open Camera Mode"** button.
3. **Desktop & Testing**:
   - Interactive **3D Desktop Preview Mode** with orbit mouse drag and wheel zoom.
   - Full post-processing (UnrealBloom, chromatic aberration, film grain).
   - Displays: **"Desktop 3D Preview"** button.

---

## ✦ 4. The Experience Flow

1. **Splash Screen**:
   - Animated particle-text title ("DREAM GATE") that assembles and drifts.
   - First user tap unlocks Web Audio, camera, and haptics.
2. **Surface Scanning**:
   - Glowing crescent moon reticle follows the hit-test surface; pulses rose gold when locked.
3. **Summon Sequence**:
   - Tap summons the 2m carved arch gate rising from a floor crack with dream-fog, shockwave ring, spark bursts, and haptic feedback.
4. **Choose a Dream**:
   - 3 floating sigils on the doorway (Sky Garden, Midnight Ocean, Star Library) with idle drift and tap ripple.
5. **Physical Traversal**:
   - Crossing the gate plane triggers a screen flash, FOV punch (widening camera FOV by 12° then dampening back), haptic buzz, spark burst, and acoustic cross-fade into 360° virtual dreamscape immersion.
6. **Dream Fragment Collection**:
   - 7 glowing crystal shards hidden per realm with orbiting sparkles.
   - Walking within 0.85m or tapping collects the shard with ascending musical chimes (1 to 7) and updates the UI progress ring.
7. **Wake Up Sequence**:
   - Tapping "Wake Up" (or collecting all 7 fragments) triggers a golden bloom flash overlay, heartbeat thud, and soft celestial bell, fading back to the real room.
   - A summary card presents fragments collected, time spent, and a poetic dream title (e.g. *"Lucid Whale Flight"*).
8. **Dream Journal**:
   - Preserves completed journeys in `localStorage` safely wrapped in `try/catch`. Accessible anytime via the **📖 Journal** button.

---

## ✦ 5. Procedural Web Audio Engine (`src/audio/engine.js`)

Synthesized entirely via the procedural Web Audio API with **zero external audio files**:
* **Algorithmic Reverb**: Synthetic impulse-response convolver providing realistic dream room reflections.
* **Adaptive Music**: Slow generative ambient score in a pentatonic scale with distinct chord moods per realm (airy fifths for Sky Garden, deep submerged drones for Midnight Ocean, shimmering celeste for Star Library).
* **Spatial Audio**: HRTF `PannerNode` on gate, sky-whales, dream fragments, jellyfish, and lanterns, updating from the camera listener every frame.
* **Traversal Cross-Fade**: Muffled low-pass filter outside vs open, wide acoustics inside.
* **Fragment Chimes**: Ascending pitches across the pentatonic scale (1 to 7) as shards are collected.
* **Wake-Up Heartbeat**: Low-frequency resonant thud followed by a celestial bell.

---

## ✦ 6. Running Locally & Development

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Serves the application locally at `http://localhost:3000/`.

### Build for Production
```bash
npm run build
```
Creates the minified bundle in `dist/`.

---

## ✦ 7. Testing on Physical Mobile Devices over HTTPS

WebXR AR requires a **secure HTTPS context** (or `localhost`).

### Option A: Cloudflare Tunnel / ngrok (Recommended)
1. Run Vite locally:
   ```bash
   npm run dev
   ```
2. Open a tunnel in a second terminal:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   # or
   npx ngrok http 3000
   ```
3. Open the secure HTTPS URL on your Android or iPhone device.

### Option B: Local HTTPS with Vite
```bash
npx vite --host --https
```

### Option C: Chrome Remote Debugging (Android via USB)
1. Connect your Android phone to your computer via USB with **USB Debugging** enabled.
2. In desktop Chrome, open `chrome://inspect`.
3. In **Port Forwarding**, forward port `3000` to `localhost:3000`.
4. On your mobile Chrome browser, navigate to `http://localhost:3000` (Chrome treats `localhost` as secure).

---

## ✦ 8. Deploying to Cloud Hosts

### Deploy to Vercel
```bash
npx vercel
```
Build command: `npm run build`, Output directory: `dist`.

### Deploy to Netlify
```bash
npx netlify deploy --prod --dir=dist
```

---

## ✦ 9. Engineering Notes & Fallback Simplifications

### WebXR Immersive-AR Rendering Considerations
* **Standard EffectComposer Post-Processing in AR**:
  Standard post-processing passes (such as `UnrealBloomPass`) require offscreen WebGL framebuffer bindings and blitting. In WebXR `immersive-ar` on Android Chrome, the XR session directly controls the hardware framebuffer; intercepting it with `EffectComposer` frequently causes black screens, depth buffer clipping, or camera feed corruption on mobile GPUs.
* **Solution Used in Dream Gate**:
  In `immersive-ar`, full post-processing is intentionally bypassed. Vibrant glows are achieved directly inside the forward WebGL pipeline using **emissive materials**, **additive blending sprites**, and **custom GLSL fresnel rim shaders**. Real `EffectComposer` post-processing (UnrealBloom, chromatic aberration, film grain) is enabled specifically in **Desktop 3D Preview** and **Camera Mode**.

### Hardware-Dependent Features Requiring Physical Device Verification
* **Physical ARCore Surface Plane Anchoring**: While hit-test poses and reticle alignment math are fully verified, real-world floor/wall stability depends on physical device visual-inertial odometry.
* **Physical Device Haptics**: `navigator.vibrate` is supported on Android devices; iOS Safari restricts vibration via Web APIs.
* **WebXR Light Estimation**: Physical room spherical harmonics tinting activates on devices with ARCore light probe support. Fallback ambient lighting is provided for other devices.

---

## ✦ 10. Automated Verification Suite

Run the automated test suite:
```bash
node scripts/verify-full-app.mjs
```
Verifies:
- Three.js Scene, Camera, QualityManager, and EffectsManager initialization.
- All three dream realms (Sky Garden, Midnight Ocean, Star Library) and stencil buffer gating.
- 7 Dream Fragments collection progression and chimes.
- Wake-Up sequence and Dream Journal `localStorage` persistence.
- 10 consecutive gate summon, traversal crossing, and dissolve stress cycles with 0 memory leaks.
- Performance quality profiles (Low, Medium, High) and audio reactivity matrix.
