import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openImageFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openImageFile'),

  saveProject: (project: unknown): Promise<boolean> =>
    ipcRenderer.invoke('project:save', project),

  loadProject: (): Promise<unknown> =>
    ipcRenderer.invoke('project:load'),

  listProjects: () =>
    ipcRenderer.invoke('project:list'),

  loadProjectById: (id: string) =>
    ipcRenderer.invoke('project:loadById', id),

  getPathForFile: (file: File): string =>
    webUtils.getPathForFile(file),

  quitApp: (): Promise<void> =>
    ipcRenderer.invoke('app:quit'),

  saveProjectCopy: (project: unknown, suggestedName: string): Promise<boolean> =>
    ipcRenderer.invoke('dialog:saveProjectCopy', project, suggestedName),

  openProjectFile: (): Promise<unknown> =>
    ipcRenderer.invoke('dialog:openProjectFile'),

  importProjectFromPath: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke('project:importFromPath', filePath),

  openJsonFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openJsonFile'),
})
