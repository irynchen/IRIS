import { useEffect, useState } from 'react'
import { useHealthStore } from '../../store/healthStore'
import { HealthRecord } from '../../api/health'
import HistoryCard from './HistoryCard'
import EditRecordModal from './EditRecordModal'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function HistoryList() {
  const { records, isLoading, fetchRecords } = useHealthStore()
  const [editing, setEditing] = useState<HealthRecord | null>(null)

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    fetchRecords(from, to)
  }, [])

  if (isLoading && records.length === 0) return <LoadingSpinner />

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">Noch keine Einträge. Fang heute an!</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {records.map(r => (
          <HistoryCard key={r.date} record={r} onClick={() => setEditing(r)} />
        ))}
      </div>

      {editing && (
        <EditRecordModal record={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
