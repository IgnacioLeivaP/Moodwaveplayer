let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let connectedEl: HTMLAudioElement | null = null

export function connectAudio(el: HTMLAudioElement): void {
  if (connectedEl === el && analyser && ctx && ctx.state !== 'closed') return

  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    analyser.connect(ctx.destination)
    connectedEl = null
  }

  if (connectedEl !== el) {
    try {
      const src = ctx.createMediaElementSource(el)
      src.connect(analyser!)
      connectedEl = el
    } catch {
      connectedEl = el
    }
  }
}

export function resumeContext(): void {
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

export function getFrequencyData(): { data: Uint8Array; sampleRate: number; fftSize: number } | null {
  if (!analyser || !ctx) return null
  if (ctx.state === 'suspended') ctx.resume()
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  return { data, sampleRate: ctx.sampleRate, fftSize: analyser.fftSize }
}
