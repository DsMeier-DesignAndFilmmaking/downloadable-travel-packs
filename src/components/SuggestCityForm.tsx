/**
 * Suggest a City — Sends request to (mock) endpoint; future hook for AI to generate new packs on demand.
 */

import { useState } from 'react'
import { Send } from 'lucide-react'

const SUGGEST_ENDPOINT = '/api/suggest-city'

export default function SuggestCityForm() {
  const [cityName, setCityName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cityName.trim()) return
    setStatus('sending')
    try {
      const res = await fetch(SUGGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName: cityName.trim(), notes: notes.trim() }),
      })
      if (res.ok) {
        setStatus('success')
        setCityName('')
        setNotes('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
      <h3 className="font-semibold text-slate-100 mb-3">Suggest a City</h3>
      <p className="text-slate-400 text-sm mb-3">
        Request a new pack — we’ll use this to generate guides on demand (AI coming soon).
      </p>
      <input
        type="text"
        value={cityName}
        onChange={(e) => setCityName(e.target.value)}
        placeholder="City name (e.g. Berlin, Sydney)"
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 mb-2"
        disabled={status === 'sending'}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional: country, region, or what you need"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-3"
        disabled={status === 'sending'}
      />
      <button
        type="submit"
        disabled={status === 'sending' || !cityName.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium"
      >
        <Send className="w-4 h-4" />
        {status === 'sending' ? 'Sending…' : 'Suggest'}
      </button>
      {status === 'success' && (
        <p className="mt-2 text-sm text-emerald-400">Thanks! We’ll consider adding this city.</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-amber-400">Request failed (mock endpoint). Try again later.</p>
      )}
    </form>
  )
}
