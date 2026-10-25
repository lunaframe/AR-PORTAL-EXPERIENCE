# Twilight Portal — Production WebXR AR Experience & Bioluminescent Realm

A production-grade, immersive WebXR Augmented Reality portal experience built with Three.js, Vite, and the Web Audio API. A glowing portal opens in the user's real room, allowing them to place it on the floor or wall, watch it open with cinematic particle and shockwave sequences, and physically walk through into an infinite bioluminescent twilight world.

---

## ✦ Core Features & Highlights

- **Multi-Platform Support**:
  - **Android Chrome (ARCore)**: Full WebXR `immersive-ar` session with `hit-test`, `dom-overlay` (glassmorphism UI), `local-floor`, and `light-estimation`.
  - **iOS Safari & Unsupported Browsers**: Robust **Camera Mode Fallback** utilizing `getUserMedia` rear camera stream as the physical background, DeviceOrientation gyro tracking (with iOS 13+ permission request flow), and touch-drag rotation.
  - **Desktop 3D Preview**: Full interactive orbit preview mode allowing instant testing on any desktop computer without needing a mobile device.
  - **Automatic Capability Detection**: Auto-detects device capabilities via `navigator.xr.isSessionSupported('immersive-ar')` and displays the appropriate launch console buttons ("Enter AR", "Open Camera Mode", or "3D Preview").

- **Procedural Spatial Audio Engine (Web Audio API)**:
  - 100% procedural synthesis with zero copyrighted or external audio dependencies.
  - Single `AudioContext` created and unlocked on the first user interaction.
  - **Layer 1**: Evolving ambient pad drone (detuned triangle/sine oscillators with slow LFO resonant low-pass filter sweeps).
  - **Layer 2**: 3D spatialized portal core hum with HRTF `PannerNode`, pitch-shifting and intensifying as the user approaches the portal.
  - **Layer 3**: One-shots (scan blip, placement sub punch whoosh, opening swell, crossing "whoomp" with reverb bloom, and UI feedback clicks).
  - **Layer 4**: Twilight realm ambience (filtered pink noise wind, ethereal crickets, and pentatonic glass bell chimes).
  - **Real-Time AnalyserNode**: Bass (20–150Hz), mid, and treble (2k–12kHz) metrics directly driving portal energy pulse, crystal luminescence, and spore sparkle.
  - Dynamic cross-fading: entering the portal muffles the real world and opens up a wide cavernous reverb soundscape.

- **43 Visual Effects Across 6 Modular Subsystems**:
  - **Group A (Portal Core)**: Domain-warped FBM swirl vortex with chromatic aberration & fresnel, glowing energy torus ring with electric arcs, orbiting runic glyphs with trails, gravity-lens ripple, branching ground lightning tendrils, cinematic pinpoint/shockwave/spark opening sequence, and gravitational implosion closing sequence.
  - **Group B (Particles)**: Logarithmic spiral spark stream into the vortex, 2,800+ bioluminescent spores with sine-wave twinkle and portal gravity, 60 wandering fireflies avoiding the camera, rising thermal embers & ash with turbulence, dust motes inside god-ray cones, instanced petal/leaf vortex swirl, interactive tap bursts, and camera motion ribbon trail.
  - **Group C (Light & Atmosphere)**: Stacked volumetric god rays, floor glow decal with grounding contact shadow, breathing PointLight, low volumetric billboard fog with scrolling noise, proximity color grading, anamorphic lens flare streaks, water caustics, and real-world light estimation tinting.
  - **Group D (The Twilight World)**: Aurora sky dome with scrolling ribbons and shooting stars, instanced glowing mushroom groves with traveling wave pulses, translucent floating jellyfish with swaying tentacles, reflective water plane with interactive tap ripple propagation, giant faceted crystals with audio glow, multi-depth parallax mist, swaying bioluminescent grass lighting up near the camera, and glowing celestial moon with halo.
  - **Group E (Interaction & Reactive)**: Crossing-through transition (screen flash, radial blur, FOV punch, haptic vibration, particle burst), proximity speed & brightness reactivity, bass/treble audio visual reactivity, touch gestures (pinch-to-scale, two-finger twist rotate, long-press shockwave), time-of-day dusk-to-night slider, and 3 one-tap theme presets (Twilight, Ember, Frost).
  - **Group F (UI & Screen Effects)**: Glassmorphism HUD within DOM overlay, animated particle-text splash canvas, scanning reticle with rotating ticks and lock snap, high-res screenshot capture with watermark banner and shutter flash, and slide-up effects drawer.

