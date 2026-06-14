import { useEffect, useMemo, useState } from 'react'
import { irisService } from '@renderer/services/Iris-voice-ai'

const Sphere = () => {
  const dataArray = useMemo(() => new Uint8Array(128), [])

  const [volume, setVolume] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!irisService.analyser) {
        setVolume((v) => Math.max(0.05, v * 0.95))
        return
      }

      irisService.analyser.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }

      setVolume(sum / dataArray.length / 128)
    }, 50)

    return () => clearInterval(interval)
  }, [dataArray])

  const scale = 1 + volume * 0.35

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
      {/* Background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
      <div className="absolute w-64 h-64 rounded-full bg-violet-500/20 blur-3xl animate-pulse" />

      {/* Orbit ring */}
      <div
        className="absolute w-72 h-72 rounded-full border border-cyan-400/20"
        style={{
          animation: 'spin 20s linear infinite'
        }}
      />

      {/* Orbit ring 2 */}
      <div
        className="absolute w-56 h-56 rounded-full border border-violet-400/20"
        style={{
          animation: 'spinReverse 12s linear infinite'
        }}
      />

      {/* Main Orb */}
      <div
        className="relative transition-all duration-100"
        style={{
          transform: `scale(${scale})`
        }}
      >
        {/* Outer glow */}
        <div className="absolute inset-0 w-44 h-44 rounded-full bg-cyan-400/30 blur-2xl" />

        {/* Sphere */}
        <div
          className="relative w-44 h-44 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, #ffffff, ${
              volume > 0.4 ? '#ffffff' : '#33db12'
            } 35%, #00f0ff 70%, #001122 100%)`,
            boxShadow: `
              0 0 ${40 + volume * 60}px rgba(0,240,255,0.8),
              0 0 ${80 + volume * 100}px rgba(0,240,255,0.4)
            `
          }}
        >
          {/* Glass layer */}
          <div className="absolute inset-3 rounded-full bg-white/10 backdrop-blur-md" />

          {/* Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full bg-white"
              style={{
                width: `${16 + volume * 16}px`,
                height: `${16 + volume * 16}px`,
                filter: 'blur(3px)'
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

export default Sphere