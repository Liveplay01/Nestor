import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { FileType } from '@shared/types'
import { useStore } from '../store/useStore'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

const TYPE_LABELS: Record<FileType, string> = {
  pdf: 'PDF',
  doc: 'Dokumente',
  xls: 'Tabellen',
  ppt: 'Präsentationen',
  img: 'Bilder',
  other: 'Sonstiges',
  folder: 'Ordner'
}

const TYPE_COLORS: Record<FileType, string> = {
  pdf: '#F97316',
  doc: '#3B82F6',
  xls: '#22C55E',
  ppt: '#EF4444',
  img: '#8B5CF6',
  other: '#9CA3AF',
  folder: '#6B7280'
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }): React.JSX.Element {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="w-32 h-32 rounded-full border border-border" style={{ background: 'var(--color-surface)' }} />

  let currentAngle = -Math.PI / 2
  const segments = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI
    const start = currentAngle
    currentAngle += angle
    return { ...d, start, end: currentAngle, angle }
  })

  const SIZE = 128
  const R = 50
  const CX = SIZE / 2
  const CY = SIZE / 2

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  function describeArc(start: number, end: number): string {
    const s = polarToCartesian(CX, CY, R, start)
    const e = polarToCartesian(CX, CY, R, end)
    const largeArc = end - start > Math.PI ? 1 : 0
    return `M ${CX} ${CY} L ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y} Z`
  }

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {segments.map((seg, i) => (
        seg.angle > 0.01 ? (
          <path
            key={i}
            d={describeArc(seg.start, seg.end)}
            fill={seg.color}
            opacity={0.9}
          />
        ) : null
      ))}
      {/* Center hole */}
      <circle cx={CX} cy={CY} r={R * 0.55} fill="var(--color-bg)" />
    </svg>
  )
}

interface Props {
  onClose: () => void
  onOpenChat: (prompt: string) => void
}

