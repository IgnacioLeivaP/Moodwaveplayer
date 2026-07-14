import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openAudioFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('dialog:openAudioFiles'),

  openImageFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openImageFile'),

  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),

  getAudioMetadata: (filePath: string) =>
    ipcRenderer.invoke('audio:getMetadata', filePath),

  saveProject: (project: unknown): Promise<boolean> =>
    ipcRenderer.invoke('project:save', project),

  saveProjectAs: (project: unknown, filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('project:saveAs', project, filePath),

  loadProject: (): Promise<unknown> =>
    ipcRenderer.invoke('project:load'),

  listProjects: () =>
    ipcRenderer.invoke('project:list'),

  loadProjectById: (id: string) =>
    ipcRenderer.invoke('project:loadById', id),

  deleteProject: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('project:delete', id),

  getPathForFile: (file: File): string =>
    webUtils.getPathForFile(file),

  quitApp: (): Promise<void> =>
    ipcRenderer.invoke('app:quit'),

  saveProjectCopy: (project: unknown, suggestedName: string): Promise<boolean> =>
    ipcRenderer.invoke('dialog:saveProjectCopy', project, suggestedName),

  openProjectFile: (): Promise<unknown> =>
    ipcRenderer.invoke('dialog:openProjectFile'),

  openJsonFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openJsonFile'),
})
