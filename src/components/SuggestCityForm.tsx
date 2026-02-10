/**
 * Suggest a City — Collects city, notes, and pain points for prioritization.
 * Data is sent to the API and logged to drive content for the next 10 cities.
 */

import { useState } from 'react'
import { Send, AlertCircle, Car, Utensils, Wallet, Languages, ShieldAlert, Heart } from 'lucide-react'

const SUGGEST_ENDPOINT = '/api/suggest-city'

const PAIN_POINTS: { id: string; label: string; icon: typeof Car }[] = [
  { id: 'Transport', label: 'Transport', icon: Car },
  { id: 'Safety', label: 'Safety', icon: ShieldAlert },
  { id: 'Food', label: 'Food', icon: Utensils },
  { id: 'Money', label: 'Money', icon: Wallet },
  { id: 'Language', label: 'Language', icon: Languages },
  { id: 'Scams', label: 'Scams', icon: AlertCircle },
  { id: 'Emergency', label: 'Emergency', icon: Heart },
]

export default function SuggestCityForm() {
  const [cityName, setCityName] = useState('')
  const [notes, setNotes] = useState('')
  const [painPoints, setPainPoints] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  function togglePainPoint(id: string) {
    setPainPoints((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cityName.trim()) return
    setStatus('sending')
    try {
      const res = await fetch(SUGGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: cityName.trim(),
          notes: notes.trim() || undefined,
          painPoints: Array.from(painPoints),
        }),
      })
      if (res.ok) {
        setStatus('success')
        setCityName('')
        setNotes('')
        setPainPoints(new Set())
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
      <h3 className="font-semibold text-slate-100 mb-2">Suggest a City</h3>
      <p className="text-slate-400 text-sm mb-4">
        Tell us which city you need — and what you’re worried about. We use this to prioritize the next packs.
      </p>

      <label className="block text-slate-300 text-xs font-medium mb-1.5">City</label>
      <input
        type="text"
        value={cityName}
        onChange={(e) => setCityName(e.target.value)}
        placeholder="e.g. Berlin, Sydney, Lisbon"
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 mb-4"
        disabled={status === 'sending'}
      />

      <label className="block text-slate-300 text-xs font-medium mb-1.5">What pain points do you want solved?</label>
      <p className="text-slate-500 text-[11px] mb-2">Select what matters most so we can prioritize content.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {PAIN_POINTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => togglePainPoint(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              painPoints.has(id)
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
            disabled={status === 'sending'}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <label className="block text-slate-300 text-xs font-medium mb-1.5">Optional notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Country, region, or specific worries…"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-4"
        disabled={status === 'sending'}
      />

      <button
        type="submit"
        disabled={status === 'sending' || !cityName.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium"
      >
        <Send className="w-4 h-4" />
        {status === 'sending' ? 'Sending…' : 'Suggest city'}
      </button>

      {status === 'success' && (
        <p className="mt-3 text-sm text-emerald-400">
          Thanks! Your pain points help us prioritize the next cities.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-amber-400">Request failed. Try again later.</p>
      )}
    </form>
  )
}
