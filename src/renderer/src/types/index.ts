// ─── Medium types ─────────────────────────────────────────────────────────────

export type MediumType =
  | 'cassette-c60'
  | 'cassette-c90'
  | 'cd-74'
  | 'cd-80'
  | 'vinyl-lp'
  | 'vinyl-ep'
  | 'digital'

export type MediumCategory = 'cassette' | 'cd' | 'vinyl' | 'digital'

export interface SideCapacity { sideA: number; sideB: number }

export const MEDIUM_CONFIGS: Record<MediumType, { label: string; category: MediumCategory; capacity: SideCapacity; isCassette: boolean; isCD: boolean; isVinyl: boolean; isDigital: boolean; hasSides: boolean }> = {
  'cassette-c60': { label: 'Cassette C60', category: 'cassette', capacity: { sideA: 1800, sideB: 1800 }, isCassette: true,  isCD: false, isVinyl: false, isDigital: false, hasSides: true  },
  'cassette-c90': { label: 'Cassette C90', category: 'cassette', capacity: { sideA: 2700, sideB: 2700 }, isCassette: true,  isCD: false, isVinyl: false, isDigital: false, hasSides: true  },
  'cd-74':        { label: 'CD 74min',     category: 'cd',       capacity: { sideA: 4440, sideB: 0    }, isCassette: false, isCD: true,  isVinyl: false, isDigital: false, hasSides: false },
  'cd-80':        { label: 'CD 80min',     category: 'cd',       capacity: { sideA: 4800, sideB: 0    }, isCassette: false, isCD: true,  isVinyl: false, isDigital: false, hasSides: false },
  'vinyl-lp':     { label: 'Vinyl LP',     category: 'vinyl',    capacity: { sideA: 1320, sideB: 1320 }, isCassette: false, isCD: false, isVinyl: true,  isDigital: false, hasSides: true  },
  'vinyl-ep':     { label: 'Vinyl EP',     category: 'vinyl',    capacity: { sideA: 900,  sideB: 900  }, isCassette: false, isCD: false, isVinyl: true,  isDigital: false, hasSides: true  },
  'digital':      { label: 'Digital',      category: 'digital',  capacity: { sideA: 0,    sideB: 0    }, isCassette: false, isCD: false, isVinyl: false, isDigital: true,  hasSides: false },
}

// ─── Emotion ──────────────────────────────────────────────────────────────────

export type Mood = 'dark' | 'tense' | 'melancholic' | 'calm' | 'hopeful' | 'upbeat' | 'euphoric' | 'energetic'

export interface EmotionTag { mood: Mood; energy: number; valence: number }
export interface EmotionAdvanced { energy: number; happiness: number; sadness: number; aggression: number; nostalgia: number; warmth: number }

export const MOOD_PRESETS: Record<Mood, { label: string; energy: number; valence: number; color: string }> = {
  dark:        { label: 'Dark',        energy: 0.12, valence: 0.10, color: '#7a6a9a' },
  tense:       { label: 'Tense',       energy: 0.78, valence: 0.18, color: '#8b3030' },
  melancholic: { label: 'Melancholic', energy: 0.28, valence: 0.28, color: '#3d4f7c' },
  calm:        { label: 'Calm',        energy: 0.20, valence: 0.65, color: '#2d6a4f' },
  hopeful:     { label: 'Hopeful',     energy: 0.48, valence: 0.78, color: '#457b9d' },
  upbeat:      { label: 'Upbeat',      energy: 0.68, valence: 0.85, color: '#c47a35' },
  euphoric:    { label: 'Euphoric',    energy: 0.92, valence: 0.96, color: '#c8a840' },
  energetic:   { label: 'Energetic',   energy: 0.88, valence: 0.50, color: '#b84030' },
}

export interface MoodLightConfig { ambientColor: string; ambientIntensity: number; dir1Color: string; dir2Color: string; pointColor: string; emissive: string }

export const DEFAULT_LIGHTING: MoodLightConfig = { ambientColor: '#d0ccc8', ambientIntensity: 1.4, dir1Color: '#ffffff', dir2Color: '#e8c87a', pointColor: '#6090a8', emissive: '#1a0800' }

// ─── Track ────────────────────────────────────────────────────────────────────

export interface TrackAnalysis { lufs: number | null; dr: number | null; bpm: number | null; key: string | null; sampleRate: number; channels: number; peakDb: number | null; rmsDb: number | null }

export interface TrackMetadata { title: string; artist: string; albumArtist?: string; album?: string; year?: number; genre?: string; trackNumber?: number; discNumber?: number; comment?: string; composer?: string }

export interface Track {
  id: string; path: string; fileSize?: number; title: string; artist: string; album: string | null
  duration: number; side: 'A' | 'B'; order: number
  emotion?: EmotionTag; emotionAdvanced?: EmotionAdvanced
  bpm?: number | null; replayGain?: number | null; analysis?: TrackAnalysis
  metadataOverride?: Partial<TrackMetadata>; metadataFromAlbum?: boolean; originalFileTags?: Partial<TrackMetadata>
}

// ─── Album metadata ───────────────────────────────────────────────────────────

export type CdStyle = 'cd-r' | 'rainbow' | 'vinyl' | 'white' | 'dark-gray' | 'purple' | 'custom-image'
export type CdFont  = 'futurista' | 'simple' | 'elegante' | 'handmade'

export interface AlbumMetadata {
  title?: string; artist?: string; albumArtist?: string; year?: number; genre?: string
  comment?: string; artworkPath?: string
  cdStyle?: CdStyle; cdCustomImagePath?: string; cdTextColor?: string; cdFont?: CdFont; cdFontSize?: number
}

// ─── Edition / Workspace ──────────────────────────────────────────────────────

export interface Edition { id: string; name: string; medium: MediumType; tracks: Track[]; createdAt: number; albumMetadata?: AlbumMetadata; digitalSizeLimitGB?: number }

export type ProjectType = 'album' | 'collection'

export interface Workspace { id: string; name: string; type: ProjectType; editions: Edition[]; activeEditionId: string; canonEditionId?: string; collectionMeta?: AlbumMetadata; createdAt: number; updatedAt: number }

export interface ProjectIndexEntry { id: string; name: string; type: ProjectType; artist?: string; artworkPath?: string; formats: MediumType[]; totalDuration: number; updatedAt: number }

export interface Project { id: string; name: string; medium: MediumType; tracks: Track[]; albumMetadata?: AlbumMetadata; createdAt: number; updatedAt: number }

// ─── IPC API ──────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    api: {
      openImageFile: () => Promise<string | null>
      saveProject: (project: unknown) => Promise<boolean>
      loadProject: () => Promise<unknown>
      listProjects: () => Promise<ProjectIndexEntry[]>
      loadProjectById: (id: string) => Promise<unknown>
      getPathForFile: (file: File) => string
      quitApp: () => Promise<void>
      saveProjectCopy: (project: unknown, suggestedName: string) => Promise<boolean>
      openProjectFile: () => Promise<unknown>
      importProjectFromPath: (filePath: string) => Promise<unknown>
      openJsonFile: () => Promise<string | null>
    }
  }
}
