import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

const MACRO_META = [
  { key: 'protein', label: 'Protein', color: 'bg-blue-500',    text: 'text-blue-400'    },
  { key: 'carbs',   label: 'Carbs',   color: 'bg-yellow-400',  text: 'text-yellow-400'  },
  { key: 'fat',     label: 'Fat',     color: 'bg-purple-500',  text: 'text-purple-400'  },
  { key: 'fiber',   label: 'Fiber',   color: 'bg-emerald-500', text: 'text-emerald-400' },
];

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
  const first = dateShort(days[0].date);
  const last  = dateShort(days[days.length - 1].date);
  return `${first} – ${last}`;
}

function HitDot({ hit }) {
  return <div className={`w-2.5 h-2.5 rounded-full ${hit ? 'bg-emerald-500' : 'bg-slate-600'}`} />;
}

function StatCard({ label, avg, target, hitRate, trend, textColor }) {
  const arrow = trendArrow(trend);
  const hitPct = Math.round(hitRate * 100);
  return (
    <div className="bg-slate-700/60 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs font-medium">{label}</span>
        {arrow && <span className={`text-xs font-bold ${arrow.color}`}>{arrow.icon}</span>}
      </div>
      <div className={`text-xl font-bold ${textColor}`}>{avg.toFixed(0)}g</div>
      <div className="text-slate-500 text-xs">avg · target {target}g</div>
      <div className="mt-2 h-1.5 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${hitPct >= 70 ? 'bg-emerald-500' : hitPct >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
          style={{ width: `${hitPct}%` }}
        />
      </div>
      <div className="text-slate-500 text-xs mt-1">hit {hitPct}% of days</div>
    </div>
  );
}

export default function WeeklyReport({ onSelectDate }) {
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
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: '#1e293b',
        pixelRatio: 2,
      });
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Copied! Paste it anywhere — WhatsApp, iMessage, email.');
      } catch (e) {
        alert('Copy failed: ' + e.message);
      }
      setExporting(false);
    } catch (e) {
      alert('Export failed: ' + e.message);
      setExporting(false);
    }
  }

  const isEmpty = data && data.days.length === 0;

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
              {/* Exportable region */}
              <div ref={reportRef} className="bg-slate-800 rounded-xl pt-4 pb-2">

                {/* Report header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div>
                    <div className="text-white font-bold">Jimmy Eats</div>
                    <div className="text-slate-500 text-xs">{weekRange(data.days)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs">Weekly Summary</div>
                  </div>
                </div>

                {/* 7-day grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <td className="text-slate-500 pb-2 pr-2 w-12"></td>
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

                {/* Averages */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MACRO_META.map(m => {
                    const avgTarget = m.key === 'carbs'
                      ? Math.round(data.days.reduce((s, d) => s + d.targets[m.key], 0) / data.days.length)
                      : data.days[0].targets[m.key];
                    return (
                      <StatCard
                        key={m.key}
                        label={m.label}
                        avg={data.averages[m.key]}
                        target={avgTarget}
                        hitRate={data.hitRates[m.key]}
                        trend={data.trends?.[m.key]}
                        textColor={m.text}
                      />
                    );
                  })}
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

              {/* Action buttons — outside the export region */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCopy}
                  disabled={exporting}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {exporting ? '⏳ Copying...' : '📋 Copy image to clipboard'}
                </button>
                {data.days.map && (
                  <div className="flex gap-1">
                    {data.days.map(d => (
                      <button
                        key={d.date}
                        onClick={() => onSelectDate(d.date)}
                        title={d.date}
                        className="w-7 h-9 flex flex-col items-center justify-center gap-0.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 transition-colors"
                      >
                        <span className="text-slate-400 text-xs leading-none">{dayShort(d.date).slice(0,1)}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${d.hit.protein ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
