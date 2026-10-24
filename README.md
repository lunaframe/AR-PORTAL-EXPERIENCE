# AR Portal Effect

A production-quality **WebXR AR Portal Effect** application. Place portals in your real environment that open into different virtual worlds — complete with animated rim shaders, spatial audio, and walk-through detection.

> **Portfolio/Demo Quality** — cinematic shader effects, six portal themes, multi-portal support, WebXR lighting estimation, and localStorage persistence.

---

## ✨ Features

| Feature | Status |
|---------|--------|
| AR hit-test placement (tap to place) | ✅ |
| Stencil-occlusion portal rendering | ✅ |
| Classic Wormhole theme (GLSL swirl) | ✅ |
| Glass Shatter theme (Voronoi dissolve) | ✅ |
| Custom 360° Photo/Video portal | ✅ |
| Walk-through detection + transition | ✅ |
| Spatial Web Audio API (HRTF) | ✅ |
| In-scene 3D theme menu | ✅ |
| WebXR Lighting Estimation rim tint | ✅ |
| Multi-portal support (up to 8) | ✅ |
| localStorage theme + position save | ✅ |
| Magic Window fallback (non-AR) | ✅ |
| Nature Rift (forest interior + organic rim) | ✅ |
| Elemental Fire (lava interior + fire rim shader) | ✅ |
| Sci-Fi Stargate (hologram corridor + chevron rim) | ✅ |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- A browser with WebXR support (see [Browser Support](#browser-support))

### Installation

```bash
# Clone or download the project
cd "AR PORTAL EFFECT"

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
# Output in /dist — deploy to Netlify, Vercel, or GitHub Pages
npm run preview  # preview the production build locally
```

---

---

## 📱 Testing on a Real AR Device & Installing the PWA

WebXR and full PWA installation require **HTTPS** (or `localhost`). The dev server runs on HTTP by default, so a secure tunnel is recommended for device testing.

### Option A — ngrok (Recommended)

```bash
# 1. Start the Vite dev server (or production preview)
cmd.exe /c npm run dev      # running on port 3000

# 2. In a separate terminal, expose the port with HTTPS
ngrok http 3000
# Copy the https://<subdomain>.ngrok-free.app URL and open it on your phone
```

### Option B — Production Build & Preview with Tunnel

```bash
cmd.exe /c npm run build
cmd.exe /c npm run preview
# Preview server runs on port 4173 — tunnel with: ngrok http 4173
```

---

## 📲 How to Install the PWA on Your Phone

Once you have opened the `https://...` URL on your phone:

### On Android (Google Chrome)
1. Open the URL in **Google Chrome**.
2. An **"Install App"** button will automatically light up in the top header bar. You can tap it directly to trigger the native installation prompt!
3. Alternatively, tap the three-dot menu (**⋮**) in Chrome's top right corner and tap **"Install app"** (or **"Add to Home screen"**).
4. Chrome will package the app via WebAPK with the cosmic portal icon and add it to your app drawer and home screen.
5. Launching from the home screen opens the app in immersive standalone mode without browser URL bars, preserving all WebXR AR camera permissions.

### On iOS (Apple Safari)
1. Open the URL in **Safari** on iOS 16+.
2. Tap the **Share** button (box with upward arrow ⎋) at the bottom toolbar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right.
5. Launch the app from your iPhone home screen with the custom 180x180 glowing portal icon.
6. *Note for iOS WebXR:* Ensure the WebXR flag is enabled in iOS Settings:
   **Settings → Safari → Advanced → Experimental Features → WebXR Device API** ✓

### Launching the AR Experience
1. Tap the prominent glowing **"Start AR Experience"** focal button on the launch screen.
2. Grant camera access when prompted by the browser/system.
3. Slowly point your phone camera at a flat surface (floor or desk).
4. When the cyan/white reticle locks onto the surface plane, **tap anywhere on the screen** to open a portal into that dimension!
5. Walk physically towards and through the event horizon to explore the virtual world.


---

## 🎨 Portal Themes

### Implemented

| Theme | ID | Effect |
|-------|-----|--------|
| Classic Wormhole | `wormhole` | Domain-warped fbm plasma swirl, cosmic color palette |
| Glass Shatter | `glass-shatter` | Voronoi crack pattern, per-shard cascade dissolve |
| 360° Photo/Video | `custom-360` | Equirectangular photo upload, soft gaussian glow rim |

### Adding a New Theme

1. Create `/src/themes/my-theme.ts`:

```typescript
import type { PortalTheme } from './index';

export const MY_THEME: PortalTheme = {
  id:           'my-theme',
  name:         'My Theme',
  description:  'Description shown in the UI',
  emoji:        '⚡',
  gradientCss:  'linear-gradient(135deg, #001a00, #003300)',

  rimShaderKey: 'wormhole',          // or 'glow', 'glass-shatter', 'nature', 'scifi'
  rimColor:     [0.0, 1.0, 0.5],    // RGB 0–1
  rimIntensity: 2.0,

  interior: {
    type:   'skybox-gradient',
    colorA: '#001a00',
    colorB: '#003300',
    // Or: type: '360-photo', src: '/assets/interiors/my-360.jpg'
  },

  activation: {
    type:       'iris',              // 'iris' | 'iris-fast' | 'shatter'
    durationMs: 1800,
  },

  audio: {
    ambient: 'my-ambient.mp3',       // place in /public/assets/audio/
    stinger: 'my-open.mp3',
  },

  particles: {
    enabled: true,
    color:   '#4ade80',
    count:   30,
    speed:   0.3,
  },

  implemented: true,
};
```

2. Register it in `/src/themes/index.ts`:

```typescript
import { MY_THEME } from './my-theme';
export const THEMES: PortalTheme[] = [
  WORMHOLE_THEME,
  GLASS_SHATTER_THEME,
  CUSTOM_360_THEME,
  MY_THEME,           // ← add here
  ...
];
```

3. Optionally add a custom GLSL fragment shader in `/src/shaders/my-rim.glsl` and register it in `portal-rim-shader.ts`.

**That's it.** No changes to core logic required.

---

## 🏗️ Architecture

```
src/
├── main.ts                      Entry point, registers components
├── aframe.d.ts                  TypeScript ambient declarations for AFRAME global
├── components/
│   ├── portal-core.ts           ★ Core stencil portal (occlusion + interior + rim)
│   ├── hit-test-placement.ts    WebXR hit-test → tap-to-place
│   ├── portal-rim-shader.ts     ShaderMaterial factory for all rim effects
│   ├── portal-transition.ts     Open/close animation state machine
│   ├── portal-theme-manager.ts  Scene-level multi-portal coordinator
│   ├── portal-audio.ts          Web Audio API HRTF spatial sound
│   ├── portal-ui.ts             HTML overlay + in-scene 3D menu
│   └── lighting-estimation.ts   WebXR XRLightProbe → rim tint color
├── shaders/
│   ├── common.glsl              Shared noise/fresnel/voronoi utilities
│   ├── wormhole-rim.glsl        Swirling plasma energy ring
│   ├── glass-shatter.glsl       Voronoi crack dissolve
│   ├── glow-rim.glsl            Soft gaussian rim (360 photo)
│   ├── nature-rim.glsl          Organic torn-edge (Nature Rift)
│   ├── scifi-rim.glsl           Hologram segments (Sci-Fi Stargate)
│   └── elemental-fire.glsl      Turbulent flame tongues (Elemental Fire)
│   └── rim-vertex.ts            Shared vertex shader string
├── themes/
│   ├── index.ts                 PortalTheme interface + registry
│   ├── wormhole.ts              ✅ Fully implemented
│   ├── glass-shatter.ts         ✅ Fully implemented
│   ├── custom-360.ts            ✅ Fully implemented
│   ├── nature-rift.ts           ✅ Fully implemented
│   ├── elemental-fire.ts        ✅ Fully implemented (fire shader)
│   └── scifi-stargate.ts        ✅ Fully implemented
└── utils/
    ├── render-order.ts          Constants + stencil ID pool
    ├── device-detect.ts         WebXR capability detection
    └── persistence.ts           localStorage save/restore
```

### The Stencil Occlusion Trick

The portal mechanic relies on the WebGL stencil buffer:

```
Frame rendering order:

renderOrder=0  Occlusion Mesh
               • CircleGeometry at portal position
               • colorWrite: false  → invisible (no color output)
               • stencilWrite: true → stamps stencil ref = portalId
               • depthWrite: true   → occludes objects behind the portal
               Result: a silent "stamp" marking the portal area in stencil

renderOrder=1  Interior Sphere
               • Large sphere (r=100m) centered at camera
               • stencilFunc: EQUAL, ref = portalId
               • Only renders where stencil = this portal
               Result: virtual world visible ONLY through the portal hole

renderOrder=2  Rim Shader
               • Torus at portal edge
               • AdditiveBlending → glows over everything
               • ShaderMaterial with animated GLSL
               Result: the glowing animated edge effect
```

---

## 🔧 Configuration

### Audio

Place audio files in `/public/assets/audio/`. The app silently skips missing files.

Recommended format: `.mp3` (widest mobile support), 44100Hz, stereo for stingers, mono for ambient loops.

### Performance Tuning

In `portal-core.ts`, adjust these for lower-end devices:
- `THREE.CircleGeometry(radius, 64)` — reduce segments (32 for low-end)
- `THREE.SphereGeometry(100, 32, 16)` — reduce subdivisions (16, 8)
- `particles.count` in theme configs — reduce from 40 to 15
- `fbm()` in shaders — reduce octave count from 5 to 3

### Multi-Portal

Up to 8 simultaneous portals (stencil buffer limit). Each gets a unique stencil reference (1–8) so they don't interfere. Allocated/freed via `allocatePortalId()` / `freePortalId()` in `render-order.ts`.

---

## 📄 License

MIT — feel free to use in personal and commercial projects. Attribution appreciated.

---

*Built with [A-Frame](https://aframe.io), [Three.js](https://threejs.org), and [Vite](https://vitejs.dev)*
