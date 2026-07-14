import { useProjectStore, AppTab } from '../../store/projectStore'
import { useI18n } from '../../i18n'

const PRIMARY = '#ff4d00'

export function TabBar() {
  const { activeTab, setActiveTab } = useProjectStore()
  const { t } = useI18n()

  const tabs: { id: AppTab; label: string }[] = [
    { id: 'playlists', label: t('tabs.playlists') },
    { id: 'metadata',  label: t('tabs.metadata') },
    { id: 'journey',   label: t('tabs.journey') },
  ]

  return (
    <div
      className="flex items-end px-4 flex-shrink-0"
      style={{ height: 38, borderBottom: '1px solid #1e1e1e', background: '#0d0d0d' }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="font-mono text-[10px] tracking-[0.25em] px-4 py-2 transition-colors relative"
            style={{
              color: active ? PRIMARY : 'rgba(255,255,255,0.3)',
              borderBottom: `2px solid ${active ? PRIMARY : 'transparent'}`,
              marginBottom: -1,
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
