import { useState, useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { Track, TrackMetadata, CdStyle, CdFont, MEDIUM_CONFIGS } from '../../types'
import { formatTime } from '../../utils/duration'
import { useI18n } from '../../i18n'

// ─── Field input ──────────────────────────────────────────────────────────────

function Field({ label, value, onChange, disabled, type = 'text' }: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.2em] text-text-secondary mb-1 uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-bg border border-border font-mono text-[13px] text-text-primary px-2.5 py-1.5 outline-none rounded-sm focus:border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors placeholder:text-text-secondary/30"
        placeholder={disabled ? '-' : ''}
      />
    </div>
  )
}

// ─── TrackMetaRow ──────────────────────────────────────────────────────────────

function TrackMetaRow({ track, selected, onClick }: {
  track: Track
  selected: boolean
  onClick: () => void
}) {
  const title = track.metadataOverride?.title ?? track.title
  const artist = track.metadataOverride?.artist ?? track.artist
  const hasOverrides = track.metadataOverride && Object.keys(track.metadataOverride).length > 0
  const dotColor = hasOverrides
    ? (track.metadataFromAlbum ? '#5a8cb8' : '#d4a853')
    : null

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-border/20 transition-colors ${
        selected ? 'bg-accent/[0.06] border-l-2 border-l-accent' : 'hover:bg-white/[0.02]'
      }`}
    >
      <span className="font-mono text-[12px] text-text-secondary w-6 text-right flex-shrink-0">
        {track.order + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[13px] text-text-primary truncate leading-snug">{title}</p>
        <p className="font-mono text-[11px] text-text-secondary truncate">{artist}</p>
      </div>
      <span className="font-mono text-[12px] text-text-secondary tabular-nums flex-shrink-0">
        {formatTime(track.duration)}
      </span>
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
          title={track.metadataFromAlbum ? 'from album' : 'manual override'}
        />
      )}
    </div>
  )
}

// ─── Tag origins section ──────────────────────────────────────────────────────

type OriginField = {
  key: keyof TrackMetadata
  label: string
  fileValue: string
  albumValue: string
}

function TagOriginsSection({ track, albumMeta, onRestoreFile, onApplyAlbum }: {
  track: Track
  albumMeta: Record<string, unknown>
  onRestoreFile: (key: keyof TrackMetadata, value: string | number | undefined) => void
  onApplyAlbum: (key: keyof TrackMetadata, value: string | number | undefined) => void
}) {
  const { t } = useI18n()
  const orig = track.originalFileTags ?? {}
  const albumFields: Partial<Record<keyof TrackMetadata, unknown>> = {
    artist:      albumMeta.artist,
    album:       albumMeta.title,   // album title → track album field
    year:        albumMeta.year,
    genre:       albumMeta.genre,
    comment:     albumMeta.comment,
  }

  const FIELD_LABELS: Partial<Record<keyof TrackMetadata, string>> = {
    title:       t('metadata.fieldTitle'),
    artist:      t('metadata.fieldArtist'),
    album:       t('metadata.fieldAlbum'),
    albumArtist: t('metadata.fieldAlbumArtist'),
    year:        t('metadata.fieldYear'),
    genre:       t('metadata.fieldGenre'),
    comment:     t('metadata.fieldComment'),
    composer:    t('metadata.fieldComposer'),
    trackNumber: t('metadata.fieldTrackNum'),
  }

  const rows: OriginField[] = (Object.keys(FIELD_LABELS) as (keyof TrackMetadata)[]).reduce<OriginField[]>((acc, key) => {
    const fileVal = orig[key] !== undefined ? String(orig[key]) : ''
    const albumVal = albumFields[key] !== undefined ? String(albumFields[key]) : ''
    if (fileVal || albumVal) {
      acc.push({ key, label: FIELD_LABELS[key]!, fileValue: fileVal, albumValue: albumVal })
    }
    return acc
  }, [])

  if (rows.length === 0) return null

  return (
    <div className="mt-5 pt-4 border-t border-border/30">
      <p className="font-mono text-[10px] tracking-[0.2em] text-text-secondary mb-3">{t('metadata.tagOrigins')}</p>
      <div className="space-y-1">
        {rows.map(({ key, label, fileValue, albumValue }) => (
          <div key={key} className="grid gap-x-2" style={{ gridTemplateColumns: '80px 1fr 1fr' }}>
            <span className="font-mono text-[10px] text-text-secondary self-center truncate">{label}</span>

            {/* File original */}
            {fileValue ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-mono text-[11px] truncate flex-1"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  title={fileValue}
                >
                  {fileValue}
                </span>
                <button
                  onClick={() => onRestoreFile(key, orig[key])}
                  className="font-mono text-[9px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm flex-shrink-0 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#d0ccc8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                  title={`${t('metadata.restore')}: "${fileValue}"`}
                >
                  {t('metadata.restore')}
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Album value */}
            {albumValue ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-mono text-[11px] truncate flex-1"
                  style={{ color: '#5a8cb8' }}
                  title={albumValue}
                >
                  {albumValue}
                </span>
                <button
                  onClick={() => onApplyAlbum(key, albumFields[key] as string | number | undefined)}
                  className="font-mono text-[9px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm flex-shrink-0 transition-colors"
                  style={{ color: '#5a8cb8', border: '1px solid rgba(90,140,184,0.25)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#5a8cb8' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(90,140,184,0.25)' }}
                  title={`${t('metadata.apply')}: "${albumValue}"`}
                >
                  {t('metadata.apply')}
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>▸</span>
          <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('metadata.fromFile')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px]" style={{ color: '#5a8cb8' }}>▸</span>
          <span className="font-mono text-[9px]" style={{ color: '#5a8cb8' }}>{t('metadata.fromAlbum')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── CD Style Picker ─────────────────────────────────────────────────────────

const CD_STYLE_LIST = [
  { id: 'cd-r' as CdStyle,        label: 'CD-R',      preview: { background: 'conic-gradient(from 30deg, #c8b8d0, #e8d8a0, #b8d8c8, #a8b8e0, #d0b8d8, #e0c8a8, #c8b8d0)' } },
  { id: 'rainbow' as CdStyle,     label: 'Rainbow',   preview: { background: 'conic-gradient(from 220deg, oklch(0.85 0.05 30), oklch(0.88 0.06 90), oklch(0.86 0.08 180), oklch(0.84 0.09 260), oklch(0.88 0.07 320), oklch(0.86 0.05 30))' } },
  { id: 'vinyl' as CdStyle,       label: 'Vinyl',     preview: { background: 'radial-gradient(circle at center, #1a1008 0%, #080707 40%, #0a0808 100%)' } },
  { id: 'white' as CdStyle,       label: 'White',     preview: { background: 'conic-gradient(from 180deg, #ffffff, #edf0f2, #f5f5f7, #e8ecef, #ffffff)' } },
  { id: 'dark-gray' as CdStyle,   label: 'Dark Gray', preview: { background: 'conic-gradient(from 180deg, #4b5563, #2d3748, #374151, #252f3e, #4b5563)' } },
  { id: 'purple' as CdStyle,      label: 'Purple',    preview: { background: 'conic-gradient(from 220deg, oklch(0.6 0.2 300), oklch(0.65 0.18 260), oklch(0.55 0.25 330), oklch(0.5 0.28 290), oklch(0.65 0.2 250), oklch(0.6 0.2 300))' } },
]

const FONT_LIST: { id: CdFont; family: string }[] = [
  { id: 'futurista', family: 'Michroma, monospace' },
  { id: 'simple',    family: 'Inter, sans-serif' },
  { id: 'elegante',  family: 'Cinzel, serif' },
  { id: 'handmade',  family: '"Permanent Marker", cursive' },
]

function CdStyleSection({
  cdStyle, cdCustomImagePath, cdTextColor, cdFont, cdFontSize,
  onStyleChange, onCustomImageChange, onTextColorChange, onFontChange, onFontSizeChange,
}: {
  cdStyle: CdStyle
  cdCustomImagePath?: string
  cdTextColor?: string
  cdFont: CdFont
  cdFontSize: number
  onStyleChange: (s: CdStyle) => void
  onCustomImageChange: (path: string) => void
  onTextColorChange: (color: string) => void
  onFontChange: (f: CdFont) => void
  onFontSizeChange: (n: number) => void
}) {
  const { t } = useI18n()
  const colorInputRef = useRef<HTMLInputElement>(null)
  const showTextControls = cdStyle !== 'custom-image'
  const defaultTextColor = (cdStyle === 'white' || cdStyle === 'rainbow') ? '#1a1208' : '#f0ede8'
  const effectiveColor = cdTextColor || defaultTextColor

  const fontLabels: Record<CdFont, string> = {
    futurista: t('metadata.cdFontFuturista'),
    simple:    t('metadata.cdFontSimple'),
    elegante:  t('metadata.cdFontElegante'),
    handmade:  t('metadata.cdFontHandmade'),
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/30 space-y-4">

      {/* ── Style swatches ── */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-text-secondary mb-3">{t('metadata.cdStyle')}</p>
        <div className="flex flex-wrap gap-x-2 gap-y-3">
          {[...CD_STYLE_LIST, { id: 'custom-image' as CdStyle, label: t('metadata.cdStyleImage'), preview: { background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 50%, #1a1a2e 100%)' } }].map(({ id, label, preview }) => {
            const isActive = cdStyle === id
            return (
              <button
                key={id}
                title={label}
                onClick={() => onStyleChange(id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 36 }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', position: 'relative', overflow: 'hidden', flexShrink: 0, ...preview, outline: isActive ? '2px solid #d4a853' : '2px solid transparent', outlineOffset: 2, transition: 'outline-color 0.15s' }}>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: '22%', height: '22%', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: '#0a0a0a' }} />
                  {id === 'custom-image' && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'rgba(255,255,255,0.5)' }}>
                      <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="0.8" />
                      <path d="M0.5 7l2.5-2.5 1.5 1.5 2-2.5L9.5 7" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
                      <circle cx="3" cy="2.5" r="1" fill="currentColor" fillOpacity="0.6" />
                    </svg>
                  )}
                </div>
                <span className="font-mono text-[8px] whitespace-nowrap text-center" style={{ color: isActive ? '#d4a853' : 'rgba(255,255,255,0.25)', lineHeight: 1 }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Custom image picker ── */}
      {cdStyle === 'custom-image' && (
        <div>
          <button
            onClick={async () => { const path = await window.api.openImageFile(); if (path) onCustomImageChange(path) }}
            className="w-full font-mono text-[10px] tracking-[0.15em] px-2.5 py-2 rounded-sm border transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.12)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#d0ccc8' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}
          >
            {cdCustomImagePath ? t('metadata.cdStyleChangeImg') : t('metadata.cdStyleChooseImg')}
          </button>
          {cdCustomImagePath && (
            <div className="mt-2 overflow-hidden" style={{ aspectRatio: '1', borderRadius: '50%' }}>
              <img src={`file://${cdCustomImagePath}`} alt="cd custom" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* ── Text controls (hidden for custom-image) ── */}
      {showTextControls && (
        <>
          {/* Font picker */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-text-secondary mb-2">{t('metadata.cdFont')}</p>
            <div className="flex flex-col gap-1">
              {FONT_LIST.map(({ id, family }) => {
                const isActive = cdFont === id
                return (
                  <button
                    key={id}
                    onClick={() => onFontChange(id)}
                    style={{
                      fontFamily: family,
                      textAlign: 'left', padding: '5px 8px', borderRadius: 3,
                      fontSize: 12, letterSpacing: '0.05em',
                      background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(212,168,83,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: isActive ? '#d4a853' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.12s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' } }}
                    onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' } }}
                  >
                    {fontLabels[id]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Text color + font size */}
          <div className="flex items-center gap-3">
            {/* Color picker */}
            <div className="flex items-center gap-2 flex-1">
              <span className="font-mono text-[10px] tracking-[0.12em] text-text-secondary">{t('metadata.cdStyleTextColor')}</span>
              <button
                onClick={() => colorInputRef.current?.click()}
                style={{ width: 20, height: 20, borderRadius: '50%', background: effectiveColor, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, cursor: 'pointer' }}
              />
              <input ref={colorInputRef} type="color" value={effectiveColor} onChange={(e) => onTextColorChange(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
            </div>

            {/* Font size +/- */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-mono text-[10px] tracking-[0.12em] text-text-secondary">{t('metadata.cdFontSize')}</span>
              {(['-', '+'] as const).map((icon) => {
                const isMin = icon === '-' && cdFontSize <= 0.5
                const isMax = icon === '+' && cdFontSize >= 2.0
                const disabled = isMin || isMax
                return (
                  <button
                    key={icon}
                    disabled={disabled}
                    onClick={() => onFontSizeChange(Math.round((cdFontSize + (icon === '+' ? 0.1 : -0.1)) * 10) / 10)}
                    style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: 'linear-gradient(to bottom, #3a3a3a, #272626)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: disabled ? '#444' : '#999', fontSize: 13, lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {icon}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── MetadataTab ──────────────────────────────────────────────────────────────

export function MetadataTab() {
  const { t } = useI18n()
  const {
    workspace, saveProject, setAlbumMetadata, setTrackMetadata,
    applyAlbumMetadataToAllTracks, clearTrackMetadata,
    takeMetadataFromFirstTrack, resetAllMetadata
  } = useProjectStore()
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [applyFlash, setApplyFlash] = useState(false)
  const [takeFlash, setTakeFlash] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)

  const handleSave = useCallback(async () => {
    await saveProject()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [saveProject])

  const handleApplyToAll = useCallback(() => {
    applyAlbumMetadataToAllTracks()
    setApplyFlash(true)
    setTimeout(() => setApplyFlash(false), 1500)
  }, [applyAlbumMetadataToAllTracks])

  const handleTakeFromFirst = useCallback(() => {
    takeMetadataFromFirstTrack()
    setTakeFlash(true)
    setTimeout(() => setTakeFlash(false), 1500)
  }, [takeMetadataFromFirstTrack])

  const handleResetAll = useCallback(() => {
    if (!resetArmed) {
      setResetArmed(true)
      setTimeout(() => setResetArmed(false), 3000)
    } else {
      resetAllMetadata()
      setResetArmed(false)
      setSelectedTrackId(null)
    }
  }, [resetArmed, resetAllMetadata])

  if (!workspace) return null

  const edition = workspace.editions.find((e) => e.id === workspace.activeEditionId) ?? workspace.editions[0]
  const meta = edition.albumMetadata ?? {}
  const allTracks = [...edition.tracks].sort((a, b) => a.side.localeCompare(b.side) || a.order - b.order)
  const selectedTrack = allTracks.find((t) => t.id === selectedTrackId) ?? null
  const isCD = MEDIUM_CONFIGS[edition.medium]?.isCD ?? false

  const [draggingArtwork, setDraggingArtwork] = useState(false)

  const handleArtwork = async () => {
    const path = await window.api.openImageFile()
    if (path) setAlbumMetadata({ artworkPath: path })
  }

  const handleArtworkDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingArtwork(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const path = window.api.getPathForFile(file)
    if (path) setAlbumMetadata({ artworkPath: path })
  }

  const trackField = (key: string, track: Track) => {
    const override = track.metadataOverride ?? {}
    const base: Record<string, string> = {
      title: track.title,
      artist: track.artist,
      album: track.album ?? '',
      albumArtist: '',
      year: '',
      genre: '',
      composer: '',
      comment: ''
    }
    return String((override as Record<string, unknown>)[key] ?? base[key] ?? '')
  }

  const handleRestoreFile = (key: keyof TrackMetadata, value: string | number | undefined) => {
    if (!selectedTrack) return
    setTrackMetadata(selectedTrack.id, { [key]: value } as Partial<TrackMetadata>)
  }

  const handleApplyAlbumField = (key: keyof TrackMetadata, value: string | number | undefined) => {
    if (!selectedTrack) return
    setTrackMetadata(selectedTrack.id, { [key]: value } as Partial<TrackMetadata>)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Column 1: Album metadata */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-secondary">{t('metadata.album')}</span>
            <button
              onClick={handleSave}
              className={`font-mono text-[10px] tracking-[0.15em] px-2.5 py-1 rounded-sm border transition-colors ${
                saved
                  ? 'border-accent text-accent bg-accent/[0.08]'
                  : 'border-border text-text-secondary hover:border-accent/40'
              }`}
            >
              {saved ? t('metadata.saved') : t('metadata.save')}
            </button>
          </div>

          {/* Artwork */}
          <div
            data-droppable
            onClick={handleArtwork}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingArtwork(true) }}
            onDragLeave={() => setDraggingArtwork(false)}
            onDrop={handleArtworkDrop}
            className="w-full aspect-square bg-bg border rounded-sm flex items-center justify-center mb-4 overflow-hidden cursor-pointer transition-colors"
            style={{ borderColor: draggingArtwork ? 'rgba(74,124,138,0.7)' : undefined }}
            // eslint-disable-next-line tailwindcss/no-contradicting-classname
          >
            {meta.artworkPath ? (
              <img src={`file://${meta.artworkPath}`} alt="artwork" className="w-full h-full object-cover" style={{ opacity: draggingArtwork ? 0.5 : 1 }} />
            ) : (
              <div className="flex flex-col items-center gap-2 select-none" style={{ opacity: draggingArtwork ? 0.6 : 0.2 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1" />
                  <path d="M8 14l3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                </svg>
                <span className="font-mono text-[10px]">{draggingArtwork ? 'soltar imagen' : t('metadata.clickToAdd')}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Field label={t('metadata.fieldArtist')} value={meta.artist ?? ''} onChange={(v) => setAlbumMetadata({ artist: v })} />
            <Field label={t('metadata.fieldAlbumTitle')} value={meta.title ?? workspace.name} onChange={(v) => setAlbumMetadata({ title: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('metadata.fieldYear')} value={meta.year ? String(meta.year) : ''} onChange={(v) => setAlbumMetadata({ year: v ? parseInt(v) : undefined })} type="number" />
              <Field label={t('metadata.fieldGenre')} value={meta.genre ?? ''} onChange={(v) => setAlbumMetadata({ genre: v })} />
            </div>
            <Field label={t('metadata.fieldComment')} value={meta.comment ?? ''} onChange={(v) => setAlbumMetadata({ comment: v })} />
          </div>

          {/* Apply to all / take from first / reset buttons */}
          {allTracks.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <button
                onClick={handleApplyToAll}
                className="w-full font-mono text-[9px] tracking-[0.15em] px-2.5 py-2 rounded-sm border transition-colors"
                style={{
                  color: applyFlash ? '#5a8cb8' : 'rgba(255,255,255,0.3)',
                  borderColor: applyFlash ? '#5a8cb8' : 'rgba(255,255,255,0.12)',
                  backgroundColor: applyFlash ? 'rgba(90,140,184,0.08)' : 'transparent',
                }}
              >
                {t('metadata.applyToAll')}
              </button>
              <button
                onClick={handleTakeFromFirst}
                className="w-full font-mono text-[9px] tracking-[0.15em] px-2.5 py-2 rounded-sm border transition-colors"
                style={{
                  color: takeFlash ? '#d4a853' : 'rgba(255,255,255,0.3)',
                  borderColor: takeFlash ? '#d4a853' : 'rgba(255,255,255,0.12)',
                  backgroundColor: takeFlash ? 'rgba(212,168,83,0.08)' : 'transparent',
                }}
              >
                {t('metadata.takeFromFirst')}
              </button>
            </div>
          )}

          {/* CD style picker */}
          {isCD && (
            <CdStyleSection
              cdStyle={meta.cdStyle ?? 'cd-r'}
              cdCustomImagePath={meta.cdCustomImagePath}
              cdTextColor={meta.cdTextColor}
              cdFont={meta.cdFont ?? 'futurista'}
              cdFontSize={meta.cdFontSize ?? 1}
              onStyleChange={(s) => setAlbumMetadata({ cdStyle: s })}
              onCustomImageChange={(path) => setAlbumMetadata({ cdCustomImagePath: path })}
              onTextColorChange={(color) => setAlbumMetadata({ cdTextColor: color })}
              onFontChange={(f) => setAlbumMetadata({ cdFont: f })}
              onFontSizeChange={(n) => setAlbumMetadata({ cdFontSize: n })}
            />
          )}

          {/* Reset all metadata — destructive, requires double-click */}
          <button
            onClick={handleResetAll}
            className="w-full mt-3 font-mono text-[9px] tracking-[0.15em] px-2.5 py-2 rounded-sm border transition-all"
            style={{
              color: resetArmed ? '#c05050' : 'rgba(255,255,255,0.18)',
              borderColor: resetArmed ? '#c05050' : 'rgba(255,255,255,0.08)',
              backgroundColor: resetArmed ? 'rgba(192,80,80,0.08)' : 'transparent',
            }}
          >
            {resetArmed ? t('metadata.resetAllConfirm') : t('metadata.resetAll')}
          </button>
        </div>
      </div>

      {/* Column 2: Track list */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border/40 flex-shrink-0">
          <span className="font-mono text-[10px] tracking-[0.25em] text-text-secondary">
            {t('metadata.tracksClickEdit')}
          </span>
        </div>
        {/* Dot legend */}
        <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#d4a853' }} />
            <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>manual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#5a8cb8' }} />
            <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('metadata.appliedFromAlbum')}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {allTracks.length === 0 ? (
            <div className="p-4 text-center">
              <span className="font-mono text-[11px] text-text-secondary opacity-40">{t('metadata.noTracks')}</span>
            </div>
          ) : (
            allTracks.map((trk) => (
              <TrackMetaRow
                key={trk.id}
                track={trk}
                selected={selectedTrackId === trk.id}
                onClick={() => setSelectedTrackId(selectedTrackId === trk.id ? null : trk.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Column 3: Per-track editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedTrack ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <p className="font-mono text-[11px] text-text-secondary">{t('metadata.selectTrack')}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-[14px] text-text-primary">{selectedTrack.title}</p>
                <p className="font-mono text-[11px] text-text-secondary mt-0.5">
                  {selectedTrack.metadataFromAlbum
                    ? <span style={{ color: '#5a8cb8' }}>{t('metadata.appliedFromAlbum')}</span>
                    : t('metadata.perTrackOverrides')
                  }
                </p>
              </div>
              {selectedTrack.metadataOverride && Object.keys(selectedTrack.metadataOverride).length > 0 && (
                <button
                  onClick={() => clearTrackMetadata(selectedTrack.id)}
                  className="font-mono text-[10px] text-text-secondary hover:text-text-primary border border-border px-2 py-1 rounded-sm transition-colors"
                  title="Remove all per-track overrides and revert to base file tags"
                >
                  {t('metadata.clearOverrides')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t('metadata.fieldTitle')} value={trackField('title', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { title: v })} />
              <Field label={t('metadata.fieldArtist')} value={trackField('artist', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { artist: v })} />
              <Field label={t('metadata.fieldAlbum')} value={trackField('album', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { album: v })} />
              <Field label={t('metadata.fieldAlbumArtist')} value={trackField('albumArtist', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { albumArtist: v })} />
              <Field label={t('metadata.fieldYear')} value={trackField('year', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { year: v ? parseInt(v) : undefined })} type="number" />
              <Field label={t('metadata.fieldGenre')} value={trackField('genre', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { genre: v })} />
              <Field label={t('metadata.fieldTrackNum')} value={trackField('trackNumber', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { trackNumber: v ? parseInt(v) : undefined })} type="number" />
              <Field label={t('metadata.fieldComposer')} value={trackField('composer', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { composer: v })} />
              <div className="col-span-2">
                <Field label={t('metadata.fieldComment')} value={trackField('comment', selectedTrack)} onChange={(v) => setTrackMetadata(selectedTrack.id, { comment: v })} />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="font-mono text-[10px] tracking-[0.2em] text-text-secondary mb-3">{t('metadata.sourceInfo')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-mono text-[10px] text-text-secondary">{t('metadata.duration')}</p>
                  <p className="font-mono text-[12px] text-text-primary">{formatTime(selectedTrack.duration)}</p>
                </div>
                {selectedTrack.fileSize && (
                  <div>
                    <p className="font-mono text-[10px] text-text-secondary">{t('metadata.fileSize')}</p>
                    <p className="font-mono text-[12px] text-text-primary">{(selectedTrack.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                )}
              </div>
              <p className="font-mono text-[10px] text-text-secondary mt-3 truncate opacity-50">{selectedTrack.path}</p>
            </div>

            <TagOriginsSection
              track={selectedTrack}
              albumMeta={meta as Record<string, unknown>}
              onRestoreFile={handleRestoreFile}
              onApplyAlbum={handleApplyAlbumField}
            />
          </div>
        )}
      </div>
    </div>
  )
}