- **Adaptive Performance & Quality Engine**:
  - Real-time rolling FPS counter with auto-downgrade below 45 FPS to maintain a target 60 FPS on mid-range devices.
  - Quality tiers (**Low / Medium / High**) dynamically scaling particle count, shadow passes, and pixel ratio.
  - Proper disposal of geometries, materials, and canvas textures to prevent WebGL memory leaks during repeated placement.

---

## ✦ Architecture & Project Structure

```
AR PORTAL EXPERIENCE/
├── public/
│   ├── icons/                 # PWA icons (192px, 512px, maskable, favicon)
│   ├── manifest.json          # Web App Manifest
│   └── sw.js                  # PWA Service Worker for offline shell caching
├── src/
│   ├── audio/
│   │   └── engine.js          # Procedural Web Audio engine & HRTF spatial audio
│   ├── effects/
│   │   ├── core/              # Group A: Vortex, Energy Ring, Runes, Lightning, Sequences
│   │   ├── particles/         # Group B: Sparks, Spores, Fireflies, Embers, Petals, Ribbon
│   │   ├── lighting/          # Group C: God Rays, Decal, PointLight, Fog, Flares, Caustics
│   │   ├── postprocessing/    # Group F: Bloom, Aberration & Film Grain (Preview/Camera mode)
│   │   └── effectsManager.js  # Central coordinator for life-cycle, rendering & quality
│   ├── fallback/
│   │   └── cameraMode.js      # iOS rear camera feed, DeviceOrientation gyro & desktop orbit
│   ├── portal/
│   │   ├── portal.js          # Master portal assembly & crossing plane detection
│   │   ├── reticle.js         # Animated scanning reticle with rotating ticks
│   │   └── shaders/           # GLSL shaders (vortex swirl, energy ring, etc.)
│   ├── ui/
│   │   └── uiManager.js       # Glassmorphism UI, particle splash title & effects drawer
│   ├── utils/
│   │   ├── quality.js         # Dynamic Quality Manager (FPS tracking & auto-downgrade)
│   │   ├── screenshot.js      # High-res screenshot generator with watermark & flash
│   │   └── textures.js        # Procedural canvas textures (glows, runes, sparks, flares)
│   ├── world/                 # Group D: Aurora sky, mushrooms, jellyfish, water, crystals, grass
│   └── main.js                # Application entry & WebGL/XR animation loop
├── index.html                 # DOM structure, CSS tokens and PWA tags
└── vite.config.js             # Vite configuration with GLSL shader support
```

---

## ✦ Getting Started

### 1. Prerequisites
- Node.js (v18.0.0 or higher recommended)
- Modern web browser (Google Chrome, Safari, or Edge)

### 2. Local Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

By default, Vite binds to `http://localhost:3000/`. You can also access it on your local network via your machine's IP address (e.g. `http://192.168.x.x:3000/`).

### 3. Production Build
```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ✦ Running on Mobile Devices

WebXR and camera access require a **secure context (HTTPS)** or `localhost`.

### A. Testing on Android Chrome (WebXR ARCore)
1. **Via USB Debugging (Recommended & Free)**:
   - Connect your Android phone to your computer via USB.
   - Enable **Developer Options** and **USB Debugging** on the phone.
   - Open Chrome on your desktop and navigate to `chrome://inspect/#devices`.
   - Under **Port forwarding**, add port `3000` mapping to `localhost:3000`.
   - On your phone's Chrome browser, open `http://localhost:3000/`.
   - Chrome recognizes `localhost` as a secure context, enabling full WebXR `immersive-ar`!
