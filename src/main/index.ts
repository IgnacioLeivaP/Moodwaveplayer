import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, resolve } from 'path'
import {
  readFileSync, writeFileSync, existsSync,
  mkdirSync, renameSync, unlinkSync
} from 'fs'
import { pathToFileURL } from 'url'

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

// Write to a temp file and rename so a crash mid-write never corrupts
// the shared library files.
function writeFileAtomic(path: string, data: string): void {
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, data, 'utf-8')
  try {
    renameSync(tmp, path)
  } catch (err) {
    try { unlinkSync(tmp) } catch { /* ignore */ }
    throw err
  }
}

// ─── safe-file allowlist ──────────────────────────────────────────────────────
// The renderer can only read files through safe-file:// if they are referenced
// by a project/index the main process has actually loaded.

const allowedFiles = new Set<string>()

function canonPath(p: string): string {
  return resolve(p).toLowerCase()
}

function allowFile(p: unknown): void {
  if (typeof p === 'string' && p.length > 0) allowedFiles.add(canonPath(p))
}

function allowProjectFiles(project: Record<string, unknown>): void {
  const editions = Array.isArray(project.editions) ? project.editions as Record<string, unknown>[] : []
  for (const edition of editions) {
    const meta = edition.albumMetadata as Record<string, unknown> | undefined
    allowFile(meta?.artworkPath)
    allowFile(meta?.cdCustomImagePath)
    const tracks = Array.isArray(edition.tracks) ? edition.tracks as Record<string, unknown>[] : []
    for (const track of tracks) allowFile(track.path)
  }
  const collectionMeta = project.collectionMeta as Record<string, unknown> | undefined
  allowFile(collectionMeta?.artworkPath)
  allowFile(collectionMeta?.cdCustomImagePath)
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
  try {
    const entries = JSON.parse(readFileSync(p, 'utf-8')) as IndexEntry[]
    for (const e of entries) allowFile(e.artworkPath)
    return entries
  } catch { return [] }
}

function saveIndex(entries: IndexEntry[]): void {
  writeFileAtomic(getIndexPath(), JSON.stringify(entries, null, 2))
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

// Minimal shape check before writing anything into the shared library.
function isValidProject(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  return typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.name === 'string' &&
    Array.isArray(p.editions)
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
      sandbox: true
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

  ipcMain.handle('dialog:openImageFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })
    const path = result.filePaths[0] ?? null
    if (path) allowFile(path)
    return path
  })

  ipcMain.handle('project:save', async (_event, projectData: unknown) => {
    if (!isValidProject(projectData)) return false
    try {
      writeFileAtomic(getProjectPath(projectData.id as string), JSON.stringify(projectData, null, 2))
      upsertIndex(buildIndexEntry(projectData))
      allowProjectFiles(projectData)
      return true
    } catch { return false }
  })

  ipcMain.handle('project:load', async () => {
    const entries = loadIndex()
    if (entries.length === 0) return null
    return loadProjectById(entries[0].id)
  })

  ipcMain.handle('project:list', async () => loadIndex())

  ipcMain.handle('project:loadById', async (_event, id: string) => loadProjectById(id))

  ipcMain.handle('app:quit', () => app.quit())

  ipcMain.handle('dialog:openProjectFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Moodwave Project', extensions: ['rqproj'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return importProjectFile(result.filePaths[0])
  })

  ipcMain.handle('project:importFromPath', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.rqproj')) return null
    return importProjectFile(filePath)
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
    if (!isValidProject(projectData)) return false
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `${suggestedName}.rqproj`,
      filters: [{ name: 'Moodwave Project', extensions: ['rqproj'] }]
    })
    if (result.canceled || !result.filePath) return false
    try {
      writeFileAtomic(result.filePath, JSON.stringify(projectData, null, 2))
      return true
    } catch { return false }
  })
}

function loadProjectById(id: string): unknown {
  const p = getProjectPath(id)
  if (!existsSync(p)) return null
  try {
    const data = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>
    allowProjectFiles(data)
    return data
  } catch { return null }
}

// Import a .rqproj from an arbitrary location: register it in the shared
// library (without overwriting an existing copy) and return its data.
function importProjectFile(filePath: string): unknown {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>
    if (!isValidProject(data)) return null
    upsertIndex(buildIndexEntry(data))
    const destPath = getProjectPath(data.id as string)
    if (!existsSync(destPath)) {
      writeFileAtomic(destPath, JSON.stringify(data, null, 2))
    }
    allowProjectFiles(data)
    return data
  } catch { return null }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

protocol.registerSchemesAsPrivileged([
  { scheme: 'safe-file', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }
])

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    protocol.handle('safe-file', (request) => {
      // URLs look like safe-file://local/C%3A/Users/... (see renderer's safeFileUrl)
      const { pathname } = new URL(request.url)
      let decoded = pathname.split('/').map(decodeURIComponent).join('/')
      // Windows drive-letter paths arrive as "/C:/..." — strip the leading slash
      if (/^\/[A-Za-z]:/.test(decoded)) decoded = decoded.slice(1)
      if (!allowedFiles.has(canonPath(decoded))) {
        return new Response('Forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(decoded).toString())
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
}
