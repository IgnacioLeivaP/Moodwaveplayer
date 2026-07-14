import { create } from 'zustand'
import {
  Mood, EmotionAdvanced, AlbumMetadata, TrackMetadata,
  Project, Edition, Workspace,
  TrackAnalysis, MOOD_PRESETS, ProjectIndexEntry
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
  if (Array.isArray(data.editions)) return data as unknown as Workspace
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

// ─── Debounced save ───────────────────────────────────────────────────────────
// Edits save automatically, but rapid changes (typing in metadata fields)
// collapse into a single disk write.

const SAVE_DEBOUNCE_MS = 600
let saveTimer: ReturnType<typeof setTimeout> | null = null

// ─── Store ────────────────────────────────────────────────────────────────────

interface ProjectStore {
  workspace: Workspace | null
  project: Project | null
  isLoading: boolean
  saveError: boolean
  activeTab: AppTab
  journeyAdvanced: boolean
  playerTrackId: string | null
  library: ProjectIndexEntry[]

  setActiveTab: (tab: AppTab) => void
  setJourneyAdvanced: (on: boolean) => void
  setPlayerTrack: (id: string | null) => void

  loadProject: () => Promise<void>
  loadProjectFromFile: () => Promise<void>
  loadProjectFromPath: (filePath: string) => Promise<void>
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

export const useProjectStore = create<ProjectStore>((set, get) => {

  // Single place where a modified workspace enters the store: keeps the
  // derived `project` in sync and schedules a debounced save.
  const commit = (w: Workspace): void => {
    set({ workspace: w, project: toProject(w) })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { saveTimer = null; get().saveProject() }, SAVE_DEBOUNCE_MS)
  }

  const loadWorkspaceData = (data: unknown, extra?: Partial<ProjectStore>): boolean => {
    if (!data || typeof data !== 'object') return false
    const raw = safeWorkspace(migrateToWorkspace(data as Record<string, unknown>))
    set({ workspace: raw, project: toProject(raw), ...extra })
    return true
  }

  // Flush any pending debounced save before the window goes away.
  window.addEventListener('beforeunload', () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      get().saveProject()
    }
  })

  return {
    workspace: null,
    project: null,
    isLoading: false,
    saveError: false,
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
        loadWorkspaceData(await window.api.loadProject())
      } catch { /* no saved project */ } finally { set({ isLoading: false }) }
    },

    loadProjectFromFile: async () => {
      set({ isLoading: true })
      try {
        loadWorkspaceData(await window.api.openProjectFile(), { activeTab: 'metadata' })
      } catch { /* ignore */ } finally { set({ isLoading: false }) }
    },

    loadProjectFromPath: async (filePath) => {
      set({ isLoading: true })
      try {
        loadWorkspaceData(await window.api.importProjectFromPath(filePath), { activeTab: 'metadata', playerTrackId: null })
      } catch { /* ignore */ } finally { set({ isLoading: false }) }
    },

    loadProjectById: async (id) => {
      set({ isLoading: true })
      try {
        loadWorkspaceData(await window.api.loadProjectById(id), { activeTab: 'metadata', playerTrackId: null })
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
      try {
        const ok = await window.api.saveProject(workspace)
        set({ saveError: !ok })
      } catch {
        set({ saveError: true })
      }
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
      commit(updateActiveEdition(workspace, (e) => ({ ...e, albumMetadata: { ...e.albumMetadata, ...meta } })))
    },

    setTrackEmotion: (trackId, mood) => {
      const { workspace } = get()
      if (!workspace) return
      const preset = MOOD_PRESETS[mood]
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, emotion: { mood, energy: preset.energy, valence: preset.valence } } : t)
      })))
    },

    setTrackEmotionAdvanced: (trackId, emotion) => {
      const { workspace } = get()
      if (!workspace) return
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, tracks: e.tracks.map((t) => t.id === trackId
          ? { ...t, emotionAdvanced: { energy: 50, happiness: 50, sadness: 50, aggression: 50, nostalgia: 50, warmth: 50, ...t.emotionAdvanced, ...emotion } }
          : t)
      })))
    },

    setTrackMetadata: (trackId, meta) => {
      const { workspace } = get()
      if (!workspace) return
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, tracks: e.tracks.map((t) => t.id === trackId
          ? { ...t, metadataOverride: { ...t.metadataOverride, ...meta }, metadataFromAlbum: false }
          : t)
      })))
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
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, tracks: e.tracks.map((t) => ({ ...t, metadataOverride: { ...t.metadataOverride, ...albumOverride }, metadataFromAlbum: true }))
      })))
    },

    setTrackAnalysis: (trackId, analysis) => {
      const { workspace } = get()
      if (!workspace) return
      commit(updateActiveEdition(workspace, (e) => ({ ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, analysis } : t) })))
    },

    clearTrackMetadata: (trackId) => {
      const { workspace } = get()
      if (!workspace) return
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, tracks: e.tracks.map((t) => t.id === trackId ? { ...t, metadataOverride: undefined, metadataFromAlbum: undefined } : t)
      })))
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
      commit(updateActiveEdition(workspace, (e) => ({ ...e, albumMetadata: { ...e.albumMetadata, ...patch } })))
    },

    resetAllMetadata: () => {
      const { workspace } = get()
      if (!workspace) return
      commit(updateActiveEdition(workspace, (e) => ({
        ...e, albumMetadata: {}, tracks: e.tracks.map((t) => ({ ...t, metadataOverride: undefined, metadataFromAlbum: undefined }))
      })))
    },
  }
})
