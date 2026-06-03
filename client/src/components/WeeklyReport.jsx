import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

const MACRO_META = [
  { key: 'protein', label: 'Protein', text: 'text-blue-400',    belowThreshold: false },
  { key: 'carbs',   label: 'Carbs',   text: 'text-yellow-400',  belowThreshold: true  },
  { key: 'fat',     label: 'Fat',     text: 'text-purple-400',  belowThreshold: false },
  { key: 'fiber',   label: 'Fiber',   text: 'text-emerald-400', belowThreshold: false },
];

const CAL_PRESETS = {
  moderate:   { training: 1800, rest: 1600 },
  light:      { training: 2000, rest: 1800 },
  aggressive: { training: 1600, rest: 1400 },
};

function dayCalories(d) {
  return Math.round(d.protein * 4 + d.carbs * 4 + d.fat * 9);
}

function calTarget(d, preset) {
  return (CAL_PRESETS[preset] || CAL_PRESETS.moderate)[d.day_type] || 1800;
}

function trendArrow(val) {
  if (val === null || val === undefined) return null;
  if (val > 3)  return { icon: '↑', color: 'text-emerald-400' };
  if (val < -3) return { icon: '↓', color: 'text-red-400' };
  return { icon: '→', color: 'text-slate-400' };
}

function dayShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
}

function dateShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weekRange(days) {
  if (!days || days.length === 0) return '';
  return `${dateShort(days[0].date)} – ${dateShort(days[days.length - 1].date)}`;
}

function HitDot({ hit }) {
  return <div className={`w-2.5 h-2.5 rounded-full ${hit ? 'bg-emerald-500' : 'bg-slate-600'}`} />;
}

// n = days with data, denom = always 7
function StatCard({ label, avg, target, hitCount, denom = 7, trend, textColor, unit = 'g', belowThreshold = false }) {
  const arrow = trendArrow(trend);
  const hitPct = Math.min(100, Math.max(0, (hitCount / denom) * 100));
  return (
    <div className="bg-slate-700/60 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs font-medium">{label}</span>
        {arrow && <span className={`text-xs font-bold ${arrow.color}`}>{arrow.icon}</span>}
      </div>
      <div className={`text-xl font-bold ${textColor}`}>{avg.toFixed(0)}{unit}</div>
      <div className="text-slate-500 text-xs">avg · {belowThreshold ? 'below' : 'target'} {target}{unit}</div>
      <div className="mt-2 h-1.5 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${hitPct >= 70 ? 'bg-emerald-500' : hitPct >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
          style={{ width: `${hitPct}%` }}
        />
      </div>
      <div className="text-slate-500 text-xs mt-1">
        {belowThreshold ? 'below threshold ' : ''}{hitCount}/{denom} days
      </div>
    </div>
  );
}

