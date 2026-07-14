import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, extname } from 'path'
import {
  readFileSync, writeFileSync, existsSync,
  mkdirSync, readdirSync, unlinkSync, statSync
} from 'fs'

// ─── Paths — reads from Moodwave Editor's userData so both apps share library ──

function getEditorDataDir(): string {
  return join(app.getPath('appData'), 'Moodwave Editor')
}

function getProjectsDir(): string {
  const dir = join(getEditorDataDir(), 'projects')
  mkdirSync(dir, { recursive: true })
  return dir
}

function getProjectPath(id: string): string {
  return join(getProjectsDir(), `${id}.rqproj`)
}

function getIndexPath(): string {
  return join(getEditorDataDir(), 'projects-index.json')
}

// ─── Index helpers ────────────────────────────────────────────────────────────

interface IndexEntry {
  id: string
  name: string
  type: string
  artist?: string
  artworkPath?: string
  formats: string[]
  totalDuration: number
  updatedAt: number
}

function loadIndex(): IndexEntry[] {
  const p = getIndexPath()
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return [] }
}

function saveIndex(entries: IndexEntry[]): void {
  writeFileSync(getIndexPath(), JSON.stringify(entries, null, 2), 'utf-8')
}

function upsertIndex(entry: IndexEntry): void {
  const entries = loadIndex().filter((e) => e.id !== entry.id)
  entries.unshift(entry)
  saveIndex(entries)
}

function buildIndexEntry(project: Record<string, unknown>): IndexEntry {
  const editions = (project.editions as Record<string, unknown>[]) ?? []
  const formats: string[] = [...new Set(editions.map((e) => e.medium as string))]
  const activeEdition = (editions.find(
    (e) => e.id === project.activeEditionId
  ) ?? editions[0]) as Record<string, unknown> | undefined
  const tracks = (activeEdition?.tracks as Record<string, unknown>[]) ?? []
  const totalDuration = tracks.reduce((s, t) => s + ((t.duration as number) ?? 0), 0)
  const meta = activeEdition?.albumMetadata as Record<string, unknown> | undefined
  return {
    id: project.id as string,
    name: project.name as string,
    type: (project.type as string) ?? 'album',
    artist: (meta?.artist as string) ?? undefined,
    artworkPath: (meta?.artworkPath as string) ?? undefined,
    formats,
    totalDuration,
    updatedAt: (project.updatedAt as number) ?? Date.now()
  }
}

function extractFilename(filePath: string): string {
  return filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Unknown'
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {

  ipcMain.handle('dialog:openAudioFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'ogg', 'm4a', 'aac', 'wma'] }]
    })
    return result.filePaths
  })

  ipcMain.handle('dialog:openImageFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('dialog:openFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('audio:getMetadata', async (_event, filePath: string) => {
    try {
      const mm = await import('music-metadata')
      const metadata = await mm.parseFile(filePath)
      let fileSize = 0
      try { fileSize = statSync(filePath).size } catch { /* ignore */ }
      return {
        title: metadata.common.title || extractFilename(filePath),
        artist: metadata.common.artist || 'Unknown Artist',
        albumArtist: metadata.common.albumartist ?? null,
        album: metadata.common.album ?? null,
        year: metadata.common.year ?? null,
        genre: metadata.common.genre?.[0] ?? null,
        trackNumber: metadata.common.track?.no ?? null,
        duration: metadata.format.duration ?? 0,
        fileSize,
        bpm: metadata.common.bpm ?? null,
        replayGain: metadata.common.replaygain_track_gain?.dB ?? null
      }
    } catch {
      return {
        title: extractFilename(filePath),
        artist: 'Unknown Artist',
        albumArtist: null, album: null, year: null, genre: null,
        trackNumber: null, duration: 0, fileSize: 0, bpm: null, replayGain: null
      }
    }
  })

  ipcMain.handle('project:save', async (_event, projectData: unknown) => {
    const project = projectData as Record<string, unknown>
    const id = project.id as string
    writeFileSync(getProjectPath(id), JSON.stringify(projectData, null, 2), 'utf-8')
    upsertIndex(buildIndexEntry(project))
    return true
  })

  ipcMain.handle('project:saveAs', async (_event, projectData: unknown, filePath: string) => {
    writeFileSync(filePath, JSON.stringify(projectData, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('project:load', async () => {
    const entries = loadIndex()
    if (entries.length === 0) return null
    return loadProjectById(entries[0].id)
  })

  ipcMain.handle('project:list', async () => loadIndex())

  ipcMain.handle('project:loadById', async (_event, id: string) => loadProjectById(id))

  ipcMain.handle('project:delete', async (_event, id: string) => {
    const p = getProjectPath(id)
    if (existsSync(p)) unlinkSync(p)
    saveIndex(loadIndex().filter((e) => e.id !== id))
    return true
  })

  ipcMain.handle('app:quit', () => app.quit())

  ipcMain.handle('dialog:openProjectFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Moodwave Project', extensions: ['rqproj'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    try {
      const data = JSON.parse(readFileSync(result.filePaths[0], 'utf-8')) as Record<string, unknown>
      if (data.id) {
        upsertIndex(buildIndexEntry(data))
        const destPath = getProjectPath(data.id as string)
        if (!existsSync(destPath)) {
          writeFileSync(destPath, JSON.stringify(data, null, 2), 'utf-8')
        }
      }
      return data
    } catch { return null }
  })

  ipcMain.handle('dialog:openJsonFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'JSON Language File', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return readFileSync(result.filePaths[0], 'utf-8')
  })

  ipcMain.handle('dialog:saveProjectCopy', async (event, projectData: unknown, suggestedName: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `${suggestedName}.rqproj`,
      filters: [{ name: 'Moodwave Project', extensions: ['rqproj'] }]
    })
    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, JSON.stringify(projectData, null, 2), 'utf-8')
    return true
  })
}

function loadProjectById(id: string): unknown {
  const p = getProjectPath(id)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return null }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

protocol.registerSchemesAsPrivileged([
  { scheme: 'safe-file', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
])

app.whenReady().then(() => {
  protocol.handle('safe-file', (request) => {
    const raw = request.url.slice('safe-file://'.length)
    const decoded = decodeURIComponent(raw)
    const fileUrl = decoded.startsWith('/') ? `file://${decoded}` : `file:///${decoded}`
    return net.fetch(fileUrl)
  })

  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
