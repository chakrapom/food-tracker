import { useState, useEffect, useCallback } from 'react';
import DaySetup from './components/DaySetup';
import MacroDashboard from './components/MacroDashboard';
import MealLogger from './components/MealLogger';
import AISuggestion from './components/AISuggestion';
import StreakSummary from './components/StreakSummary';
import WeeklyReport from './components/WeeklyReport';
import CustomFoodForm from './components/CustomFoodForm';

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr) {
  const today = localToday();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

export default function App() {
  const [date, setDate] = useState(localToday);
  const today = localToday();

  const [day, setDay] = useState(null);
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [foods, setFoods] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dayRes, mealsRes, totalsRes, foodsRes, historyRes] = await Promise.all([
      fetch(`/api/meals/day/${date}`).then(r => r.json()),
      fetch(`/api/meals/${date}`).then(r => r.json()),
      fetch(`/api/meals/totals/${date}`).then(r => r.json()),
      fetch('/api/foods').then(r => r.json()),
      fetch('/api/meals/history/week').then(r => r.json()),
    ]);
    setDay(dayRes);
    setMeals(mealsRes);
    setTotals(totalsRes);
    setFoods(foodsRes);
    setHistory(historyRes);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleSelectDayType(type) {
    const res = await fetch('/api/meals/day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, day_type: type }),
    });
    const newDay = await res.json();
    setDay(newDay);
  }

  async function handleChangeDayType() {
    await handleSelectDayType(day?.day_type === 'training' ? 'rest' : 'training');
  }

  async function handleAddMeal(entry) {
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const meal = await res.json();
    setMeals(prev => [...prev, meal]);
    setTotals(prev => ({
      protein: prev.protein + (meal.protein || 0),
      carbs:   prev.carbs   + (meal.carbs   || 0),
      fat:     prev.fat     + (meal.fat     || 0),
      fiber:   prev.fiber   + (meal.fiber   || 0),
    }));
  }

  async function handleDeleteMeal(id) {
    const meal = meals.find(m => m.id === id);
    await fetch(`/api/meals/entry/${id}`, { method: 'DELETE' });
    setMeals(prev => prev.filter(m => m.id !== id));
    if (meal) {
      setTotals(prev => ({
        protein: Math.max(0, prev.protein - (meal.protein || 0)),
        carbs:   Math.max(0, prev.carbs   - (meal.carbs   || 0)),
        fat:     Math.max(0, prev.fat     - (meal.fat     || 0)),
        fiber:   Math.max(0, prev.fiber   - (meal.fiber   || 0)),
      }));
    }
  }

  const isToday = date === today;
  const mealsLogged = [...new Set(meals.map(m => m.meal_number))].length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!day && isToday) {
    return <DaySetup date={date} onSelect={handleSelectDayType} />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* App name */}
        <div className="text-center pt-2 pb-1">
          <span className="text-2xl font-bold text-white tracking-tight">Jimmy Eats 🍖</span>
        </div>

        {/* Header with date navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDate(d => addDays(d, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors text-lg"
            >‹</button>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {formatDisplayDate(date)}
              </h1>
              <p className="text-slate-500 text-xs">{date}</p>
            </div>
            <button
              onClick={() => setDate(d => addDays(d, 1))}
              disabled={isToday}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors text-lg"
            >›</button>
            {!isToday && (
              <button
                onClick={() => setDate(today)}
                className="text-xs px-2 py-1 rounded-md bg-blue-700 hover:bg-blue-600 text-white transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCustomForm(true)}
            className="text-xs px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            + Add food
          </button>
        </div>

        {/* Past day with no data */}
        {!day && !isToday ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-lg mb-2">No data for this day</p>
            <p className="text-slate-600 text-sm">Nothing was logged on {date}</p>
          </div>
        ) : (
          <>
            {day && (
              <MacroDashboard
                totals={totals}
                dayType={day.day_type}
                onChangeDayType={handleChangeDayType}
              />
            )}

            <MealLogger
              meals={meals}
              foods={foods}
              date={date}
              dayType={day?.day_type || 'training'}
              onAdd={handleAddMeal}
              onDelete={handleDeleteMeal}
              readOnly={!isToday && !day}
            />

            {day && isToday && (
              <AISuggestion
                totals={totals}
                dayType={day.day_type}
                mealsLogged={mealsLogged}
                date={date}
              />
            )}
          </>
        )}

        <StreakSummary history={history} onSelectDate={setDate} />

        <WeeklyReport onSelectDate={setDate} />

        <div className="h-8" />
      </div>

      {showCustomForm && (
        <CustomFoodForm
          onAdd={food => setFoods(prev => [...prev, food])}
          onClose={() => setShowCustomForm(false)}
        />
      )}
    </div>
  );
}
