import { useState } from 'react';

const MEAL_NAMES = ['Pre Workout', 'Breakfast', 'Lunch', 'Snack', 'Dinner', 'Supper'];

function entryCalories(e) {
  return Math.round((e.protein || 0) * 4 + (e.carbs || 0) * 4 + (e.fat || 0) * 9);
}

function MealSlot({ number, entries, foods, onAdd, onDelete, onMove, isExpanded, onToggle }) {
  const [mode, setMode] = useState('preset');
  const [selectedFood, setSelectedFood] = useState('');
  const [servings, setServings] = useState(1);
  const [freeText, setFreeText] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [parsing, setParsing] = useState(false);

  const mealTotal = entries.reduce((acc, e) => ({
    protein: acc.protein + (e.protein || 0),
    carbs:   acc.carbs   + (e.carbs   || 0),
    fat:     acc.fat     + (e.fat     || 0),
    fiber:   acc.fiber   + (e.fiber   || 0),
  }), { protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const mealCal = Math.round(mealTotal.protein * 4 + mealTotal.carbs * 4 + mealTotal.fat * 9);

  const filtered = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  async function handleAddPreset() {
    const food = foods.find(f => f.id === parseInt(selectedFood));
    if (!food) return;
    setAdding(true);
    await onAdd({
      meal_number: number,
      food_name: `${food.name} × ${servings}`,
      protein: food.protein * servings,
      carbs:   food.carbs   * servings,
      fat:     food.fat     * servings,
      fiber:   food.fiber   * servings,
      serving_note: `${servings} × ${food.serving_label}`,
    });
    setSelectedFood('');
    setServings(1);
    setSearch('');
    setAdding(false);
  }

  async function handleParseFreeText() {
    if (!freeText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/suggest/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freeText }),
      });
      const items = await res.json();
      for (const item of items) {
        await onAdd({
          meal_number: number,
          food_name: item.food_name,
          protein: item.protein || 0,
          carbs:   item.carbs   || 0,
          fat:     item.fat     || 0,
          fiber:   item.fiber   || 0,
          serving_note: item.serving_note || '',
        });
      }
      setFreeText('');
    } catch {
      alert('Could not parse food text. Try again.');
    }
    setParsing(false);
  }

  const name = MEAL_NAMES[number - 1];

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-750 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-medium text-sm w-28">{name}</span>
          {entries.length > 0 ? (
            <span className="text-xs text-slate-500">
              {entries.length} items · {mealCal} kcal · P:{mealTotal.protein.toFixed(0)}g C:{mealTotal.carbs.toFixed(0)}g F:{mealTotal.fat.toFixed(0)}g
            </span>
          ) : (
            <span className="text-xs text-slate-600 italic">Nothing logged</span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700">
          {entries.length > 0 && (
            <div className="mt-3 mb-3 space-y-1">
              {entries.map(e => (
                <div key={e.id} className="flex items-start justify-between bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200">{e.food_name}</span>
                    {e.serving_note && <span className="text-slate-500 ml-2 text-xs">({e.serving_note})</span>}
                    <div className="text-slate-500 text-xs mt-0.5">
                      {entryCalories(e)} kcal · P:{e.protein}g · C:{e.carbs}g · Fat:{e.fat}g · Fiber:{e.fiber}g
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <select
                      defaultValue=""
                      onChange={ev => {
                        const target = parseInt(ev.target.value);
                        if (target) { onMove(e.id, target); ev.target.value = ''; }
                      }}
                      className="text-xs bg-slate-600 text-slate-400 rounded px-1 py-0.5 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Move →</option>
                      {MEAL_NAMES.map((mName, i) => i + 1 !== number ? (
                        <option key={i + 1} value={i + 1}>{mName}</option>
                      ) : null)}
                    </select>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="text-slate-600 hover:text-red-400 text-lg leading-none px-1"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-3 mt-3">
            <button
              onClick={() => setMode('preset')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${mode === 'preset' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              Pick from list
            </button>
            <button
              onClick={() => setMode('freetext')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${mode === 'freetext' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              ✨ Free text (AI)
            </button>
          </div>

          {mode === 'preset' ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 mb-2 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={selectedFood}
                  onChange={e => setSelectedFood(e.target.value)}
                  className="w-full bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select food --</option>
                  {filtered.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.serving_label}) — P:{f.protein}g
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={servings}
                  onChange={e => setServings(parseFloat(e.target.value) || 1)}
                  className="w-16 bg-slate-700 text-slate-200 text-sm rounded-lg px-2 py-2 text-center outline-none focus:ring-1 focus:ring-blue-500"
                  title="Servings"
                />
                <button
                  onClick={handleAddPreset}
                  disabled={!selectedFood || adding}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  {adding ? '...' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 300g boiled chicken and a bowl of soup"
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleParseFreeText()}
                className="flex-1 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleParseFreeText}
                disabled={!freeText.trim() || parsing}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {parsing ? '⏳' : '✨ Parse'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MealLogger({ meals, foods, date, dayType, onAdd, onDelete, onMove }) {
  const [expandedMeal, setExpandedMeal] = useState(1);

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6">
      <h2 className="text-white font-bold text-lg mb-4">Meals</h2>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <MealSlot
          key={n}
          number={n}
          entries={meals.filter(m => m.meal_number === n)}
          foods={foods}
          onAdd={entry => onAdd({ ...entry, date, day_type: dayType })}
          onDelete={onDelete}
          onMove={onMove}
          isExpanded={expandedMeal === n}
          onToggle={() => setExpandedMeal(expandedMeal === n ? null : n)}
        />
      ))}
    </div>
  );
}
