import { useRef, useEffect, useState } from 'react'
import type { CdStyle, CdFont } from '../../types'

const FONT_MAP: Record<CdFont, string> = {
  futurista: 'Michroma, monospace',
  simple:    'Inter, sans-serif',
  elegante:  'Cinzel, serif',
  handmade:  '"Permanent Marker", cursive',
}

const SPIN_DURATION = 7000

interface CdSpinCardProps {
  frontUrl: string
  backUrl: string
  cdStyle?: CdStyle
  customImageUrl?: string
  title?: string
  artist?: string
  cdTextColor?: string
  cdFont?: CdFont
  cdFontSize?: number
  paused?: boolean
  size?: number
}

function getFrontBg(style: CdStyle): React.CSSProperties {
  switch (style) {
    case 'rainbow': return {
      background: [
        'conic-gradient(from 220deg, oklch(0.85 0.05 30) 0deg, oklch(0.88 0.06 90) 60deg, oklch(0.86 0.08 180) 120deg, oklch(0.84 0.09 260) 180deg, oklch(0.88 0.07 320) 240deg, oklch(0.86 0.05 30) 360deg)',
        'radial-gradient(circle at 50% 50%, oklch(0.95 0.01 250), oklch(0.7 0.01 250) 70%)',
      ].join(', '),
      backgroundBlendMode: 'overlay',
    }
    case 'vinyl': return {
      background: 'repeating-radial-gradient(circle at center, #060404 0px, #2e1e1e 1px, #060404 2px, #261616 3.5px, #060404 5px)',
    }
    case 'white': return {
      background: [
        'conic-gradient(from 180deg, #ffffff 0deg, #edf0f2 90deg, #f5f5f7 180deg, #e8ecef 270deg, #ffffff 360deg)',
        'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), transparent 60%)',
      ].join(', '),
      backgroundBlendMode: 'overlay',
    }
    case 'dark-gray': return {
      background: [
        'conic-gradient(from 180deg, #4b5563 0deg, #2d3748 90deg, #374151 180deg, #252f3e 270deg, #4b5563 360deg)',
        'radial-gradient(circle at 35% 30%, rgba(100,120,140,0.5), transparent 60%)',
      ].join(', '),
      backgroundBlendMode: 'overlay',
    }
    case 'purple': return {
      background: [
        'conic-gradient(from 220deg, oklch(0.60 0.20 300) 0deg, oklch(0.65 0.18 260) 60deg, oklch(0.55 0.25 330) 120deg, oklch(0.50 0.28 290) 180deg, oklch(0.60 0.22 250) 240deg, oklch(0.65 0.20 310) 300deg, oklch(0.60 0.20 300) 360deg)',
        'radial-gradient(circle at 50% 50%, oklch(0.75 0.10 300), oklch(0.45 0.20 270) 70%)',
      ].join(', '),
      backgroundBlendMode: 'overlay',
    }
    default: return {}
  }
}

function getDefaultTextColor(style: CdStyle): string {
  if (style === 'white' || style === 'rainbow') return '#1a1208'
  return '#f0ede8'
}