2. **Via Cloudflare Tunnel or ngrok (Over the Air)**:
   - Run `npx ngrok http 3000` or `cloudflared tunnel --url http://localhost:3000`.
   - Open the resulting `https://*.ngrok-free.app` URL on your Android device.

### B. Testing on iPhone / iPad (iOS Safari)
Apple iOS does not currently support the WebXR `immersive-ar` standard. The app automatically detects this and offers **Camera Mode**:
1. Open the HTTPS URL (via ngrok, Cloudflare, or local HTTPS) in Safari.
2. Tap **"Open Camera Mode"**.
3. Tap **Allow** when prompted for camera access.
4. When prompted for Device Motion & Orientation permissions, tap **Allow** to enable 360-degree gyro tracking.
5. The portal will appear positioned directly in your room with the live camera feed behind it!

### C. Desktop 3D Preview Mode
1. Open `http://localhost:3000/` in any desktop browser.
2. Click **"3D Desktop Preview"**.
3. Use your mouse to click and drag to orbit around the portal, and use the mouse wheel to zoom in and out.
4. Use the **⚡ Step Through** button to test entering and exiting the virtual realm.

---

## ✦ Installing as a Progressive Web App (PWA)

The application includes an offline service worker and Web App Manifest:
- **Android**: Tap the menu (⋮) in Chrome and select **"Install app"** or **"Add to Home screen"**.
- **iOS**: Tap the **Share** button in Safari and select **"Add to Home Screen"**.
- Once installed, the app runs in full-screen standalone mode with translucent status bars and offline cached assets.

---

## ✦ Customization Guide

### Customizing Color Themes
Theme palettes are configured in `src/effects/effectsManager.js`:
```javascript
this.themes = {
  twilight: {
    primary: { r: 27 / 255, g: 20 / 255, b: 100 / 255 },  // Indigo #1b1464
    secondary: { r: 109 / 255, g: 40 / 255, b: 217 / 255 },// Violet #6d28d9
    accent1: { r: 20 / 255, g: 241 / 255, b: 217 / 255 },  // Teal #14f1d9
    accent2: { r: 255 / 255, g: 60 / 255, b: 172 / 255 },  // Magenta #ff3cac
    highlight: { r: 232 / 255, g: 247 / 255, b: 255 / 255 },// Soft White #e8f7ff
  },
  ember: { ... },
  frost: { ... },
};
```
Switching themes in the UI dynamically updates uniforms across the vortex, runes, energy ring, aurora sky, water, crystals, and particles in real-time.

### Adding External Audio Files
The procedural audio engine in `src/audio/engine.js` creates all sound synthesis internally. If you wish to supplement it with external `.mp3` or `.ogg` soundscapes:
1. Place your audio files in `public/assets/audio/`.
2. Use the Web Audio API `fetch()` + `ctx.decodeAudioData()` pattern and connect the resulting `AudioBufferSourceNode` to `this.realWorldGain` or `this.twilightGain`.

---

## ✦ Technical Implementation Notes

### Why Post-Processing is Mode-Specific
Standard Three.js `EffectComposer` creates its own offscreen render targets. In WebXR `immersive-ar` sessions, the underlying ARCore / WebXR platform manages the framebuffer and requires drawing directly to `renderer.xr.getBinding()`. Attempting to route full-screen post-processing through standard `EffectComposer` in ARCore causes blank screens, alpha-blending corruption, or crashes on mobile GPUs.

To provide visual fidelity without stability risks:
- In **ARCore AR Mode**: Glow and bloom are achieved through emissive materials, additive blending halo sprites, and custom GLSL fresnel rim shaders.
- In **Preview and Camera Mode**: The full `PostProcessingManager` is activated, applying real multi-pass `UnrealBloomPass`, chromatic aberration radial distortion, and subtle film grain.

---

## ✦ License
Created as part of the advanced WebXR AR Portal Experience. Distributed under the MIT License.