export default function InsightsDashboard({ onClose, onOpenChat }: Props): React.JSX.Element {
  const { settings } = useStore()
  const [stats, setStats] = useState<Awaited<ReturnType<typeof window.nestor.fs.analyzeFolder>>>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'large' | 'old'>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.nestor.fs.analyzeFolder()
      setStats(result)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pieData = stats?.byType.map(b => ({
    label: TYPE_LABELS[b.type] ?? b.type,
    value: b.size,
    color: TYPE_COLORS[b.type] ?? '#9CA3AF'
  })) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col rounded-2xl border border-border-strong shadow-window overflow-hidden"
        style={{ background: 'var(--color-bg)', width: 660, maxHeight: '82vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-none">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Ordner-Analyse</h2>
            <p className="text-[12.5px] text-text-faint mt-0.5 truncate max-w-[400px]">{settings?.rootFolder ?? ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              title="Neu laden"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-surface text-text-hint btn-press"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-surface text-text-hint"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-border rounded-full border-t-[var(--color-accent)] animate-spin" />
          </div>
        ) : !stats ? (
          <div className="flex-1 flex items-center justify-center text-text-faint text-[13px]">
            Kein Ordner ausgewählt
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Summary stats */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { label: 'Dateien', value: stats.totalFiles.toLocaleString('de-DE') },
                { label: 'Ordner', value: stats.totalFolders.toLocaleString('de-DE') },
                { label: 'Gesamtgröße', value: formatSize(stats.totalSize) }
              ].map(s => (
                <div key={s.label} className="px-6 py-4 text-center" style={{ background: 'var(--color-surface)' }}>
                  <div className="text-[20px] font-semibold text-text-primary">{s.value}</div>
                  <div className="text-[12px] text-text-faint mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-6" style={{ background: 'var(--color-surface)' }}>
              {(['overview', 'large', 'old'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-3 text-[13px] font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: tab === t ? 'var(--color-accent)' : 'transparent',
                    color: tab === t ? 'var(--color-accent)' : 'var(--color-text-faint)'
                  }}
                >
                  {t === 'overview' ? 'Übersicht' : t === 'large' ? 'Größte Dateien' : 'Alte Dateien'}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {tab === 'overview' && (
              <div className="px-6 py-5">
                {stats.byType.length === 0 ? (
                  <p className="text-[13px] text-text-faint py-4 text-center">Keine Dateien gefunden</p>
                ) : (
                  <div className="flex gap-6 items-start">
                    <div className="flex-none">
                      <PieChart data={pieData} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 mt-2">
                      {stats.byType.map(b => {
                        const pct = stats.totalSize > 0 ? Math.round((b.size / stats.totalSize) * 100) : 0
                        const color = TYPE_COLORS[b.type] ?? '#9CA3AF'
                        return (
                          <div key={b.type} className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: color }} />
                            <span className="text-[13px] text-text-secondary flex-1">{TYPE_LABELS[b.type] ?? b.type}</span>
                            <span className="text-[12px] text-text-faint">{b.count} Dateien</span>
                            <span className="text-[12px] text-text-hint w-12 text-right">{formatSize(b.size)}</span>
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                              <div className="h-full rounded-full" style={{ background: color, width: `${pct}%` }} />
                            </div>
                            <span className="text-[11.5px] text-text-hint w-7 text-right">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {stats.oldFiles.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl border border-border" style={{ background: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">{stats.oldFiles.length} Dateien älter als 1 Jahr</p>
                        <p className="text-[12px] text-text-faint mt-0.5">Könnten archiviert oder gelöscht werden</p>
                      </div>
                      <button
                        onClick={() => onOpenChat(`Ich habe ${stats.oldFiles.length} Dateien die älter als ein Jahr sind und vermutlich nicht mehr benötigt werden. Zeige mir die Liste und hilf mir, sie zu archivieren oder zu löschen.`)}
                        className="text-[12.5px] font-medium transition-opacity hover:opacity-70 flex-none btn-press"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        KI fragen →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Largest files */}
            {tab === 'large' && (
              <div className="divide-y divide-border">
                {stats.largestFiles.length === 0 ? (
                  <p className="text-[13px] text-text-faint py-8 text-center">Keine Dateien</p>
                ) : stats.largestFiles.map((f, i) => (
                  <div key={f.path} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface group">
                    <span className="text-[12px] font-semibold text-text-hint w-5 flex-none text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-text-primary truncate">{basename(f.path)}</p>
                      <p className="text-[11.5px] text-text-faint mt-0.5 truncate">{f.path}</p>
                    </div>
                    <div className="text-right flex-none">
                      <p className="text-[13px] font-semibold text-text-primary">{formatSize(f.size)}</p>
                      <p className="text-[11.5px] text-text-hint mt-0.5">{formatDate(f.modified)}</p>
                    </div>
                    <button
                      onClick={() => window.nestor.shell.showInFolder(f.path)}
                      title="Im Explorer anzeigen"
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-text-hint btn-press flex-none"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Old files */}
            {tab === 'old' && (
              <div>
                {stats.oldFiles.length === 0 ? (
                  <p className="text-[13px] text-text-faint py-8 text-center">Keine Dateien älter als 1 Jahr gefunden</p>
                ) : (
                  <>
                    <div className="px-6 py-3 border-b border-border flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
                      <span className="text-[12.5px] text-text-faint">{stats.oldFiles.length} Dateien · zuletzt geändert vor über einem Jahr</span>
                      <button
                        onClick={() => onOpenChat(`Ich habe ${stats.oldFiles.length} Dateien die seit über einem Jahr nicht mehr geändert wurden. Hilf mir dabei, diese zu archivieren oder zu löschen.`)}
                        className="text-[12.5px] font-medium btn-press"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Alle mit KI bereinigen →
                      </button>
                    </div>
                    <div className="divide-y divide-border">
                      {stats.oldFiles.map((f, i) => (
                        <div key={f.path} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface group">
                          <span className="text-[12px] font-semibold text-text-hint w-5 flex-none text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-medium text-text-primary truncate">{basename(f.path)}</p>
                            <p className="text-[11.5px] text-text-faint mt-0.5 truncate">{f.path}</p>
                          </div>
                          <div className="text-right flex-none">
                            <p className="text-[12.5px] text-text-muted">{formatSize(f.size)}</p>
                            <p className="text-[11.5px] text-[#DC2626] mt-0.5">{formatDate(f.modified)}</p>
                          </div>
                          <button
                            onClick={() => window.nestor.shell.showInFolder(f.path)}
                            title="Im Explorer anzeigen"
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-text-hint btn-press flex-none"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </motion.div>
    </div>
  )
}
