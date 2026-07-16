import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  shoppingApi, autoCategory, lookupBarcode,
  UNITS, CATEGORIES,
  type ShoppingList, type ShoppingItem,
} from '../api/shopping'

// ── Helpers ───────────────────────────────────────────────────────────────

function formatQty(qty: number | null, unit: string | null): string {
  if (!qty && !unit) return ''
  if (!qty) return unit!
  const q = qty % 1 === 0 ? qty.toString() : qty.toFixed(1)
  return unit ? `${q} ${unit}` : q
}

function groupByCategory(items: ShoppingItem[]): [string, ShoppingItem[]][] {
  const map = new Map<string, ShoppingItem[]>()
  for (const item of items) {
    const cat = item.category || '📦 Sonstiges'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(item)
  }
  return Array.from(map.entries())
}

// ── Barcode Scanner Component ─────────────────────────────────────────────

interface ScannerProps {
  onResult: (barcode: string) => void
  onClose: () => void
}

function BarcodeScanner({ onResult, onClose }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop(): void } | null>(null)
  const doneRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let mounted = true
    const reader = new BrowserMultiFormatReader()

    reader.decodeFromVideoDevice(
      undefined,
      videoRef.current!,
      (result, _err, controls) => {
        if (!mounted) return
        if (!controlsRef.current) {
          controlsRef.current = controls
          setScanning(true)
        }
        if (result && !doneRef.current) {
          doneRef.current = true
          controls.stop()
          onResult(result.getText())
        }
      }
    ).catch((e: Error) => {
      if (!mounted) return
      const msg = e.message?.toLowerCase() ?? ''
      setError(msg.includes('permission') || msg.includes('notallowed')
        ? 'Kamera-Zugriff verweigert — bitte in den Browser-Einstellungen erlauben.'
        : 'Kamera nicht verfügbar.')
    })

    return () => {
      mounted = false
      controlsRef.current?.stop()
    }
  }, [onResult])

  function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (manualCode.trim()) onResult(manualCode.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <span className="text-white font-medium">Barcode scannen</span>
        <button onClick={onClose} className="text-white text-2xl leading-none p-1">✕</button>
      </div>

      {!error && (
        <div className="relative flex-1">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center">
            {scanning ? (
              <div className="border-2 border-white/70 rounded-lg w-64 h-40 relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[var(--color-secondary)] rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[var(--color-secondary)] rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[var(--color-secondary)] rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[var(--color-secondary)] rounded-br" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[var(--color-secondary)]/60 animate-pulse" />
              </div>
            ) : (
              <p className="text-white/60 text-sm">Kamera wird gestartet…</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
          <span className="text-4xl">📷</span>
          <p className="text-white/70 text-center text-sm">{error}</p>
        </div>
      )}

      <div className="px-4 pb-8 pt-3 bg-black/80">
        <p className="text-white/50 text-xs mb-2 text-center">Oder Barcode manuell eingeben:</p>
        <form onSubmit={handleManual} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="z.B. 4005900123456"
            inputMode="numeric"
            className="flex-1 bg-white/10 text-white placeholder:text-white/30 border border-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/60"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="bg-[var(--color-primary)] text-white px-4 rounded-xl text-sm font-medium disabled:opacity-40"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Add Item Form ─────────────────────────────────────────────────────────

interface AddItemFormProps {
  listId: number
  suggestions: string[]
  initialName?: string
  initialCategory?: string
  initialQty?: string
  initialUnit?: string
  onAdd: (item: ShoppingItem) => void
  onClose: () => void
}

function AddItemForm({
  listId, suggestions, initialName = '', initialCategory = '',
  initialQty = '', initialUnit = 'Stück', onAdd, onClose
}: AddItemFormProps) {
  const [name, setName] = useState(initialName)
  const [qty, setQty] = useState(initialQty)
  const [unit, setUnit] = useState(initialUnit)
  const [category, setCategory] = useState(initialCategory || (initialName ? autoCategory(initialName) : ''))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = name.length >= 2
    ? suggestions.filter((s) => s.toLowerCase().includes(name.toLowerCase()) && s !== name).slice(0, 5)
    : []

  function handleNameChange(v: string) {
    setName(v)
    if (!category || category === '📦 Sonstiges') setCategory(autoCategory(v))
    setShowSuggestions(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const item = await shoppingApi.addItem(listId, {
        name: name.trim(),
        quantity: qty ? parseFloat(qty) : null,
        unit: unit || null,
        category: category || autoCategory(name),
      })
      onAdd(item)
      setName(''); setQty(''); setUnit('Stück'); setCategory('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-[var(--color-surface)] border-t border-[var(--color-muted)] p-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="relative">
        <input
          autoFocus
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Artikel hinzufügen…"
          className="w-full border border-[var(--color-muted)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {showSuggestions && filtered.length > 0 && (
          <ul className="absolute left-0 right-0 bottom-full mb-1 bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-xl shadow-lg overflow-hidden z-20">
            {filtered.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={() => { setName(s); setCategory(autoCategory(s)); setShowSuggestions(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-muted)] transition-colors"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Menge"
          className="w-24 border border-[var(--color-muted)] rounded-xl px-3 py-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="flex-1 border border-[var(--color-muted)] rounded-xl px-3 py-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 border border-[var(--color-muted)] rounded-xl px-3 py-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Kategorie…</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm border border-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="flex-1 py-2.5 rounded-xl text-sm bg-[var(--color-primary)] text-white font-medium disabled:opacity-40 transition-opacity"
        >
          {saving ? '…' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  )
}

// ── Scanned Product Preview ───────────────────────────────────────────────

interface ScannedPreviewProps {
  barcode: string
  onAdd: (name: string, category: string | null, unit: string | null) => void
  onClose: () => void
}

function ScannedPreview({ barcode, onAdd, onClose }: ScannedPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ name: string; brand: string | null; category: string | null; quantity: string | null } | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    lookupBarcode(barcode).then((r) => {
      setResult(r)
      setName(r?.name ?? '')
      setLoading(false)
    })
  }, [barcode])

  function handleAdd() {
    const finalName = name.trim() || barcode
    const cat = result?.category ?? autoCategory(finalName)
    onAdd(finalName, cat, null)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
      <div className="w-full bg-[var(--color-surface)] rounded-t-2xl p-6 pb-safe space-y-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Gescannter Barcode: {barcode}</p>
            {loading ? (
              <p className="text-[var(--color-text-muted)]">Produkt wird gesucht…</p>
            ) : result ? (
              <>
                {result.brand && <p className="text-xs text-[var(--color-text-muted)]">{result.brand}</p>}
                {result.quantity && <p className="text-xs text-[var(--color-text-muted)]">{result.quantity}</p>}
                {result.category && <p className="text-xs text-[var(--color-primary)]">{result.category}</p>}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Produkt nicht gefunden — bitte Name eingeben</p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] text-xl p-1">✕</button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Produktname"
          className="w-full border border-[var(--color-muted)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm border border-[var(--color-muted)] text-[var(--color-text-muted)]"
          >
            Abbrechen
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm bg-[var(--color-primary)] text-white font-medium disabled:opacity-40"
          >
            Zur Liste hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [activeListId, setActiveListId] = useState<number | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [addInitial, setAddInitial] = useState<{ name?: string; category?: string; unit?: string }>({})
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [savingList, setSavingList] = useState(false)

  const activeList = lists.find((l) => l.id === activeListId)
  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  useEffect(() => {
    Promise.all([shoppingApi.getLists(), shoppingApi.getSuggestions()]).then(([ls, sg]) => {
      setLists(ls)
      setSuggestions(sg)
      if (ls.length > 0) setActiveListId(ls[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (activeListId == null) return
    shoppingApi.getItems(activeListId).then(setItems)
  }, [activeListId])

  async function handleToggle(item: ShoppingItem) {
    const updated = await shoppingApi.updateItem(item.id, { checked: !item.checked })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    refreshListCounts()
  }

  async function handleDelete(id: number) {
    await shoppingApi.deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    refreshListCounts()
  }

  async function handleDeleteChecked() {
    if (!activeListId) return
    await shoppingApi.deleteChecked(activeListId)
    setItems((prev) => prev.filter((i) => !i.checked))
    refreshListCounts()
  }

  async function handleCheckAll(checked: boolean) {
    if (!activeListId) return
    await shoppingApi.checkAll(activeListId, checked)
    setItems((prev) => prev.map((i) => ({ ...i, checked })))
    refreshListCounts()
  }

  function refreshListCounts() {
    shoppingApi.getLists().then(setLists)
  }

  function handleItemAdded(item: ShoppingItem) {
    setItems((prev) => [...prev, item])
    setSuggestions((prev) => prev.includes(item.name) ? prev : [item.name, ...prev])
    setShowAdd(false)
    refreshListCounts()
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return
    setSavingList(true)
    const list = await shoppingApi.createList(newListName.trim())
    setLists((prev) => [...prev, list])
    setActiveListId(list.id)
    setItems([])
    setNewListName('')
    setShowNewList(false)
    setSavingList(false)
  }

  async function handleDeleteList() {
    if (!activeListId || !activeList) return
    if (!confirm(`Liste "${activeList.name}" löschen?`)) return
    await shoppingApi.deleteList(activeListId)
    const remaining = lists.filter((l) => l.id !== activeListId)
    setLists(remaining)
    setActiveListId(remaining[0]?.id ?? null)
    setItems([])
  }

  function handleBarcodeResult(barcode: string) {
    setShowScanner(false)
    setScannedBarcode(barcode)
  }

  function handleScannedAdd(name: string, category: string | null, unit: string | null) {
    setScannedBarcode(null)
    setAddInitial({ name, category: category ?? undefined, unit: unit ?? undefined })
    setShowAdd(true)
  }

  const groups = groupByCategory(unchecked)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--color-text-muted)]">Wird geladen…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-semibold text-[var(--color-primary)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Einkaufszettel
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {activeList ? `${unchecked.length} Artikel • ${checked.length} erledigt` : 'Erstelle deine erste Liste'}
        </p>
      </div>

      {/* List Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => { setActiveListId(l.id); setItems([]) }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                l.id === activeListId
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)]/20'
              }`}
            >
              <span>{l.icon}</span>
              <span>{l.name}</span>
              {l.item_count > 0 && (
                <span className={`text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                  l.id === activeListId ? 'bg-white/20' : 'bg-[var(--color-text-muted)]/20'
                }`}>
                  {l.item_count}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowNewList(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            + Neue Liste
          </button>
        </div>
      </div>

      {/* New List Form */}
      {showNewList && (
        <div className="mx-4 mb-4 p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-muted)]">
          <form onSubmit={handleCreateList} className="flex gap-2">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Listenname, z.B. REWE, dm, Wocheneinkauf…"
              className="flex-1 border border-[var(--color-muted)] rounded-xl px-4 py-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={!newListName.trim() || savingList}
              className="bg-[var(--color-primary)] text-white px-4 rounded-xl text-sm font-medium disabled:opacity-40"
            >
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowNewList(false)}
              className="text-[var(--color-text-muted)] px-2"
            >
              ✕
            </button>
          </form>
        </div>
      )}

      {/* Action Bar */}
      {activeListId && (
        <div className="px-4 mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => { setAddInitial({}); setShowAdd(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Artikel
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-muted)] text-[var(--color-text)] rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
          >
            <span>📷</span> Barcode scannen
          </button>
          {checked.length > 0 && (
            <button
              onClick={handleDeleteChecked}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-muted)] text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Erledigte löschen ({checked.length})
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => handleCheckAll(unchecked.length > 0)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-muted)] text-[var(--color-text-muted)] rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
            >
              {unchecked.length > 0 ? 'Alle abhaken' : 'Alle zurücksetzen'}
            </button>
          )}
          {lists.length > 1 && (
            <button
              onClick={handleDeleteList}
              className="ml-auto flex items-center gap-1 px-3 py-2.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Liste löschen
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeListId && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
          <span className="text-5xl">🛒</span>
          <p className="text-[var(--color-text-muted)]">Deine Liste ist leer.</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Füge Artikel hinzu oder scanne einen Barcode.
          </p>
        </div>
      )}

      {/* Items by Category */}
      {groups.map(([cat, catItems]) => (
        <div key={cat} className="px-4 mb-4">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
            {cat}
          </h3>
          <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-muted)]">
            {catItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  idx > 0 ? 'border-t border-[var(--color-muted)]' : ''
                }`}
              >
                <button
                  onClick={() => handleToggle(item)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    item.checked
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                      : 'border-[var(--color-muted)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {item.checked && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${item.checked ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                    {item.name}
                  </span>
                  {(item.quantity || item.unit) && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      {formatQty(item.quantity, item.unit)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Checked items (collapsed section) */}
      {checked.length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
            ✓ Erledigt ({checked.length})
          </h3>
          <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-muted)] opacity-60">
            {checked.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-[var(--color-muted)]' : ''}`}
              >
                <button
                  onClick={() => handleToggle(item)}
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 bg-[var(--color-primary)] border-[var(--color-primary)] flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-sm line-through text-[var(--color-text-muted)]">{item.name}</span>
                  {(item.quantity || item.unit) && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">{formatQty(item.quantity, item.unit)}</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick suggestions bar */}
      {suggestions.length > 0 && activeListId && !showAdd && (
        <div className="px-4 mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2 px-1">Oft gekauft:</p>
          <div className="flex gap-2 flex-wrap">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={async () => {
                  const item = await shoppingApi.addItem(activeListId, {
                    name: s,
                    category: autoCategory(s),
                  })
                  handleItemAdded(item)
                }}
                className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-full text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Form (sticky bottom) */}
      {showAdd && activeListId && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] md:left-60">
          <AddItemForm
            listId={activeListId}
            suggestions={suggestions}
            initialName={addInitial.name}
            initialCategory={addInitial.category}
            initialUnit={addInitial.unit}
            onAdd={handleItemAdded}
            onClose={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* No lists state */}
      {!loading && lists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
          <span className="text-5xl">🛒</span>
          <p className="text-[var(--color-text-muted)]">Noch keine Liste erstellt.</p>
          <button
            onClick={() => setShowNewList(true)}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium"
          >
            Erste Liste erstellen
          </button>
        </div>
      )}

      {/* Barcode Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner
          onResult={handleBarcodeResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Scanned Product Preview */}
      {scannedBarcode && (
        <ScannedPreview
          barcode={scannedBarcode}
          onAdd={handleScannedAdd}
          onClose={() => setScannedBarcode(null)}
        />
      )}
    </div>
  )
}
