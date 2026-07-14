import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { MEDIUM_CONFIGS, MOOD_PRESETS, Mood, Track } from '../../types'
import { useI18n } from '../../i18n'

const PAD_L = 68
const PAD_R = 20
const PAD_T = 20
const PAD_B = 28
const NODE_R = 7

const SIDE_A_COLOR = '#d4a853'
const SIDE_B_COLOR = '#4a7cb8'

const EMOTION_DIMS = [
  { key: 'energy',     color: '#d4a853' },
  { key: 'happiness',  color: '#4a9a5a' },
  { key: 'sadness',    color: '#4a7cb8' },
  { key: 'aggression', color: '#c44a3a' },
  { key: 'nostalgia',  color: '#8a5cc4' },
  { key: 'warmth',     color: '#c4833a' },
] as const

type EmotionKey = (typeof EMOTION_DIMS)[number]['key']

function smoothCurve(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i]
    const cx = (p.x + q.x) / 2
    d += ` C ${cx},${p.y} ${cx},${q.y} ${q.x},${q.y}`
  }
  return d
}

// ─── Advanced slider panel ────────────────────────────────────────────────────

function AdvancedPanel({ track }: { track: Track }) {
  const { t } = useI18n()
  const { setTrackEmotionAdvanced } = useProjectStore()
  const emo = track.emotionAdvanced

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border/30 flex-shrink-0">
        <p className="font-mono text-[11px] text-text-primary truncate">{track.title}</p>
        <p className="font-mono text-[10px] text-text-secondary truncate">{track.artist}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {EMOTION_DIMS.map((dim) => {
          const val = emo?.[dim.key] ?? 50
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] text-text-secondary">{t(`journey.${dim.key}`)}</span>
                <span className="font-mono text-[11px] tabular-nums" style={{ color: dim.color }}>{val}</span>
              </div>
              <div className="relative h-4 flex items-center">
                <div className="absolute inset-x-0 h-px bg-border" />
                <div
                  className="absolute h-px left-0 transition-all"
                  style={{ width: `${val}%`, backgroundColor: dim.color + '80' }}
                />
                <input
                  type="range" min={0} max={100} step={1} value={val}
                  onChange={(e) => setTrackEmotionAdvanced(track.id, { [dim.key]: parseInt(e.target.value) } as Record<EmotionKey, number>)}
                  className="absolute inset-x-0 w-full opacity-0 h-4 cursor-pointer"
                  style={{ zIndex: 1 }}
                />
                <div
                  className="absolute w-2.5 h-2.5 rounded-full border border-current transition-all"
                  style={{ left: `calc(${val}% - 5px)`, color: dim.color, backgroundColor: dim.color + '30' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── JourneyMap ───────────────────────────────────────────────────────────────

interface JourneyMapProps {
  readOnly?: boolean
}

export function JourneyMap({ readOnly = false }: JourneyMapProps) {
  const { t } = useI18n()
  const { workspace, setTrackEmotion, journeyAdvanced, setJourneyAdvanced } = useProjectStore()
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredMood, setHoveredMood] = useState<Mood | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([e]) => {
      setSvgSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const closeOnBg = useCallback(() => { setSelectedId(null); setHoveredId(null) }, [])

  if (!workspace) return null

  const edition = workspace.editions.find((e) => e.id === workspace.activeEditionId) ?? workspace.editions[0]
  const config = MEDIUM_CONFIGS[edition.medium]
  const sideA = [...edition.tracks.filter((trk) => trk.side === 'A')].sort((a, b) => a.order - b.order)
  const sideB = config.hasSides
    ? [...edition.tracks.filter((trk) => trk.side === 'B')].sort((a, b) => a.order - b.order)
    : []
  const allTracks = [...sideA, ...sideB]

  if (allTracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-mono text-[11px] tracking-[0.25em] text-text-secondary">
          {t('journey.addTracks')}
        </span>
      </div>
    )
  }

  const { w, h } = svgSize
  const chartW = Math.max(1, w - PAD_L - PAD_R)
  const chartH = Math.max(1, h - PAD_T - PAD_B)
  const n = allTracks.length

  const nodes = allTracks.map((track, i) => {
    const energy = track.emotion ? track.emotion.energy : 0.5
    const x = PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
    const y = PAD_T + (1 - energy) * chartH
    const mood = track.emotion?.mood ?? null
    const side = track.side
    const sideList = side === 'A' ? sideA : sideB
    const trackNum = sideList.findIndex(t => t.id === track.id) + 1
    return { x, y, id: track.id, title: track.title, mood, side, trackNum, energy, color: mood ? MOOD_PRESETS[mood].color : '#4a4540' }
  })

  const dividerIdx = sideA.length
  const dividerX = config.hasSides && dividerIdx > 0 && dividerIdx < allTracks.length
    ? (nodes[dividerIdx - 1].x + nodes[dividerIdx].x) / 2
    : null
  const selectedNode = nodes.find((nd) => nd.id === selectedId) ?? null
  const hoveredNode = nodes.find((nd) => nd.id === hoveredId) ?? null
  const pickerAbove = selectedNode ? selectedNode.y > h * 0.6 : false

  const selectedTrack = edition.tracks.find((trk) => trk.id === selectedId) ?? null
  const usedMoods = [...new Set(allTracks.flatMap((trk) => (trk.emotion ? [trk.emotion.mood] : [])))]

  // Tooltip position
  const tooltipAbove = hoveredNode ? hoveredNode.y > h * 0.5 : false
  const tooltipLeft = hoveredNode
    ? Math.max(4, Math.min(hoveredNode.x - 60, w - 128))
    : 0

  const hoveredMoodY = hoveredMood ? PAD_T + (1 - MOOD_PRESETS[hoveredMood].energy) * chartH : null

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header bar — only in full (non-readOnly) mode */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.3em] text-text-secondary">{t('journey.title')}</span>
            {usedMoods.length > 0 && (
              <div className="flex items-center gap-2">
                {usedMoods.map((mood) => (
                  <div key={mood} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MOOD_PRESETS[mood].color }} />
                    <span className="font-mono text-[10px]" style={{ color: MOOD_PRESETS[mood].color + 'cc' }}>
                      {MOOD_PRESETS[mood].label.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setJourneyAdvanced(!journeyAdvanced)}
            className={`journey-toggle-btn ${journeyAdvanced ? 'journey-toggle-advanced' : 'journey-toggle-simple'}`}
          >
            <span>{journeyAdvanced ? t('journey.simple') : t('journey.advanced')}</span>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* SVG chart */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onClick={closeOnBg}
        >
          {w > 0 && h > 0 && (
            <svg width={w} height={h} className="absolute inset-0">
              {/* Mood guide lines — one per mood, behind everything */}
              {(Object.entries(MOOD_PRESETS) as [Mood, typeof MOOD_PRESETS[Mood]][]).map(([mood, p]) => {
                const y = PAD_T + (1 - p.energy) * chartH
                return (
                  <line key={mood} x1={PAD_L} y1={y} x2={w - PAD_R} y2={y}
                    stroke="#282420" strokeWidth="1" strokeDasharray="1 9" opacity="0.55" />
                )
              })}

              {/* Grid lines */}
              <line x1={PAD_L} y1={PAD_T} x2={w - PAD_R} y2={PAD_T} stroke="#282420" strokeWidth="1" />
              <line x1={PAD_L} y1={PAD_T + chartH / 2} x2={w - PAD_R} y2={PAD_T + chartH / 2} stroke="#3a3530" strokeWidth="1" strokeDasharray="3 5" />
              <line x1={PAD_L} y1={PAD_T + chartH} x2={w - PAD_R} y2={PAD_T + chartH} stroke="#282420" strokeWidth="1" />

              {/* Mood Y-axis circles */}
              {(Object.entries(MOOD_PRESETS) as [Mood, typeof MOOD_PRESETS[Mood]][]).map(([mood, p]) => {
                const y = PAD_T + (1 - p.energy) * chartH
                const isHov = hoveredMood === mood
                return (
                  <circle
                    key={mood}
                    cx={PAD_L - 10} cy={y} r={isHov ? 4.5 : 3}
                    fill={p.color}
                    opacity={isHov ? 1 : 0.65}
                    style={{ cursor: 'default', transition: 'r 0.1s, opacity 0.1s' }}
                    onMouseEnter={() => setHoveredMood(mood)}
                    onMouseLeave={() => setHoveredMood(null)}
                  />
                )
              })}

              {/* Y-axis labels */}
              <text x={PAD_L - 6} y={PAD_T + 3} fill="#504840" fontSize="9" textAnchor="end" fontFamily="monospace">HI</text>
              <text x={PAD_L - 6} y={PAD_T + chartH / 2 + 3} fill="#504840" fontSize="9" textAnchor="end" fontFamily="monospace">MID</text>
              <text x={PAD_L - 6} y={PAD_T + chartH + 3} fill="#504840" fontSize="9" textAnchor="end" fontFamily="monospace">LO</text>

              {/* Side divider */}
              {dividerX !== null && (
                <g>
                  <line x1={dividerX} y1={0} x2={dividerX} y2={h} stroke="#5a504a" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={dividerX - 8} y={PAD_T + 13} fill={SIDE_A_COLOR} fontSize="11" fontWeight="bold" textAnchor="end" fontFamily="monospace" letterSpacing="2">SIDE A</text>
                  <text x={dividerX + 8} y={PAD_T + 13} fill={SIDE_B_COLOR} fontSize="11" fontWeight="bold" textAnchor="start" fontFamily="monospace" letterSpacing="2">SIDE B</text>
                </g>
              )}

              {/* Connecting curve */}
              {nodes.length > 1 && (
                <path d={smoothCurve(nodes)} fill="none" stroke="#7a6a5a" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              )}

              {/* Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedId === node.id
                const isHovered = hoveredId === node.id
                const sideColor = node.side === 'A' ? SIDE_A_COLOR : SIDE_B_COLOR
                const labelColor = node.mood ? node.color + 'cc' : (node.side === 'A' ? SIDE_A_COLOR + '88' : SIDE_B_COLOR + '88')
                return (
                  <g
                    key={node.id}
                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (readOnly) return
                      e.stopPropagation()
                      setSelectedId(selectedId === node.id ? null : node.id)
                    }}
                    onMouseEnter={(e) => { e.stopPropagation(); setHoveredId(node.id) }}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {(isSelected || isHovered) && (
                      <circle cx={node.x} cy={node.y} r={NODE_R + 6} fill="none" stroke={node.mood ? node.color : sideColor} strokeWidth="1" opacity={0.35} />
                    )}
                    <circle
                      cx={node.x} cy={node.y} r={NODE_R}
                      fill={node.color}
                      stroke={isSelected || isHovered ? '#e8e4dd' : '#1a1512'}
                      strokeWidth={isSelected || isHovered ? 1.5 : 1}
                      opacity={node.mood ? 1 : 0.5}
                    />
                    {/* Track number */}
                    <text
                      x={node.x} y={node.y + NODE_R + 14}
                      fill={labelColor}
                      fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace"
                    >
                      {node.trackNum}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}

          {/* Mood circle tooltip */}
          {hoveredMood && hoveredMoodY !== null && (
            <div
              className="absolute z-30 pointer-events-none"
              style={{ left: PAD_L - 8, top: hoveredMoodY + 8 }}
            >
              <div style={{
                background: '#0f0f0f',
                border: `1px solid ${MOOD_PRESETS[hoveredMood].color}60`,
                borderRadius: 3,
                padding: '3px 7px',
              }}>
                <p className="font-mono text-[10px] whitespace-nowrap" style={{ color: MOOD_PRESETS[hoveredMood].color }}>
                  {MOOD_PRESETS[hoveredMood].label}
                </p>
              </div>
            </div>
          )}

          {/* Hover tooltip */}
          {hoveredNode && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: tooltipLeft,
                top: tooltipAbove
                  ? Math.max(2, hoveredNode.y - 38)
                  : hoveredNode.y + NODE_R + 10,
                minWidth: 120,
                maxWidth: 200,
              }}
            >
              <div style={{
                background: '#0f0f0f',
                border: `1px solid ${hoveredNode.mood ? MOOD_PRESETS[hoveredNode.mood].color + '60' : '#2a2520'}`,
                borderRadius: 3,
                padding: '4px 8px',
              }}>
                <p className="font-mono text-[11px] text-text-primary truncate">{hoveredNode.title}</p>
                {hoveredNode.mood && (
                  <p className="font-mono text-[9px] mt-0.5" style={{ color: MOOD_PRESETS[hoveredNode.mood].color }}>
                    {MOOD_PRESETS[hoveredNode.mood].label.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Simple mood picker popup — only in non-readOnly mode */}
          {selectedNode && !journeyAdvanced && !readOnly && (
            <div
              className="absolute z-10 rounded p-2.5"
              style={{
                left: Math.max(4, Math.min(selectedNode.x - 110, w - 228)),
                top: pickerAbove ? Math.max(2, selectedNode.y - 192) : selectedNode.y + NODE_R + 8,
                width: 220,
                background: '#111',
                border: '1px solid #2a2520',
                boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-mono text-[9px] tracking-[0.25em] mb-2 uppercase" style={{ color: '#504840' }}>
                {selectedNode.mood ? MOOD_PRESETS[selectedNode.mood].label : t('journey.setMood')}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(MOOD_PRESETS) as [Mood, (typeof MOOD_PRESETS)[Mood]][]).map(([mood, p]) => {
                  const isActive = selectedNode.mood === mood
                  return (
                    <button
                      key={mood}
                      style={{
                        backgroundColor: isActive ? p.color + '30' : p.color + '15',
                        border: `1px solid ${isActive ? p.color : p.color + 'aa'}`,
                        color: isActive ? '#f0ece6' : p.color,
                      }}
                      className="h-8 rounded text-[11px] font-mono tracking-wide hover:opacity-90 transition-opacity px-2 text-left"
                      onClick={() => { setTrackEmotion(selectedNode.id, mood); setSelectedId(null) }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Advanced panel — only in non-readOnly + advanced mode */}
        {!readOnly && journeyAdvanced && (
          <div className="w-48 flex-shrink-0 border-l border-border overflow-hidden">
            {selectedTrack ? (
              <AdvancedPanel track={selectedTrack} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="font-mono text-[10px] text-text-secondary text-center px-3 opacity-50">
                  {t('journey.clickNode')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
