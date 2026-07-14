import { create } from 'zustand'
import {
  MediumType, Mood, EmotionAdvanced, AlbumMetadata, TrackMetadata,
  Track, Project, Edition, Workspace, ProjectType,
  TrackAnalysis, MEDIUM_CONFIGS, MOOD_PRESETS, ProjectIndexEntry
} from '../types'

export type AppTab = 'playlists' | 'metadata' | 'journey'

// ─── Workspace helpers ────────────────────────────────────────────────────────

function getActiveEdition(w: Workspace): Edition {
  return w.editions.find((e) => e.id === w.activeEditionId) ?? w.editions[0]
}

function toProject(w: Workspace): Project {
  const e = getActiveEdition(w)
  return { id: w.id, name: w.name, medium: e.medium, tracks: e.tracks, albumMetadata: e.albumMetadata, createdAt: w.createdAt, updatedAt: w.updatedAt }
}

function updateActiveEdition(w: Workspace, updater: (e: Edition) => Edition): Workspace {
  return { ...w, editions: w.editions.map((e) => (e.id === w.activeEditionId ? updater(e) : e)), updatedAt: Date.now() }
}

function migrateToWorkspace(data: Record<string, unknown>): Workspace {
  if (Array.isArray((data as Workspace).editions)) return data as unknown as Workspace
  const editionId = crypto.randomUUID()
  const old = data as unknown as Project
  return {
    id: old.id ?? crypto.randomUUID(), name: old.name ?? 'My Project', type: 'album',
    editions: [{ id: editionId, name: 'Edition 1', medium: old.medium ?? 'cd-74', tracks: old.tracks ?? [], createdAt: old.createdAt ?? Date.now() }],
    activeEditionId: editionId, createdAt: old.createdAt ?? Date.now(), updatedAt: old.updatedAt ?? Date.now()
  }
}

