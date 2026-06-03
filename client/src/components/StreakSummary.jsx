const PROTEIN_TARGET = 150;

function calcStreak(history) {
  if (!history || history.length === 0) return 0;
  let streak = 0;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sorted) {
    if ((day.protein_total ?? day.protein ?? 0) >= PROTEIN_TARGET) streak++;
    else break;
  }
  return streak;
}

export default function StreakSummary({ history, onSelectDate }) {
  if (!history || history.length === 0) return null;

  const streak = calcStreak(history);
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  function dayLabel(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${streak > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
        {streak > 0 ? `🔥${streak}` : '—'}
      </span>
      <div className="flex gap-1">
        {sorted.map(day => {
          const hit = (day.protein_total ?? day.protein ?? 0) >= PROTEIN_TARGET;
          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              title={`${day.date} · ${((day.protein_total ?? day.protein) || 0).toFixed(0)}g protein`}
              className="flex flex-col items-center gap-0.5 group"
            >
              <div className={`w-3 h-3 rounded-full transition-opacity group-hover:opacity-80 ${hit ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              <span className="text-slate-600 text-[9px] leading-none">{dayLabel(day.date)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
