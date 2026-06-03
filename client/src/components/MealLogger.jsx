import { useState, useRef, useEffect } from 'react';

const MEAL_NAMES = ['Pre Workout', 'Breakfast', 'Lunch', 'Snack', 'Dinner', 'Supper'];

function entryCalories(e) {
  return Math.round((e.protein || 0) * 4 + (e.carbs || 0) * 4 + (e.fat || 0) * 9);
}

function parseServings(val) {
  const s = String(val).trim();
  const fraction = s.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const n = parseFloat(fraction[1]) / parseFloat(fraction[2]);
    return n > 0 ? n : 1;
  }
  const n = parseFloat(s);
  return n > 0 ? n : 1;
}

function MealSlot({ number, entries, foods, onAdd, onDelete, onMove, isExpanded, onToggle }) {
  const [text, setText] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState('1');
  const [adding, setAdding] = useState(false);
  const [parsing, setParsing] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = text.length > 0 && !selectedFood
    ? foods.filter(f => f.name.toLowerCase().includes(text.toLowerCase())).slice(0, 8)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Only clear selectedFood state, not text
        if (!selectedFood) setText('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [selectedFood]);

  function handleSelectFood(food) {
    setSelectedFood(food);
    setText(food.name);
    setServings(1);
  }

  function handleClear() {
    setSelectedFood(null);
    setText('');
    setServings('1');
    inputRef.current?.focus();
  }

  async function handleAddPreset() {
    if (!selectedFood) return;
    const qty = parseServings(servings);
    setAdding(true);
    await onAdd({
      meal_number: number,
      food_name: qty === 1 ? selectedFood.name : `${selectedFood.name} × ${servings}`,
      protein: selectedFood.protein * qty,
      carbs:   selectedFood.carbs   * qty,
      fat:     selectedFood.fat     * qty,
      fiber:   selectedFood.fiber   * qty,
      serving_note: `${servings} × ${selectedFood.serving_label}`,
    });
    handleClear();
    setAdding(false);
  }

  async function handleParseAI() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/suggest/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
      handleClear();
    } catch {
      alert('Could not parse food text. Try again.');
    }
    setParsing(false);
  }

  const mealTotal = entries.reduce((acc, e) => ({
    protein: acc.protein + (e.protein || 0),
    carbs:   acc.carbs   + (e.carbs   || 0),
    fat:     acc.fat     + (e.fat     || 0),
    fiber:   acc.fiber   + (e.fiber   || 0),
  }), { protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const mealCal = Math.round(mealTotal.protein * 4 + mealTotal.carbs * 4 + mealTotal.fat * 9);

  return (
    <div className={`bg-slate-800 rounded-xl mb-3 ${isExpanded ? 'relative z-10' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors text-left ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-medium text-sm w-28">{MEAL_NAMES[number - 1]}</span>
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
          {/* Logged entries */}
          {entries.length > 0 && (
            <div className="mt-3 mb-3 space-y-1">
              {entries.map(e => (
                <div key={e.id} className="flex items-start justify-between bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200">{e.food_name}</span>
                    {e.serving_note && <span className="text-slate-500 ml-2 text-xs">({e.serving_note})</span>}
                    <div className="text-slate-500 text-xs mt-0.5">
                      {entryCalories(e)} kcal · P:{Math.round(e.protein)}g · C:{Math.round(e.carbs)}g · Fat:{Math.round(e.fat)}g · Fiber:{Math.round(e.fiber)}g
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

          {/* Unified input */}
          <div className="mt-3 relative" ref={dropdownRef}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search food or describe a meal…"
                value={text}
                onChange={e => { setText(e.target.value); if (selectedFood) setSelectedFood(null); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') selectedFood ? handleAddPreset() : handleParseAI();
                  if (e.key === 'Escape') handleClear();
                }}
                className="flex-1 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
              />

              {selectedFood ? (
                <>
                  <input
                    type="text"
                    value={servings}
                    onChange={e => setServings(e.target.value)}
                    className="w-16 bg-slate-700 text-slate-200 text-sm rounded-lg px-2 py-2 text-center outline-none focus:ring-1 focus:ring-blue-500"
                    title="Servings (e.g. 1, 0.5, 1/3)"
                    placeholder="1"
                  />
                  <button
                    onClick={handleAddPreset}
                    disabled={adding}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                  >
                    {adding ? '…' : 'Add'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-slate-500 hover:text-white text-lg leading-none px-1"
                    title="Clear"
                  >×</button>
                </>
              ) : (
                <button
                  onClick={handleParseAI}
                  disabled={!text.trim() || parsing}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {parsing ? '⏳' : '✨ AI'}
                </button>
              )}
            </div>

            {/* Preset dropdown */}
            {filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-slate-700 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                {filtered.map(f => (
                  <button
                    key={f.id}
                    onMouseDown={e => { e.preventDefault(); handleSelectFood(f); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="text-slate-200 truncate">{f.name}</span>
                    <span className="text-slate-500 text-xs shrink-0">{f.serving_label} · P:{f.protein}g</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
