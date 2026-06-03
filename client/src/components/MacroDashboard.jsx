const MACRO_TARGETS = {
  training: { protein: 150, carbs: 40, fat: 30, fiber: 30 },
  rest:     { protein: 150, carbs: 20, fat: 30, fiber: 30 },
};

const CAL_PRESETS = {
  moderate:   { training: 1800, rest: 1600, label: 'Moderate' },
  light:      { training: 2000, rest: 1800, label: 'Light' },
  aggressive: { training: 1600, rest: 1400, label: 'Aggressive' },
};

function MacroBar({ label, consumed, target, max, color, burnNote, unit = 'g', lowerIsBetter = false }) {
  const pct = Math.min(100, Math.max(0, (consumed / target) * 100));
  const isOver = lowerIsBetter ? consumed > target : false;
  const isNearMax = max && consumed >= max * 0.9;

  let barColor = color;
  if (isNearMax) barColor = 'bg-red-500';
  else if (lowerIsBetter && pct >= 90) barColor = 'bg-orange-400';
  else if (!lowerIsBetter && pct >= 90) barColor = 'bg-orange-400';

  let textColor = 'text-slate-300';
  if (isNearMax || isOver) textColor = 'text-red-400';
  else if (pct >= 90 && lowerIsBetter) textColor = 'text-orange-400';

  const diff = target - (typeof consumed === 'number' ? consumed : 0);
  const absDiff = Math.abs(Math.round(diff));
  const tolerance = target * 0.1;
  let remainingLabel, remainingColor;
  if (Math.abs(diff) <= tolerance) {
    remainingLabel = 'Goal met ✓';
    remainingColor = 'text-emerald-500';
  } else if (diff > tolerance) {
    remainingLabel = lowerIsBetter ? `${absDiff}${unit} left` : `${absDiff}${unit} to go`;
    remainingColor = 'text-slate-500';
  } else {
    const overPct = Math.round((absDiff / target) * 100);
    remainingLabel = `${absDiff}${unit} over (+${overPct}%)`;
    remainingColor = 'text-red-400';
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium text-slate-400">{label}</span>
          <span className={`text-xs ${remainingColor}`}>{remainingLabel}{burnNote ? <span className="text-slate-500"> · {burnNote}</span> : null}</span>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${textColor}`}>
            {typeof consumed === 'number' ? consumed.toFixed(label === 'Calories' ? 0 : 1) : 0}{unit} / {target}{unit}
            {max && <span className="text-slate-500 font-normal"> (max {max}{unit})</span>}
            {isOver && <span className="text-red-400 ml-1">⚠</span>}
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MacroDashboard({ totals, dayType, onChangeDayType, exerciseBurn, caloriePreset, onChangeCaloriePreset }) {
  const targets  = MACRO_TARGETS[dayType] || MACRO_TARGETS.training;
  const calPreset = CAL_PRESETS[caloriePreset] || CAL_PRESETS.moderate;
  const calTarget = calPreset[dayType] || 1800;

  const foodCal = Math.round((totals.protein || 0) * 4 + (totals.carbs || 0) * 4 + (totals.fat || 0) * 9);
  const burn = exerciseBurn || 0;

  const nextPreset = caloriePreset === 'moderate' ? 'light' : caloriePreset === 'light' ? 'aggressive' : 'moderate';

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Today's Macros</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeCaloriePreset(nextPreset)}
            className="text-xs px-2 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
            title="Cycle: Moderate → Light → Aggressive"
          >
            🎯 {calPreset.label} ▾
          </button>
          <button
            onClick={onChangeDayType}
            className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            {dayType === 'training' ? '💪 Training' : '😴 Rest'} ▾
          </button>
        </div>
      </div>

      <MacroBar
        label="Calories"
        consumed={foodCal}
        target={calTarget}
        unit=" kcal"
        color="bg-rose-500"
        burnNote={burn > 0 ? `${burn} kcal active burned` : null}
        lowerIsBetter
      />
      <MacroBar label="Protein"  consumed={totals.protein || 0} target={targets.protein} color="bg-blue-500" />
      <MacroBar label="Carbs"    consumed={totals.carbs   || 0} target={targets.carbs}   color="bg-yellow-400" lowerIsBetter />
      <MacroBar label="Good Fat" consumed={totals.fat     || 0} target={targets.fat}     color="bg-purple-500" />
      <MacroBar label="Fiber"    consumed={totals.fiber   || 0} target={targets.fiber}   max={45} color="bg-emerald-500" />
    </div>
  );
}
