import { ProjectIndexEntry } from '../../types'
import { formatTime } from '../../utils/duration'

interface JewelCaseCardProps {
  entry: ProjectIndexEntry
  onClick: () => void
  isActive?: boolean
}

export function JewelCaseCard({ entry, onClick, isActive }: JewelCaseCardProps) {
  const artworkSrc = entry.artworkPath ? `file://${entry.artworkPath}` : null

  return (
    <div
      className="cd-container"
      onClick={onClick}
      style={{ outline: isActive ? '2px solid #ff4d00' : 'none', outlineOffset: 8, borderRadius: 4 }}
    >
      <div className="jewel-case-wrapper">
        {/* Disc */}
        <div
          className="disc"
          style={{ backgroundImage: artworkSrc ? `url('${artworkSrc.replace(/'/g, "\\'")}')` : undefined }}
        >
          <div className="disc-hole" />
        </div>

        {/* Case */}
        <div className="case">
          <div className="case-top" />
          <div className="case-side" />
          <div className="case-front">
            <div className="spine" />
            <div className="cover-wrapper">
              {artworkSrc ? (
                <img src={artworkSrc} alt="Cover" className="cover-img" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.2 }}>
                    <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="1" />
                    <circle cx="16" cy="16" r="4" stroke="white" strokeWidth="1" />
                    <circle cx="16" cy="16" r="1.5" fill="white" />
                  </svg>
                </div>
              )}
              <div className="plastic-glare" />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="jewel-info">
        {entry.artist && <p className="jewel-artist">{entry.artist}</p>}
        <p className="jewel-album">{entry.name}</p>
        {entry.totalDuration > 0 && (
          <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: 4 }}>
            {formatTime(entry.totalDuration)}
          </p>
        )}
      </div>
    </div>
  )
}
