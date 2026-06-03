import { useState } from 'react';

const MODALITIES = [
  { value: 'walk',       label: 'Walk' },
  { value: 'run',        label: 'Run' },
  { value: 'tennis',     label: 'Tennis' },
  { value: 'table_tennis', label: 'Table Tennis' },
  { value: 'swim',       label: 'Swim' },
  { value: 'resistance', label: 'Resistance Training' },
];

const PACE_OPTIONS = [
  { value: 5, label: '5 km/h (easy jog)' },
  { value: 6, label: '6 km/h (moderate)' },
  { value: 7, label: '7 km/h (fast)' },
];

const WALK_OPTIONS = [
  { value: 0,  label: 'Flat' },
  { value: 10, label: 'Incline (~10%)' },
];

const RPE_OPTIONS = [
  { value: 5, label: 'Easy (RPE < 8)' },
  { value: 8, label: 'Hard (RPE ≥ 8)' },
];

function entryLabel(ex) {
  if (ex.modality === 'run') return `Run @ ${ex.pace} km/h`;
  if (ex.modality === 'walk') return ex.pace ? `Walk (Incline ~${ex.pace}%)` : 'Walk (Flat)';
  if (ex.modality === 'resistance') return ex.pace >= 8 ? 'Resistance — Hard (RPE ≥ 8)' : 'Resistance — Easy (RPE < 8)';
  return MODALITIES.find(m => m.value === ex.modality)?.label || ex.modality;
}

export default function ExerciseLogger({ exercises, onAdd, onDelete }) {
  const [modality, setModality] = useState('walk');
  const [pace, setPace] = useState(6);
  const [walkIncline, setWalkIncline] = useState(0);
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState(30);
  const [adding, setAdding] = useState(false);

  const totalBurn = exercises.reduce((s, e) => s + (e.calories_burned || 0), 0);

  async function handleAdd() {
    if (!modality || !duration) return;
    setAdding(true);
    let subOption;
    if (modality === 'run') subOption = pace;
    else if (modality === 'walk') subOption = walkIncline;
    else if (modality === 'resistance') subOption = rpe;
    await onAdd({ modality, pace: subOption, duration_minutes: duration });
    setAdding(false);
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Exercise</h2>
        {totalBurn > 0 && (
          <span className="text-orange-400 font-bold text-sm">−{totalBurn} kcal burned</span>
        )}
      </div>

      {exercises.length > 0 && (
        <div className="mb-4 space-y-1">
          {exercises.map(ex => (
            <div key={ex.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="text-slate-200">{entryLabel(ex)}</span>
                <span className="text-slate-500 ml-2 text-xs">{ex.duration_minutes} min</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-400 text-xs font-semibold">−{ex.calories_burned} kcal</span>
                <button onClick={() => onDelete(ex.id)} className="text-slate-600 hover:text-red-400 text-lg leading-none">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-end">
        <select
          value={modality}
          onChange={e => setModality(e.target.value)}
          className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
        >
          {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {modality === 'run' && (
          <select
            value={pace}
            onChange={e => setPace(parseInt(e.target.value))}
            className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PACE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        )}

        {modality === 'walk' && (
          <select
            value={walkIncline}
            onChange={e => setWalkIncline(parseInt(e.target.value))}
            className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
          >
            {WALK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {modality === 'resistance' && (
          <select
            value={rpe}
            onChange={e => setRpe(parseInt(e.target.value))}
            className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
          >
            {RPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="300"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 30)}
            className="w-16 bg-slate-700 text-slate-200 text-sm rounded-lg px-2 py-2 text-center outline-none focus:ring-1 focus:ring-blue-500"
            title="Duration (minutes)"
          />
          <span className="text-slate-500 text-sm">min</span>
        </div>

        <button
          onClick={handleAdd}
          disabled={adding}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {adding ? '...' : '+ Log'}
        </button>
      </div>
    </div>
  );
}
