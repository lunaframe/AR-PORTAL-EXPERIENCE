Audio files for the AR Portal Effect application.

Place the following files here (MP3 format, 44100Hz recommended):

AMBIENT LOOPS (looping, ~30s each):
  wormhole-ambient.mp3    - Deep space drone, low rumble
  glass-ambient.mp3       - Crystal resonance, high-frequency shimmer
  nature-ambient.mp3      - Forest ambience, birdsong, wind
  fire-ambient.mp3        - Crackling fire, distant roar
  scifi-ambient.mp3       - Mechanical hum, digital processing sounds

ONE-SHOT STINGERS (activation sounds):
  wormhole-open.mp3       - Dimensional tear / whoosh
  glass-shatter.mp3       - Glass breaking, crystalline
  nature-open.mp3         - Organic tearing, leaf rustle burst
  fire-whoosh.mp3         - Flame eruption burst
  chevron-lock.mp3        - Metallic clunk (x9 for Stargate effect)
  whoosh.mp3              - Generic portal open (used by 360 photo theme)

SOURCES & GENERATION:
  - Generated via scripts/generate-audio.js (44.1kHz 16-bit PCM RIFF format)
  - All 11 files are bundled and active in public/assets/audio/ and dist/assets/audio/
  - The app loads and plays spatialized HRTF 3D audio for all 6 portal themes.