function safeWorkspace(w: Workspace): Workspace {
  if (!w.type) w = { ...w, type: 'album' }
  if (w.editions.length === 0) {
    const id = crypto.randomUUID()
    w = { ...w, editions: [{ id, name: 'Edition 1', medium: 'cd-74', tracks: [], createdAt: Date.now() }] }
    w.activeEditionId = id
  }
  if (!w.editions.find((e) => e.id === w.activeEditionId)) {
    w = { ...w, activeEditionId: w.editions[0].id }
  }
  return w
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ProjectStore {
  workspace: Workspace | null
  project: Project | null
  isLoading: boolean
  activeTab: AppTab
  journeyAdvanced: boolean
  playerTrackId: string | null
  library: ProjectIndexEntry[]

  setActiveTab: (tab: AppTab) => void
  setJourneyAdvanced: (on: boolean) => void
  setPlayerTrack: (id: string | null) => void

  loadProject: () => Promise<void>
  loadProjectFromFile: () => Promise<void>
  loadProjectById: (id: string) => Promise<void>
  loadLibrary: () => Promise<void>
  saveProject: () => Promise<void>
  closeProject: () => void

  setActiveEdition: (editionId: string) => void
  setAlbumMetadata: (meta: Partial<AlbumMetadata>) => void

  setTrackEmotion: (trackId: string, mood: Mood) => void
  setTrackEmotionAdvanced: (trackId: string, emotion: Partial<EmotionAdvanced>) => void
  setTrackMetadata: (trackId: string, meta: Partial<TrackMetadata>) => void
  setTrackAnalysis: (trackId: string, analysis: TrackAnalysis) => void
  applyAlbumMetadataToAllTracks: () => void
  clearTrackMetadata: (trackId: string) => void
  takeMetadataFromFirstTrack: () => void
  resetAllMetadata: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  workspace: null,
  project: null,
  isLoading: false,
  activeTab: 'playlists',
  journeyAdvanced: false,
  playerTrackId: null,
  library: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setJourneyAdvanced: (on) => set({ journeyAdvanced: on }),
  setPlayerTrack: (id) => set({ playerTrackId: id }),

  loadProject: async () => {
    set({ isLoading: true })
    try {
      const data = await window.api.loadProject()
      if (data && typeof data === 'object') {
        const raw = safeWorkspace(migrateToWorkspace(data as Record<string, unknown>))
        set({ workspace: raw, project: toProject(raw) })
      }
    } catch { /* no saved project */ } finally { set({ isLoading: false }) }
  },

  loadProjectFromFile: async () => {
    set({ isLoading: true })
    try {
      const data = await window.api.openProjectFile()
      if (data && typeof data === 'object') {
        const raw = safeWorkspace(migrateToWorkspace(data as Record<string, unknown>))
        set({ workspace: raw, project: toProject(raw), activeTab: 'metadata' })
      }
    } catch { /* ignore */ } finally { set({ isLoading: false }) }
  },

  loadProjectById: async (id) => {
    set({ isLoading: true })
    try {
      const data = await window.api.loadProjectById(id)
      if (data && typeof data === 'object') {
        const raw = safeWorkspace(migrateToWorkspace(data as Record<string, unknown>))
        set({ workspace: raw, project: toProject(raw), activeTab: 'metadata', playerTrackId: null })
      }
    } catch { /* ignore */ } finally { set({ isLoading: false }) }
  },

  loadLibrary: async () => {
    try {
      const list = await window.api.listProjects()
      set({ library: list })
    } catch { /* ignore */ }
  },

  saveProject: async () => {
    const { workspace } = get()
    if (!workspace) return
    try { await window.api.saveProject(workspace) } catch { /* silent */ }
  },

  closeProject: () => {
    set({ workspace: null, project: null, playerTrackId: null, activeTab: 'playlists' })
  },

  setActiveEdition: (editionId) => {
    const { workspace } = get()
    if (!workspace) return
    const w = { ...workspace, activeEditionId: editionId }
    set({ workspace: w, project: toProject(w), playerTrackId: null })
  },

  setAlbumMetadata: (meta) => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({ ...e, albumMetadata: { ...e.albumMetadata, ...meta } }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  setTrackEmotion: (trackId, mood) => {
    const { workspace } = get()
    if (!workspace) return
    const preset = MOOD_PRESETS[mood]
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, emotion: { mood, energy: preset.energy, valence: preset.valence } } : t)
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  setTrackEmotionAdvanced: (trackId, emotion) => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, tracks: e.tracks.map((t) => t.id === trackId
        ? { ...t, emotionAdvanced: { energy: 50, happiness: 50, sadness: 50, aggression: 50, nostalgia: 50, warmth: 50, ...t.emotionAdvanced, ...emotion } }
        : t)
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  setTrackMetadata: (trackId, meta) => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, tracks: e.tracks.map((t) => t.id === trackId
        ? { ...t, metadataOverride: { ...t.metadataOverride, ...meta }, metadataFromAlbum: false }
        : t)
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  applyAlbumMetadataToAllTracks: () => {
    const { workspace } = get()
    if (!workspace) return
    const edition = getActiveEdition(workspace)
    const album = edition.albumMetadata ?? {}
    const albumOverride: Partial<TrackMetadata> = {}
    if (album.artist  !== undefined) albumOverride.artist  = album.artist
    if (album.title   !== undefined) albumOverride.album   = album.title
    if (album.year    !== undefined) albumOverride.year    = album.year
    if (album.genre   !== undefined) albumOverride.genre   = album.genre
    if (album.comment !== undefined) albumOverride.comment = album.comment
    if (Object.keys(albumOverride).length === 0) return
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, tracks: e.tracks.map((t) => ({ ...t, metadataOverride: { ...t.metadataOverride, ...albumOverride }, metadataFromAlbum: true }))
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  setTrackAnalysis: (trackId, analysis) => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({ ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, analysis } : t) }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  clearTrackMetadata: (trackId) => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, metadataOverride: undefined, metadataFromAlbum: undefined } : t)
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  takeMetadataFromFirstTrack: () => {
    const { workspace } = get()
    if (!workspace) return
    const edition = getActiveEdition(workspace)
    if (edition.tracks.length === 0) return
    const first = [...edition.tracks].sort((a, b) => a.side.localeCompare(b.side) || a.order - b.order)[0]
    const orig = first.originalFileTags ?? {}
    const patch: Partial<AlbumMetadata> = {}
    const artist = orig.artist ?? first.artist
    const albumTitle = orig.album ?? first.album
    if (artist) patch.artist = artist
    if (albumTitle) patch.title = albumTitle
    if (orig.year) patch.year = orig.year
    if (orig.genre) patch.genre = orig.genre
    if (Object.keys(patch).length === 0) return
    const w = updateActiveEdition(workspace, (e) => ({ ...e, albumMetadata: { ...e.albumMetadata, ...patch } }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },

  resetAllMetadata: () => {
    const { workspace } = get()
    if (!workspace) return
    const w = updateActiveEdition(workspace, (e) => ({
      ...e, albumMetadata: {}, tracks: e.tracks.map((t) => ({ ...t, metadataOverride: undefined, metadataFromAlbum: undefined }))
    }))
    set({ workspace: w, project: toProject(w) })
    get().saveProject()
  },
}))
