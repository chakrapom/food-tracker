const PROTEIN_TARGET = 150;

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function StreakSummary({ history, onSelectDate }) {
  if (!history || history.length === 0) return null;

  let streak = 0;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sorted) {
    if (day.protein_total >= PROTEIN_TARGET) streak++;
    else break;
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Streak</h2>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-orange-400">{streak}</span>
          <span className="text-slate-400 text-sm">consecutive days hitting protein</span>
          {streak >= 3 && <span className="text-xl">🔥</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {[...history].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
          const hit = day.protein_total >= PROTEIN_TARGET;
          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={`flex flex-col items-center gap-1 ${hit ? 'opacity-100' : 'opacity-50'} hover:opacity-100 transition-opacity`}
              title={`${day.date}: ${day.protein_total?.toFixed(0) || 0}g protein — click to view`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                hit ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-400'
              }`}>
                {hit ? '✓' : '×'}
              </div>
              <span className="text-slate-500 text-xs">{dayLabel(day.date)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
