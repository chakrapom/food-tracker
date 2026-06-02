import { useState, useCallback } from 'react';

export default function AISuggestion({ totals, dayType, mealsLogged, date }) {
  const [suggestion, setSuggestion] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, day_type: dayType, totals, meals_logged: mealsLogged }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestion(data.suggestion);
      setRemaining(data.remaining);
    } catch (e) {
      setError(e.message || 'Failed to get suggestion');
    }
    setLoading(false);
  }, [date, dayType, totals, mealsLogged]);

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">AI Coach</h2>
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Thinking...</>
          ) : (
            <><span>✨</span> Suggest next meal</>
          )}
        </button>
      </div>

      {remaining && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Protein', val: remaining.protein, color: 'text-blue-400' },
            { label: 'Carbs',   val: remaining.carbs,   color: 'text-yellow-400' },
            { label: 'Fat',     val: remaining.fat,     color: 'text-purple-400' },
            { label: 'Fiber',   val: remaining.fiber,   color: 'text-emerald-400' },
          ].map(m => (
            <div key={m.label} className="bg-slate-700/60 rounded-lg p-2 text-center">
              <div className={`text-sm font-bold ${m.color}`}>{m.val.toFixed(0)}g</div>
              <div className="text-xs text-slate-500">{m.label} left</div>
            </div>
          ))}
        </div>
      )}

      {suggestion ? (
        <div className="bg-slate-700/50 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
          {suggestion.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
        </div>
      ) : !loading && (
        <p className="text-slate-500 text-sm italic">
          Press the button above to get a meal suggestion from your AI coach.
        </p>
      )}

      {error && (
        <div className="mt-3 text-red-400 text-sm bg-red-900/20 rounded-lg p-3">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
