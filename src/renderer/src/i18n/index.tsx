import { createContext, useCallback, useContext, useState } from 'react'
import en from '../locales/en'
import es from '../locales/es'

type LocaleData = Record<string, string>
interface LocaleEntry { code: string; name: string; data: LocaleData }
interface I18nCtx {
  locale: string
  availableLocales: { code: string; name: string }[]
  t: (key: string, params?: Record<string, string | number>) => string
  setLocale: (code: string) => void
  loadLocaleFile: () => Promise<boolean>
}

const BUILT_IN: LocaleEntry[] = [
  { code: 'en', name: 'English', data: en as unknown as LocaleData },
  { code: 'es', name: 'Español', data: es as unknown as LocaleData },
]

const STORAGE_LOCALE = 'moodwave_player_locale'
const STORAGE_CUSTOM = 'moodwave_player_custom_locale'

function readCustomFromStorage(): LocaleEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { code: string; name: string; data: LocaleData }
    if (!parsed.code || !parsed.name || !parsed.data) return null
    return parsed
  } catch { return null }
}

const I18nContext = createContext<I18nCtx>({
  locale: 'en', availableLocales: [{ code: 'en', name: 'English' }],
  t: (key) => key, setLocale: () => {}, loadLocaleFile: async () => false,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locales, setLocales] = useState<LocaleEntry[]>(() => {
    const custom = readCustomFromStorage()
    return custom ? [...BUILT_IN, custom] : BUILT_IN
  })
  const [locale, setLocaleState] = useState<string>(() =>
    localStorage.getItem(STORAGE_LOCALE) ?? 'en'
  )
  const setLocale = useCallback((code: string) => {
    setLocaleState(code)
    localStorage.setItem(STORAGE_LOCALE, code)
  }, [])
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const currentData = locales.find((l) => l.code === locale)?.data ?? {}
    const fallbackData = BUILT_IN[0].data
    const raw = currentData[key] ?? fallbackData[key] ?? key
    if (!params) return raw
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)), raw
    )
  }, [locale, locales])
  const loadLocaleFile = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await window.api.openJsonFile()
      if (!raw) return false
      const parsed = JSON.parse(raw) as { _meta?: { code?: string; name?: string } } & LocaleData
      const meta = parsed._meta
      if (!meta?.code || !meta?.name) { window.alert('Invalid language file'); return false }
      const entry: LocaleEntry = { code: meta.code, name: meta.name, data: parsed as LocaleData }
      setLocales((prev) => [...prev.filter((l) => l.code !== meta.code), entry])
      localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(entry))
      setLocale(meta.code)
      return true
    } catch (e) { window.alert(`Error: ${e}`); return false }
  }, [setLocale])

  return (
    <I18nContext.Provider value={{ locale, availableLocales: locales.map((l) => ({ code: l.code, name: l.name })), t, setLocale, loadLocaleFile }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() { return useContext(I18nContext) }
