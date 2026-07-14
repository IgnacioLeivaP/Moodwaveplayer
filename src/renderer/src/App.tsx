import { useEffect } from 'react'
import { useProjectStore } from './store/projectStore'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { MediaScene } from './components/three/MediaScene'
import { MusicPlayer } from './components/player/MusicPlayer'
import { VUMeter } from './components/player/VUMeter'
import { PlaylistTab } from './components/tabs/PlaylistTab'
import { MetadataTab } from './components/tabs/MetadataTab'
import { JourneyMap } from './components/journey/JourneyMap'
import { useI18n } from './i18n'

export default function App() {
  const { t } = useI18n()
  const { workspace, loadProject, isLoading, activeTab, journeyAdvanced } = useProjectStore()

  useEffect(() => { loadProject() }, [loadProject])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <span className="font-mono text-[13px] tracking-[0.3em] text-text-secondary">{t('app.loading')}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden select-none">
      <Header />
      <TabBar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left column: 320px — MediaScene + Player + EQ */}
        <div className="flex flex-col w-[320px] flex-shrink-0 border-r border-border overflow-hidden min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden border-b border-border">
            <MediaScene />
          </div>
          <div style={{ height: 196 }} className="flex-shrink-0">
            <MusicPlayer />
          </div>
          <div style={{ height: 52, marginBottom: 115 }} className="flex-shrink-0">
            <VUMeter />
          </div>
        </div>

        {/* Right: tab content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'playlists' && <PlaylistTab />}
            {activeTab === 'metadata' && (
              workspace
                ? <MetadataTab />
                : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="8" y="8" width="24" height="24" rx="2" stroke="white" strokeWidth="1" />
                      <path d="M14 20h12M14 15h12M14 25h8" stroke="white" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <p className="font-mono text-[11px] tracking-[0.2em] text-text-secondary">open a project first</p>
                  </div>
                )
            )}
            {activeTab === 'journey' && (
              <div className="h-full overflow-hidden">
                {workspace
                  ? <JourneyMap readOnly />
                  : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                      <p className="font-mono text-[11px] tracking-[0.2em] text-text-secondary">open a project first</p>
                    </div>
                  )
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
