import { useRef, useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { MEDIUM_CONFIGS } from '../../types'
import { CdSpinCard } from '../media/CdSpinCard'
import cdFrontImg from '../../assets/cdfront.png'
import cdBackImg from '../../assets/cdback.png'
import { formatTime, fillPercent } from '../../utils/duration'

// ─── Background switcher ────────────────────────────────────────────────────

type BgMode = 'wood' | 'dark' | 'gray' | 'orange-grid' | 'green-grid' | 'custom'

function getBgStyle(mode: BgMode, customColor: string): React.CSSProperties {
  if (mode === 'wood')        return { backgroundImage: "url('/models/wood.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }
  if (mode === 'dark')        return { background: '#0a0a0a' }
  if (mode === 'gray')        return { background: '#7a7a7a' }
  if (mode === 'orange-grid') return {
    backgroundImage: [
      'repeating-linear-gradient(0deg,  transparent, transparent 19px, rgba(255,77,0,0.25) 19px, rgba(255,77,0,0.25) 20px)',
      'repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,77,0,0.25) 19px, rgba(255,77,0,0.25) 20px)'
    ].join(','),
    backgroundColor: '#0e0600'
  }
  if (mode === 'green-grid') return {
    backgroundImage: [
      'repeating-linear-gradient(0deg,  transparent, transparent 19px, rgba(80,200,80,0.28) 19px, rgba(80,200,80,0.28) 20px)',
      'repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(80,200,80,0.28) 19px, rgba(80,200,80,0.28) 20px)'
    ].join(','),
    backgroundColor: '#000d00'
  }
  return { background: customColor }
}

// ─── Side fill bar ──────────────────────────────────────────────────────────

function MiniSideBar({ label, used, capacity, color }: { label: string; used: number; capacity: number; color: string }) {
  const pct  = fillPercent(used, capacity)
  const over = used > capacity
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-[11px] tracking-[0.2em]" style={{ color }}>{label}</span>
        <span className="font-mono text-[12px]" style={{ color: over ? '#c44a3a' : '#6b6560' }}>{formatTime(used)}</span>
      </div>
      <div className="h-[2px] rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: over ? '#c44a3a' : color }} />
      </div>
    </div>
  )
}

// ─── MediaScene ─────────────────────────────────────────────────────────────

export function MediaScene() {
  const { project, setAlbumMetadata } = useProjectStore()
  const [bgMode, setBgMode] = useState<BgMode>('dark')
  const [customColor, setCustomColor] = useState('#333333')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [cdZoom, setCdZoom] = useState<1 | 2 | 3>(3)
  const [cdPaused, setCdPaused] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const CD_SIZES: Record<1 | 2 | 3, number> = { 1: 210, 2: 265, 3: 315 }
  const handleCdZoomIn  = () => setCdZoom((z) => Math.min(3, z + 1) as 1 | 2 | 3)
  const handleCdZoomOut = () => setCdZoom((z) => Math.max(1, z - 1) as 1 | 2 | 3)

  const albumTitle = project?.albumMetadata?.title ?? ''
  const commitTitle = () => { setAlbumMetadata({ title: titleVal.trim() }); setEditingTitle(false) }

  const { usedA, usedB } = useMemo(() => {
    if (!project) return { usedA: 0, usedB: 0 }
    const ua = project.tracks.filter((t) => t.side === 'A').reduce((s, t) => s + t.duration, 0)
    const ub = project.tracks.filter((t) => t.side === 'B').reduce((s, t) => s + t.duration, 0)
    return { usedA: ua, usedB: ub }
  }, [project])

  const config = project ? MEDIUM_CONFIGS[project.medium] : null

  return (
    <div className="w-full h-full flex flex-col bg-bg">
      {/* CD scene */}
      <div className="flex-1 relative flex items-center justify-center" style={getBgStyle(bgMode, customColor)}>
        <CdSpinCard
          frontUrl={cdFrontImg}
          backUrl={cdBackImg}
          cdStyle={project?.albumMetadata?.cdStyle ?? 'cd-r'}
          customImageUrl={project?.albumMetadata?.cdCustomImagePath ? `file://${project.albumMetadata.cdCustomImagePath}` : undefined}
          title={project?.albumMetadata?.title}
          artist={project?.albumMetadata?.artist}
          cdTextColor={project?.albumMetadata?.cdTextColor}
          cdFont={project?.albumMetadata?.cdFont ?? 'futurista'}
          cdFontSize={project?.albumMetadata?.cdFontSize ?? 1}
          paused={cdPaused}
          size={CD_SIZES[cdZoom]}
        />

        {project && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <span className="font-mono text-[11px] tracking-[0.3em] text-text-secondary uppercase">
              {config?.label}
            </span>
          </div>
        )}

        {/* Controls pill */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 20,
          padding: '5px 10px', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div className="bg-radio-group">
            {([
              ['wood',        'bgopt-wood',   'Madera'],
              ['dark',        'bgopt-dark',   'Fondo oscuro'],
              ['gray',        'bgopt-gray',   'Gris neutro'],
              ['orange-grid', 'bgopt-orange', 'Grilla naranja'],
              ['green-grid',  'bgopt-green',  'Grilla verde'],
              ['custom',      'bgopt-custom', 'Color personalizado'],
            ] as [BgMode, string, string][]).map(([mode, cls, title]) => (
              <input key={mode} type="radio" name="player-scene-bg" className={cls} title={title}
                checked={bgMode === mode} onChange={() => setBgMode(mode)}
                onClick={mode === 'custom' ? () => colorInputRef.current?.click() : undefined}
              />
            ))}
          </div>

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {([
            ['+', 'Zoom in',  handleCdZoomIn,  cdZoom >= 3],
            ['-', 'Zoom out', handleCdZoomOut, cdZoom <= 1],
          ] as [string, string, () => void, boolean][]).map(([icon, title, handler, disabled]) => (
            <button key={icon} title={title} onClick={handler} disabled={disabled}
              style={{
                width: 22, height: 22, borderRadius: 5, cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
                background: 'linear-gradient(to bottom, #3a3a3a, #272626)',
                border: '1px solid rgba(255,255,255,0.08)', borderTop: '1px solid #555',
                borderBottom: '1px solid rgba(0,0,0,0.5)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                color: disabled ? '#444' : '#999', fontSize: 14, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.08s linear', opacity: disabled ? 0.4 : 1,
              }}
            >{icon}</button>
          ))}

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          <button title={cdPaused ? 'Reanudar giro' : 'Detener giro'} onClick={() => setCdPaused((p) => !p)}
            style={{
              width: 22, height: 22, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
              background: cdPaused ? 'linear-gradient(to bottom, #4a1500, #2e0d00)' : 'linear-gradient(to bottom, #3a3a3a, #272626)',
              border: cdPaused ? '1px solid rgba(255,77,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderTop: cdPaused ? '1px solid rgba(255,77,0,0.6)' : '1px solid #555',
              borderBottom: '1px solid rgba(0,0,0,0.5)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
              color: cdPaused ? '#ff4d00' : '#999',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
            }}
          >
            {cdPaused
              ? <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M1.5 1l5 3.5-5 3.5V1z" /></svg>
              : <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><rect x="1" y="1" width="2.2" height="7" rx="0.5" /><rect x="4.8" y="1" width="2.2" height="7" rx="0.5" /></svg>
            }
          </button>
        </div>

        <input ref={colorInputRef} type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
      </div>

      {/* Bottom strip */}
      <div className="px-4 py-3 border-t border-border">
        {project && config ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              {editingTitle ? (
                <input
                  className="bg-transparent font-mono text-[13px] text-text-primary outline-none border-b flex-1 min-w-0"
                  style={{ borderColor: '#ff4d0060' }}
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  autoFocus
                />
              ) : (
                <button onClick={() => { setTitleVal(albumTitle); setEditingTitle(true) }}
                  className="font-mono text-[13px] text-left truncate flex-1 min-w-0 transition-colors"
                  style={{ color: albumTitle ? '#f5f5f5' : '#555' }}
                >
                  {albumTitle || 'Sin título'}
                </button>
              )}
              <span className="font-mono text-[11px] text-text-secondary flex-shrink-0">{config.label}</span>
            </div>
            <div className="flex gap-4">
              <MiniSideBar label={config.isCD ? 'DISC' : 'SIDE A'} used={usedA} capacity={config.capacity.sideA} color="#ff4d00" />
              {!config.isCD && config.capacity.sideB > 0 && (
                <MiniSideBar label="SIDE B" used={usedB} capacity={config.capacity.sideB} color="#6bafc6" />
              )}
            </div>
          </div>
        ) : (
          <p className="font-mono text-xs text-text-secondary">no project loaded</p>
        )}
      </div>
    </div>
  )
}
