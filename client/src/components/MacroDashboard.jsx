const TARGETS = {
  training: { protein: 150, carbs: 40, fat: 30, fiber: 30 },
  rest:     { protein: 150, carbs: 20, fat: 30, fiber: 30 },
};

function MacroBar({ label, consumed, target, max, color }) {
  const pct = Math.min(100, (consumed / target) * 100);
  const isOver = consumed > target;
  const isNearMax = max && consumed >= max * 0.9;

  let barColor = color;
  if (isNearMax) barColor = 'bg-red-500';
  else if (pct >= 90) barColor = 'bg-orange-400';
  else if (pct >= 60) barColor = color;

  let textColor = 'text-slate-300';
  if (isNearMax || isOver) textColor = 'text-red-400';
  else if (pct >= 90) textColor = 'text-orange-400';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {consumed.toFixed(1)}g / {target}g
          {max && <span className="text-slate-500 font-normal"> (max {max}g)</span>}
          {isOver && <span className="text-red-400 ml-1">⚠</span>}
        </span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MacroDashboard({ totals, dayType, onChangeDayType }) {
  const targets = TARGETS[dayType] || TARGETS.training;

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-bold text-lg">Today's Macros</h2>
        <button
          onClick={onChangeDayType}
          className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
        >
          {dayType === 'training' ? '💪 Training' : '😴 Rest'} — switch
        </button>
      </div>

      <MacroBar
        label="Protein"
        consumed={totals.protein || 0}
        target={targets.protein}
        color="bg-blue-500"
      />
      <MacroBar
        label="Carbs"
        consumed={totals.carbs || 0}
        target={targets.carbs}
        color="bg-yellow-400"
      />
      <MacroBar
        label="Good Fat"
        consumed={totals.fat || 0}
        target={targets.fat}
        color="bg-purple-500"
      />
      <MacroBar
        label="Fiber"
        consumed={totals.fiber || 0}
        target={targets.fiber}
        max={45}
        color="bg-emerald-500"
      />
    </div>
  );
}
