import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../../utils/audioAnalyser'

const BANDS = [
  { label: '31',   freq: 31.5 },
  { label: '63',   freq: 63 },
  { label: '125',  freq: 125 },
  { label: '190',  freq: 190 },
  { label: '250',  freq: 250 },
  { label: '500',  freq: 500 },
  { label: '1K',   freq: 1000 },
  { label: '2.2K', freq: 2200 },
  { label: '4.5K', freq: 4500 },
  { label: '9K',   freq: 9000 },
  { label: '18K',  freq: 18000 },
]

const PEAK_COLOR = '#e8ffcc'
const PEAK_HOLD_MS = 800
const PEAK_DECAY_PER_SEC = 0.6

interface BandState {
  level: number
  peak: number
  peakHeldUntil: number
}

function freqToBin(freq: number, fftSize: number, sampleRate: number): number {
  return Math.min(Math.round((freq * fftSize) / sampleRate), fftSize / 2 - 1)
}

function initBands(): BandState[] {
  return BANDS.map(() => ({ level: 0, peak: 0, peakHeldUntil: 0 }))
}

export function VUMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bandsRef = useRef<BandState[]>(initBands())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let lastFrame = performance.now()

    const draw = () => {
      const now = performance.now()
      const dt = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now

      const dpr = window.devicePixelRatio || 1
      const W = canvas.width / dpr
      const H = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, W, H)

      const fftResult = getFrequencyData()
      const bands = bandsRef.current

      bands.forEach((band, i) => {
        let target = 0
        if (fftResult) {
          const { data, sampleRate, fftSize } = fftResult
          const bin = freqToBin(BANDS[i].freq, fftSize, sampleRate)
          // peak of neighbors for stability
          const v0 = bin > 0 ? data[bin - 1] : 0
          const v1 = data[bin]
          const v2 = bin < data.length - 1 ? data[bin + 1] : 0
          target = Math.max(v0, v1, v2) / 255
        }

        // Asymmetric smoothing: fast attack, slow decay
        const diff = target - band.level
        band.level += diff * (diff > 0 ? 0.4 : 0.12)
        band.level = Math.max(0, Math.min(1, band.level))

        // Peak hold: keep the marker in place, then decay over real time
        if (band.level > band.peak) {
          band.peak = band.level
          band.peakHeldUntil = now + PEAK_HOLD_MS
        } else if (now >= band.peakHeldUntil) {
          band.peak = Math.max(band.level, band.peak - PEAK_DECAY_PER_SEC * dt)
        }
      })

      const n = bands.length
      const gapX = 3
      const bandW = (W - gapX * (n + 1)) / n
      const segH = 3
      const segGap = 1
      const segTotal = segH + segGap
      const topPad = 6
      const botPad = 13
      const chartH = H - topPad - botPad
      const totalSegs = Math.floor(chartH / segTotal)

      bands.forEach((band, i) => {
        const x = gapX + i * (bandW + gapX)
        const filledSegs = Math.round(band.level * totalSegs)
        const peakSeg = Math.round(band.peak * totalSegs)

        for (let s = 0; s < totalSegs; s++) {
          const sy = topPad + chartH - (s + 1) * segTotal
          const frac = s / totalSegs

          let r: number, g: number, b: number
          if (frac < 0.5) {
            const f = frac / 0.5
            r = Math.round(0x4a + (0xa3 - 0x4a) * f)
            g = Math.round(0x8a + (0xd9 - 0x8a) * f)
            b = Math.round(0x20 + (0x6a - 0x20) * f)
          } else {
            const f = (frac - 0.5) / 0.5
            r = Math.round(0xa3 + (0xd2 - 0xa3) * f)
            g = Math.round(0xd9 + (0xf1 - 0xd9) * f)
            b = Math.round(0x6a + (0xa3 - 0x6a) * f)
          }

          if (s < filledSegs) {
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(x, sy, bandW, segH)
            if (frac > 0.6) {
              ctx.save()
              ctx.shadowColor = `rgba(163,217,106,${0.3 + frac * 0.5})`
              ctx.shadowBlur = 4
              ctx.fillRect(x, sy, bandW, segH)
              ctx.restore()
            }
          } else {
            ctx.fillStyle = `rgba(${r},${g},${b},0.07)`
            ctx.fillRect(x, sy, bandW, segH)
          }
        }

        if (peakSeg > 0 && peakSeg <= totalSegs) {
          const peakY = topPad + chartH - peakSeg * segTotal
          ctx.save()
          ctx.shadowColor = 'rgba(210,241,163,0.9)'
          ctx.shadowBlur = 6
          ctx.fillStyle = PEAK_COLOR
          ctx.fillRect(x, peakY, bandW, segH)
          ctx.restore()
        }

        ctx.fillStyle = '#2a3a1a'
        ctx.font = '6px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(BANDS[i].label, x + bandW / 2, H - 2)
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      style={{
        background: '#050505',
        borderTop: '1px solid #111',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)',
        padding: '4px 6px 2px',
      }}
      className="w-full h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
        <span style={{ fontFamily: 'monospace', fontSize: '6px', color: '#2a4a15', letterSpacing: '0.2em' }}>
          GRAPHIC EQ
        </span>
        <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#4a8a20', boxShadow: '0 0 4px #a3d96a' }} />
      </div>
      <canvas ref={canvasRef} className="flex-1 w-full block" />
    </div>
  )
}
