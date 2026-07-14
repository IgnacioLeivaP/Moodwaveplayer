import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useI18n } from '../../i18n'
import { getFrequencyData } from '../../utils/audioAnalyser'

export function Header() {
  const { workspace, saveProject, closeProject, loadProjectFromFile } = useProjectStore()
  const { t, locale, availableLocales, setLocale, loadLocaleFile } = useI18n()
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [editMenuOpen, setEditMenuOpen] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const editMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fileMenuOpen && !editMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileMenuOpen(false)
      if (editMenuRef.current && !editMenuRef.current.contains(e.target as Node)) setEditMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fileMenuOpen, editMenuOpen])

  const handleLoadLang = async () => {
    setEditMenuOpen(false)
    await loadLocaleFile()
  }

  return (
    <header
      className="flex items-center justify-between px-5 h-12 border-b flex-shrink-0 relative"
      style={{
        background: 'linear-gradient(to bottom, #161616, #0e0e0e)',
        borderColor: '#ff4d0030',
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        zIndex: 20
      }}
    >
      {/* Left: LED + logo + menus */}
      <div className="flex items-center gap-3 min-w-0">
        <HeaderLed />
        <span
          className="text-[13px] tracking-[0.5em] select-none"
          style={{ fontFamily: 'Michroma, monospace', color: '#ff6020', textShadow: '0 0 12px rgba(255,77,0,0.4)' }}
        >
          MOODWAVE
        </span>
        <span
          className="text-[9px] tracking-[0.4em] select-none opacity-50"
          style={{ fontFamily: 'Michroma, monospace', color: '#ff6020' }}
        >
          PLAYER
        </span>

        {/* FILE menu */}
        <div ref={fileMenuRef} style={{ position: 'relative' }}>
          <PlayerButton onClick={() => { setFileMenuOpen(v => !v); setEditMenuOpen(false) }}>
            {t('menu.file')}
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" style={{ marginLeft: 6 }}>
              <path d="M1 1l2.5 3L6 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </PlayerButton>
          {fileMenuOpen && (
            <DropMenu>
              <MenuItem onClick={() => { setFileMenuOpen(false); loadProjectFromFile() }}>{t('menu.openProject')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => { setFileMenuOpen(false); saveProject() }} disabled={!workspace}>{t('menu.save')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => { setFileMenuOpen(false); closeProject() }} disabled={!workspace}>{t('menu.closeProject')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => { setFileMenuOpen(false); window.api.quitApp() }}>{t('menu.exit')}</MenuItem>
            </DropMenu>
          )}
        </div>

        {/* EDIT menu */}
        <div ref={editMenuRef} style={{ position: 'relative' }}>
          <PlayerButton onClick={() => { setEditMenuOpen(v => !v); setFileMenuOpen(false) }}>
            {t('menu.edit')}
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" style={{ marginLeft: 6 }}>
              <path d="M1 1l2.5 3L6 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </PlayerButton>
          {editMenuOpen && (
            <DropMenu>
              <div style={{ padding: '6px 16px 4px', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: '#444' }}>
                  {t('menu.language')}
                </span>
              </div>
              {availableLocales.map((loc) => (
                <MenuItem key={loc.code} onClick={() => { setLocale(loc.code); setEditMenuOpen(false) }}>
                  <span style={{ display: 'inline-block', width: 14, opacity: locale === loc.code ? 1 : 0 }}>✓</span>
                  {loc.name}
                </MenuItem>
              ))}
              <MenuDivider />
              <MenuItem onClick={handleLoadLang}>{t('menu.loadLang')}</MenuItem>
            </DropMenu>
          )}
        </div>

      </div>

      {/* Right: close project power switch */}
      {workspace && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end gap-[3px]">
            <span className="font-mono text-[10px] tracking-[0.15em] select-none" style={{ color: 'rgba(255,100,30,0.5)' }}>
              {t('header.closeProject')}
            </span>
            <span className="font-mono text-[9px] tracking-[0.06em] select-none" style={{ color: 'rgba(255,100,30,0.25)' }}>
              {t('header.projectSaved')}
            </span>
          </div>
          <PowerSwitch onClose={closeProject} />
        </div>
      )}
    </header>
  )
}

// ─── Header LED ───────────────────────────────────────────────────────────────