export default function WeeklyReport({ onSelectDate, caloriePreset }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    fetch('/api/summaries/week')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open]);

  async function handleCopy() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(reportRef.current, { backgroundColor: '#1e293b', pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();

      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Copied! Paste it anywhere — WhatsApp, iMessage, email.');
      } else {
        // Fallback: download as file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jimmy-eats-weekly.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Saved as jimmy-eats-weekly.png (clipboard not available in this browser).');
      }
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
    setExporting(false);
  }

  const isEmpty = data && data.days.length === 0;
  const n = data?.days.length || 1;

  // Calorie stats derived client-side
  const calDays = data?.days.map(d => ({
    ...d,
    cal:    dayCalories(d),
    calTgt: calTarget(d, caloriePreset),
    calHit: dayCalories(d) <= calTarget(d, caloriePreset),
  }));

  const avgCal     = calDays ? calDays.reduce((s, d) => s + d.cal, 0) / n : 0;
  const calHitCount = calDays ? calDays.filter(d => d.calHit).length : 0;
  const avgCalTgt   = calDays ? Math.round(calDays.reduce((s, d) => s + d.calTgt, 0) / n) : 0;

  // Exercise stats
  const avgExercise = data ? data.days.reduce((s, d) => s + (d.exercise_minutes || 0), 0) / n : 0;
  const exerciseHitCount = data ? data.days.filter(d => (d.exercise_minutes || 0) >= 30).length : 0;

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 transition-colors"
      >
        <h2 className="text-white font-bold text-lg">Weekly Report</h2>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-700">
          {loading && <p className="text-slate-500 text-sm pt-4">Loading...</p>}
          {isEmpty && <p className="text-slate-500 text-sm pt-4">No data logged yet this week.</p>}

          {data && data.days.length > 0 && (
            <>
              <div ref={reportRef} className="bg-slate-800 rounded-xl pt-4 pb-2">

                {/* Report header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div>
                    <div className="text-white font-bold">Jimmy Eats 🍲</div>
                    <div className="text-slate-500 text-xs">{weekRange(data.days)}</div>
                  </div>
                  <div className="text-slate-400 text-xs">Weekly Summary</div>
                </div>

                {/* 7-day grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <td className="text-slate-500 pb-2 pr-2 w-14"></td>
                        {data.days.map(d => (
                          <td key={d.date} className="text-center pb-2 px-1">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-slate-400 font-medium">{dayShort(d.date)}</span>
                              <span className="text-slate-600">{dateShort(d.date)}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Calories row */}
                      <tr>
                        <td className="text-rose-400 font-medium pr-2 py-1">Cal</td>
                        {calDays.map(d => (
                          <td key={d.date} className="text-center py-1 px-1">
                            <div className="flex flex-col items-center gap-0.5">
                              <HitDot hit={d.calHit} />
                              <span className="text-slate-500">{d.cal}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                      {/* Macro rows */}
                      {MACRO_META.map(m => (
                        <tr key={m.key}>
                          <td className={`${m.text} font-medium pr-2 py-1`}>{m.label}</td>
                          {data.days.map(d => (
                            <td key={d.date} className="text-center py-1 px-1">
                              <div className="flex flex-col items-center gap-0.5">
                                <HitDot hit={d.hit[m.key]} />
                                <span className="text-slate-500">{d[m.key].toFixed(0)}g</span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Exercise row */}
                      <tr>
                        <td className="text-orange-400 font-medium pr-2 py-1">Exer</td>
                        {data.days.map(d => (
                          <td key={d.date} className="text-center py-1 px-1">
                            <div className="flex flex-col items-center gap-0.5">
                              <HitDot hit={(d.exercise_minutes || 0) >= 30} />
                              <span className="text-slate-500">{d.exercise_minutes || 0}m</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                      {/* Day type row */}
                      <tr>
                        <td className="text-slate-500 pr-2 py-1">Type</td>
                        {data.days.map(d => (
                          <td key={d.date} className="text-center py-1 px-1">
                            <span className="text-xs">{d.day_type === 'training' ? '💪' : '😴'}</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Stat cards */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {/* Calories */}
                  <StatCard
                    label="Calories"
                    avg={avgCal}
                    target={avgCalTgt}
                    hitCount={calHitCount}
                    textColor="text-rose-400"
                    unit=" kcal"
                    belowThreshold
                  />
                  {/* Macros */}
                  {MACRO_META.map(m => {
                    const avgTarget = m.key === 'carbs'
                      ? Math.round(data.days.reduce((s, d) => s + d.targets[m.key], 0) / n)
                      : data.days[0].targets[m.key];
                    const hitCount = Math.round(data.hitRates[m.key] * n);
                    return (
                      <StatCard
                        key={m.key}
                        label={m.label}
                        avg={data.averages[m.key]}
                        target={avgTarget}
                        hitCount={hitCount}
                        trend={data.trends?.[m.key]}
                        textColor={m.text}
                        belowThreshold={m.belowThreshold}
                      />
                    );
                  })}
                  {/* Exercise */}
                  <StatCard
                    label="Exercise"
                    avg={avgExercise}
                    target={30}
                    hitCount={exerciseHitCount}
                    textColor="text-orange-400"
                    unit=" min"
                  />
                </div>

                {/* Best / Worst */}
                {data.best && data.worst && data.best.date !== data.worst.date && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3">
                      <div className="text-emerald-400 text-xs font-semibold mb-1">Best day</div>
                      <div className="text-white font-bold">{dateShort(data.best.date)}</div>
                      <div className="text-slate-400 text-xs">{data.best.protein.toFixed(0)}g protein</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                      <div className="text-red-400 text-xs font-semibold mb-1">Needs work</div>
                      <div className="text-white font-bold">{dateShort(data.worst.date)}</div>
                      <div className="text-slate-400 text-xs">{data.worst.protein.toFixed(0)}g protein</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCopy}
                  disabled={exporting}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {exporting ? '⏳ Exporting...' : '📋 Copy image to clipboard'}
                </button>
                <div className="flex gap-1">
                  {data.days.map(d => (
                    <button
                      key={d.date}
                      onClick={() => onSelectDate(d.date)}
                      title={d.date}
                      className="w-7 h-9 flex flex-col items-center justify-center gap-0.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 transition-colors"
                    >
                      <span className="text-slate-400 text-xs leading-none">{dayShort(d.date).slice(0, 1)}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${d.hit.protein ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
