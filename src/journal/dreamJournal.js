/**
 * dreamJournal.js — LocalStorage Persistence & Poetic Dream Title Generator
 * Records completed dream journeys and renders the Dream Journal panel safely with try/catch.
 */

export class DreamJournal {
  constructor() {
    this.storageKey = 'dream_gate_journal_v1';
  }

  generatePoeticTitle(realmName, fragmentCount) {
    const adjectives = [
      'Lucid', 'Celestial', 'Echoing', 'Silver', 'Bioluminescent',
      'Timeless', 'Floating', 'Gilded', 'Quiet', 'Wandering'
    ];
    const realmNouns = {
      skyGarden: ['Whale Flight', 'Island Reverie', 'Blooming Canopy', 'Sky Bloom'],
      midnightOcean: ['Tidal Depth', 'Abyssal Glow', 'Wave Lullaby', 'Ocean Phosphor'],
      starLibrary: ['Constellation Arc', 'Astral Tome', 'Cosmic Whispers', 'Lantern Orbit'],
    };

    const nouns = realmNouns[realmName] || ['Threshold Journey', 'Dream Horizon'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj} ${noun}`;
  }

  saveDream(entry) {
    try {
      const records = this.getDreams();
      records.unshift({
        id: Date.now(),
        title: entry.title || 'Untitled Reverie',
        realm: entry.realm || 'Sky Garden',
        date: new Date().toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        fragments: entry.fragments || 0,
        timeSpentSeconds: entry.timeSpentSeconds || 0,
      });

      // Keep up to 25 recent dreams
      const trimmed = records.slice(0, 25);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
      return true;
    } catch (err) {
      console.warn('DreamJournal: Could not save to localStorage:', err);
      return false;
    }
  }

  getDreams() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.warn('DreamJournal: Could not load from localStorage:', err);
      return [];
    }
  }

  clearJournal() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (err) {}
  }
}

export const dreamJournal = new DreamJournal();