export function CdSpinCard({
  frontUrl,
  backUrl,
  cdStyle = 'cd-r',
  customImageUrl,
  title,
  artist,
  cdTextColor,
  cdFont = 'futurista',
  cdFontSize = 1,
  paused = false,
  size = 200,
}: CdSpinCardProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)
  const [hovered, setHovered] = useState(false)
  const [shine, setShine] = useState({ x: 50, y: 50 })

  function startSpin(startAngle = 0) {
    if (!innerRef.current) return
    innerRef.current.style.transform = ''
    animRef.current?.cancel()
    animRef.current = innerRef.current.animate(
      [
        { transform: `rotateY(${startAngle}deg)` },
        { transform: `rotateY(${startAngle + 360}deg)` },
      ],
      { duration: SPIN_DURATION, iterations: Infinity, easing: 'linear' }
    )
  }

  function snapToFront() {
    const anim = animRef.current
    if (!innerRef.current) return
    const elapsed = anim ? ((anim.currentTime as number) % SPIN_DURATION + SPIN_DURATION) % SPIN_DURATION : 0
    const currentAngle = anim ? (elapsed / SPIN_DURATION) * 360 : 0
    const remaining = (360 - (currentAngle % 360)) % 360
    const snapDeg = remaining < 5 ? remaining + 360 : remaining
    anim?.cancel()
    const snapDuration = Math.max(150, (snapDeg / 360) * 600)
    const snap = innerRef.current.animate(
      [
        { transform: `rotateY(${currentAngle}deg)` },
        { transform: `rotateY(${currentAngle + snapDeg}deg)` },
      ],
      { duration: snapDuration, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    )
    animRef.current = snap
    snap.onfinish = () => {
      if (innerRef.current) innerRef.current.style.transform = 'rotateY(0deg)'
    }
  }

  useEffect(() => {
    startSpin()
    return () => animRef.current?.cancel()
  }, [])

  // React to external paused control
  useEffect(() => {
    if (paused) {
      snapToFront()
    } else {
      if (!hovered) startSpin(0)
    }
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMouseEnter() {
    setHovered(true)
    if (paused) return  // already at front, just show iridescence
    snapToFront()
  }

  function getVisualRotateY(el: HTMLElement): number {
    const t = getComputedStyle(el).transform
    if (!t || t === 'none') return 0
    const m = new DOMMatrix(t)
    const deg = Math.atan2(m.m13, m.m11) * (180 / Math.PI)
    return ((deg % 360) + 360) % 360
  }

  function handleMouseLeave() {
    setHovered(false)
    setShine({ x: 50, y: 50 })
    if (paused) return  // keep at front, don't restart spin
    if (!innerRef.current) return
    const anim = animRef.current
    if (anim && anim.playState === 'running') {
      const angle = getVisualRotateY(innerRef.current)
      anim.cancel()
      innerRef.current.style.transform = ''
      startSpin(angle)
    } else {
      anim?.cancel()
      innerRef.current.style.transform = ''
      startSpin(0)
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!hovered) return
    const rect = e.currentTarget.getBoundingClientRect()
    setShine({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  // CD-R iridescence overlay
  const cdRotation = shine.x * 2.5
  const shineStyle: React.CSSProperties = hovered
    ? {
        background: [
          `conic-gradient(from ${cdRotation}deg at 50% 50%, rgba(255,60,60,0.28), rgba(255,160,0,0.22), rgba(255,255,60,0.22), rgba(60,220,80,0.22), rgba(60,160,255,0.28), rgba(160,60,255,0.22), rgba(255,60,180,0.22), rgba(255,60,60,0.28))`,
          `radial-gradient(circle at 50% 50%, transparent 10%, rgba(0,0,0,0.08) 18%, transparent 38%)`,
        ].join(', '),
        mixBlendMode: 'screen',
        opacity: 0.8,
        transition: 'opacity 0.3s',
      }
    : {
        background: `conic-gradient(from 30deg at 50% 50%, rgba(255,60,60,0.09), rgba(255,160,0,0.07), rgba(255,255,60,0.07), rgba(60,220,80,0.07), rgba(60,160,255,0.09), rgba(160,60,255,0.07), rgba(255,60,180,0.07), rgba(255,60,60,0.09))`,
        mixBlendMode: 'screen',
        opacity: 0.5,
        transition: 'opacity 0.6s ease, background 0.6s ease',
      }

  const isCdR = cdStyle === 'cd-r'
  const isCustomImage = cdStyle === 'custom-image'
  const isGradientStyle = !isCdR && !isCustomImage
  const textColor = cdTextColor || getDefaultTextColor(cdStyle)
  const isVinyl = cdStyle === 'vinyl'
  const fontFamily = FONT_MAP[cdFont]

  return (
    <div
      className="card-3d"
      style={{ width: size, height: size, cursor: 'default', flexShrink: 0, transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <div
        ref={innerRef}
        className="card-inner"
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {/* ── Front face ── */}
        <div
          className="card-face card-front"
          style={{ position: 'absolute', inset: 5, borderRadius: '50%', overflow: 'hidden', ...(!isCdR && !isCustomImage ? getFrontBg(cdStyle) : {}) }}
        >
          {/* Background image (cd-r or custom-image) */}
          {(isCdR || isCustomImage) && (
            <img
              src={isCdR ? frontUrl : (customImageUrl ?? frontUrl)}
              alt="front"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              draggable={false}
            />
          )}

          {/* Vinyl center label */}
          {isVinyl && (
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: '42%', height: '42%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #c8a96e, #8b6a2e)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '8%',
              gap: 2,
            }}>
              {title && (
                <p style={{ fontSize: Math.max(6, size * 0.035) * cdFontSize, textTransform: 'uppercase', textAlign: 'center', color: textColor, lineHeight: 1.2, fontFamily, overflow: 'hidden', maxWidth: '100%', wordBreak: 'break-word' }}>
                  {title.slice(0, 16)}
                </p>
              )}
              {artist && (
                <p style={{ fontSize: Math.max(5, size * 0.028) * cdFontSize, textTransform: 'uppercase', textAlign: 'center', color: textColor, opacity: 0.75, lineHeight: 1.2, fontFamily, overflow: 'hidden', maxWidth: '100%' }}>
                  {artist.slice(0, 14)}
                </p>
              )}
            </div>
          )}

          {/* Text label for all styles except custom-image and vinyl */}
          {!isCustomImage && !isVinyl && (
            <>
              {artist && (
                <p style={{
                  position: 'absolute', left: '50%', top: isCdR ? '18%' : '30%',
                  transform: 'translate(-50%, -50%)',
                  width: '60%', textAlign: 'center',
                  fontSize: Math.max(6, size * 0.03) * cdFontSize, textTransform: 'uppercase',
                  color: textColor, opacity: 0.8, lineHeight: 1.3,
                  fontFamily,
                  pointerEvents: 'none', wordBreak: 'break-word',
                }}>
                  {artist.slice(0, 24)}
                </p>
              )}
              {title && (
                <p style={{
                  position: 'absolute', left: '50%', top: isCdR ? '82%' : '70%',
                  transform: 'translate(-50%, -50%)',
                  width: '60%', textAlign: 'center',
                  fontSize: Math.max(7, size * 0.038) * cdFontSize, textTransform: 'uppercase',
                  color: textColor, lineHeight: 1.3,
                  fontFamily,
                  pointerEvents: 'none', wordBreak: 'break-word',
                }}>
                  {title.slice(0, 28)}
                </p>
              )}
            </>
          )}

          {/* CD-R iridescence overlay */}
          {isCdR && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', ...shineStyle }} />
          )}

          {/* Center hole */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '13%', height: '13%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2a2a2a 0%, #0d0d0d 70%)',
            zIndex: 20,
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Back face ── */}
        <div className="card-face card-back" style={{ position: 'absolute', inset: 5, borderRadius: '50%', overflow: 'hidden' }}>
          <img
            src={backUrl}
            alt="back"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
          {/* Center hole */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '13%', height: '13%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2a2a2a 0%, #0d0d0d 70%)',
            zIndex: 20,
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
