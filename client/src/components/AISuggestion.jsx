import { useState, useCallback, useEffect } from 'react';

const PRESETS = {
  moderate:   { training: 1800, rest: 1600 },
  light:      { training: 2000, rest: 1800 },
  aggressive: { training: 1600, rest: 1400 },
};

function getCalorieTarget(preset, dayType) {
  return (PRESETS[preset] || PRESETS.moderate)[dayType] || 1800;
}

export default function AISuggestion({ totals, dayType, mealsLogged, meals, date, exerciseBurn, caloriePreset, onClose }) {
  const [suggestion, setSuggestion] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calTarget = getCalorieTarget(caloriePreset, dayType);

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          day_type: dayType,
          totals,
          meals_logged: mealsLogged,
          meals: meals || [],
          exercise_burn: exerciseBurn || 0,
          calorie_target: calTarget,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestion(data.suggestion);
      setRemaining(data.remaining);
    } catch (e) {
      setError(e.message || 'Failed to get suggestion');
    }
    setLoading(false);
  }, [date, dayType, totals, mealsLogged, exerciseBurn, calTarget]);

  // Auto-fetch when modal opens
  useEffect(() => {
    fetchSuggestion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-slate-800 rounded-2xl p-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl leading-none"
      >×</button>

      <div className="flex items-center justify-between mb-4 pr-6">
        <h2 className="text-white font-bold text-lg">🍽️ What to eat next?</h2>
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? '⏳' : '↻ Refresh'}
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

      {loading && !suggestion && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <span className="animate-spin">⏳</span> Thinking...
        </div>
      )}

      {suggestion && (
        <div className="bg-slate-700/50 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
          {suggestion.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
        </div>
      )}

      {error && (
        <div className="mt-3 text-red-400 text-sm bg-red-900/20 rounded-lg p-3">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
