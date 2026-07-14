import { useEffect, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useI18n } from '../../i18n'
import { JewelCaseCard } from '../media/JewelCaseCard'

const PRIMARY = '#ff4d00'

export function PlaylistTab() {
  const { library, workspace, loadLibrary, loadProjectById, loadProjectFromFile } = useProjectStore()
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => { loadLibrary() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await loadProjectFromFile()
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0 border-b"
        style={{ borderColor: '#1a1a1a' }}
      >
        <span className="font-mono text-[10px] tracking-[0.35em]" style={{ color: PRIMARY }}>
          {t('playlist.library')}
        </span>
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={loadLibrary}
            title="Refresh library"
            className="font-mono text-[10px] tracking-[0.15em] px-2.5 py-1 rounded-sm border transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ccc'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M9 5A4 4 0 111.5 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <path d="M1 1.5l.5 1.5 1.5-.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Open from PC */}
          <button
            onClick={loadProjectFromFile}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] px-3 py-1.5 rounded-sm border transition-colors"
            style={{ color: PRIMARY, borderColor: `${PRIMARY}40`, background: `${PRIMARY}08` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = PRIMARY; (e.currentTarget as HTMLButtonElement).style.background = `${PRIMARY}18` }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${PRIMARY}40`; (e.currentTarget as HTMLButtonElement).style.background = `${PRIMARY}08` }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 7V2M3 4.5L5 2l2 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 8.5h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            {t('playlist.open')}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto px-6 py-8 transition-colors"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragging ? 'rgba(255, 77, 0, 0.08)' : 'transparent',
          borderRadius: isDragging ? 4 : 0
        }}
      >
        {library.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="8" width="32" height="32" rx="3" stroke="white" strokeWidth="1" />
              <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="1" />
              <circle cx="24" cy="24" r="3" fill="white" />
            </svg>
            <p className="font-mono text-[11px] tracking-[0.2em] text-text-secondary text-center">
              {t('playlist.empty')}<br />
              <span className="text-[10px] opacity-60">{t('playlist.emptyHint')}</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-12 justify-start">
            {library.map((entry) => (
              <JewelCaseCard
                key={entry.id}
                entry={entry}
                isActive={workspace?.id === entry.id}
                onClick={() => loadProjectById(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
