import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { formatTime } from '../../utils/duration'
import { connectAudio, resumeContext } from '../../utils/audioAnalyser'

const PRIMARY = '#ff4d00'

function toAudioUrl(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  const encoded = parts.map((p, i) =>
    i === 0 && /^[A-Za-z]:$/.test(p) ? p : encodeURIComponent(p)
  ).join('/')
  return `file:///${encoded}`
}

function TransportButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} className="transport-btn"
      style={{
        flex: 1, height: 48,
        background: active ? 'linear-gradient(to bottom, #1a0800, #1d0a00)' : 'linear-gradient(to bottom, #3a3a3a, #272626)',
        borderTop: active ? 'none' : '1px solid #555',
        borderLeft: '1px solid rgba(255,255,255,0.04)',
        borderRight: '1px solid rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(0,0,0,0.5)',
        boxShadow: active ? '0px 6px 4px 0px rgba(0,0,0,0.2), inset 0 0 12px rgba(255,120,50,0.08)' : '0px 10px 5px 0px rgba(0,0,0,0.3)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.08s linear', position: 'relative', overflow: 'hidden', minWidth: 0
      }}
    >
      {active && (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 10%, rgba(255,100,30,0.06), transparent 90%)`, pointerEvents: 'none' }} />
      )}
      <span style={{ color: active ? PRIMARY : '#888', textShadow: active ? `0 0 10px ${PRIMARY}` : '0 1px 2px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.08s linear', position: 'relative', zIndex: 1 }}>
        {icon}
      </span>
    </button>
  )
}

export function MusicPlayer() {
  const { project, playerTrackId, setPlayerTrack } = useProjectStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => { if (audioRef.current) connectAudio(audioRef.current) }, [])

  const tracks = project ? [...project.tracks].sort((a, b) => a.side.localeCompare(b.side) || a.order - b.order) : []
  const currentTrack = tracks.find((t) => t.id === playerTrackId) ?? null
  const currentIdx = currentTrack ? tracks.findIndex((t) => t.id === playerTrackId) : -1

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentTrack?.path) {
      audio.pause(); audio.src = ''
      setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0)
      return
    }
    audio.src = toAudioUrl(currentTrack.path)
    audio.load()
    setProgress(0); setCurrentTime(0); setDuration(0)
    setIsPlaying(true)
    audio.play().catch(() => setIsPlaying(false))
  }, [playerTrackId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying && audio.paused) audio.play().catch(() => setIsPlaying(false))
    else if (!isPlaying && !audio.paused) audio.pause()
  }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => { resumeContext(); setIsPlaying((p) => !p) }
  const handleStop = () => { setIsPlaying(false); const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0 }; setProgress(0); setCurrentTime(0) }
  const handlePrev = () => { if (currentIdx > 0) setPlayerTrack(tracks[currentIdx - 1].id) }
  const handleNext = () => { if (currentIdx >= 0 && currentIdx < tracks.length - 1) setPlayerTrack(tracks[currentIdx + 1].id) }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const handleEnded = () => {
    if (currentIdx >= 0 && currentIdx < tracks.length - 1) setPlayerTrack(tracks[currentIdx + 1].id)
    else { setIsPlaying(false); setProgress(0); setCurrentTime(0) }
  }

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden" style={{ minWidth: 0 }}>
      <audio
        ref={audioRef}
        onTimeUpdate={() => { const a = audioRef.current; if (!a?.duration) return; setCurrentTime(a.currentTime); setDuration(a.duration); setProgress(a.currentTime / a.duration) }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration) }}
        onEnded={handleEnded}
      />

      {/* Track info */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/40">
        {currentTrack ? (
          <>
            <p className="font-mono text-[14px] text-text-primary truncate leading-snug">{currentTrack.title}</p>
            <p className="font-mono text-[12px] truncate mt-0.5" style={{ color: PRIMARY }}>{currentTrack.artist}</p>
          </>
        ) : (
          <p className="font-mono text-[13px] text-text-secondary opacity-40">click a track to preview</p>
        )}
        <p className="font-mono text-[11px] text-text-secondary mt-1.5 opacity-50 tabular-nums">
          {currentIdx >= 0 ? `${currentIdx + 1} / ${tracks.length}` : `- / ${tracks.length}`}
        </p>
      </div>

      {/* Transport */}
      <div className="flex flex-shrink-0" style={{ background: '#050505', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
        <TransportButton label="Previous" onClick={handlePrev} icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="2" height="10" rx="0.5" /><path d="M12 2L4 7l8 5V2z" /></svg>} />
        <TransportButton label={isPlaying ? 'Pause' : 'Play'} active={isPlaying} onClick={handlePlay}
          icon={isPlaying
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1" /><rect x="8" y="2" width="4" height="10" rx="1" /></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2l10 5-10 5V2z" /></svg>}
        />
        <TransportButton label="Stop" onClick={handleStop} icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1" width="10" height="10" rx="1.5" /></svg>} />
        <TransportButton label="Next" onClick={handleNext} icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="11" y="2" width="2" height="10" rx="0.5" /><path d="M2 2l8 5-8 5V2z" /></svg>} />
      </div>

      {/* Progress bar */}
      <div className="px-4 py-4 flex-shrink-0">
        <div className="relative h-1.5 rounded-full cursor-pointer overflow-hidden"
          style={{ background: '#1a1a1a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
          onClick={handleSeek}
        >
          <div className="absolute left-0 top-0 h-full rounded-full transition-none"
            style={{ width: `${progress * 100}%`, background: `linear-gradient(to right, #8b2000, ${PRIMARY})` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[11px] text-text-secondary tabular-nums">{formatTime(currentTime)}</span>
          <span className="font-mono text-[11px] text-text-secondary tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