function HeaderLed() {
  const ledRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    let lastTime = 0
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (now - lastTime < 33) return
      lastTime = now
      const el = ledRef.current
      if (!el) return
      const freq = getFrequencyData()
      let level = 0
      if (freq) {
        const sum = freq.data.reduce((s, v) => s + v, 0)
        level = sum / freq.data.length / 255
      }
      const nowActive = level > 0.018
      if (nowActive !== wasActiveRef.current) {
        wasActiveRef.current = nowActive
        if (nowActive) { el.classList.remove('is-idle'); el.style.opacity = '1' }
        else { el.classList.add('is-idle'); el.style.removeProperty('box-shadow'); el.style.removeProperty('opacity') }
      }
      if (nowActive) {
        const size = 3 + level * 22
        const spread = Math.max(0, level * 9 - 0.5)
        const alpha = Math.min(1, 0.4 + level * 0.65)
        el.style.boxShadow = `0 0 ${size.toFixed(1)}px ${spread.toFixed(1)}px rgba(180,240,100,${alpha.toFixed(2)}), inset 0 1px 2px rgba(0,0,0,0.4)`
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return <div ref={ledRef} className="header-led is-idle" />
}

// ─── Power switch ─────────────────────────────────────────────────────────────

function PowerSwitch({ onClose }: { onClose: () => void }) {
  const [isOn, setIsOn] = useState(true)
  const [locked, setLocked] = useState(false)
  const handleClick = useCallback(() => {
    if (locked) return
    setLocked(true); setIsOn(false)
    setTimeout(onClose, 1000)
  }, [locked, onClose])
  return (
    <div onClick={handleClick} title="Close project"
      style={{ display: 'block', backgroundColor: 'black', width: 54, height: 28,
        boxShadow: '0 0 4px 1px rgba(0,0,0,0.3), 0 0 0 1px black, inset 0 1px 1px -1px rgba(255,255,255,0.6), inset 0 0 2px 4px #47434c, inset 0 0 2px 7px black',
        borderRadius: 3, padding: 5, perspective: 200, cursor: locked ? 'default' : 'pointer', flexShrink: 0, userSelect: 'none' }}
    >
      <div className="pwr-btn"
        style={{ width: 44, height: 18, transition: 'all 0.3s cubic-bezier(1,0,1,1)', transformOrigin: 'center center -5px',
          transform: `translateZ(5px) rotateX(${isOn ? 25 : -25}deg)`,
          background: 'linear-gradient(#980000 0%, #6f0000 30%, #6f0000 70%, #980000 100%)',
          boxShadow: isOn ? '0 -5px 10px #ff1818' : 'none' }}
      >
        <div className={`pwr-light ${isOn ? 'is-on' : 'is-off'}`} />
        <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: 'radial-gradient(transparent 30%, rgba(101,0,0,0.7) 70%)', backgroundSize: '3px 3px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(white,white) 50% 25%/4% 35%, radial-gradient(circle,transparent 50%,white 52%,white 70%,transparent 72%) 50% 75%/28% 45%', backgroundRepeat: 'no-repeat', pointerEvents: 'none' }} />
        <div style={{ transition: 'opacity 0.3s cubic-bezier(1,0,1,1)', opacity: isOn ? 1 : 0.3, position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(white,transparent 3%) 50% 50%/97% 97%, linear-gradient(rgba(255,255,255,0.5),transparent 50%,transparent 80%,rgba(255,255,255,0.5)) 50% 50%/97% 97%', backgroundRepeat: 'no-repeat', pointerEvents: 'none' }} />
        <div style={{ transition: 'opacity 0.3s cubic-bezier(1,0,1,1)', opacity: isOn ? 0 : 1, position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(transparent 70%, rgba(0,0,0,0.8))', backgroundRepeat: 'no-repeat', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PlayerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center font-mono text-[12px] tracking-[0.2em] px-3 py-1.5 rounded-sm transition-all active:scale-[0.97]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(0,0,0,0.3)', color: '#888', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ccc'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </button>
  )
}

function GreenButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center font-mono text-[11px] tracking-[0.15em] px-3 py-1.5 rounded-sm transition-all active:scale-[0.97]"
      style={{ background: 'linear-gradient(to bottom, #1a3a1a, #0f250f)', border: '1px solid #2a6a2a', borderTop: '1px solid #3a8a3a', color: '#5adf5a', boxShadow: '0 0 6px rgba(80,200,80,0.2), 0 2px 4px rgba(0,0,0,0.4)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(80,220,80,0.35), 0 2px 4px rgba(0,0,0,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#7af07a' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 6px rgba(80,200,80,0.2), 0 2px 4px rgba(0,0,0,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#5adf5a' }}
    >
      {children}
    </button>
  )
}

function DropMenu({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 192, background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.7)', zIndex: 200, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function MenuItem({ onClick, disabled = false, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className="w-full text-left px-4 py-2 font-mono text-[12px] tracking-wider transition-colors"
      style={{ color: disabled ? 'rgba(184,180,174,0.3)' : '#b8b4ae', cursor: disabled ? 'default' : 'pointer', background: 'transparent' }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f5f5f5' } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!disabled) e.currentTarget.style.color = '#b8b4ae' }}
    >
      {children}
    </button>
  )
}

function MenuDivider() { return <div style={{ height: 1, background: '#1a1a1a', margin: '2px 0' }} /> }
