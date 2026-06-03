import { useState, useEffect, useCallback } from 'react';
import DaySetup from './components/DaySetup';
import MacroDashboard from './components/MacroDashboard';
import MealLogger from './components/MealLogger';
import AISuggestion from './components/AISuggestion';
import StreakSummary from './components/StreakSummary';
import WeeklyReport from './components/WeeklyReport';
import CustomFoodForm from './components/CustomFoodForm';
import ExerciseLogger from './components/ExerciseLogger';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr) {
  const today = localToday();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function loadPreset() {
  return localStorage.getItem('caloriePreset') || 'moderate';
}

export default function App() {
  const [date, setDate] = useState(localToday);
  const today = localToday();

  const [day, setDay] = useState(null);
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [foods, setFoods] = useState([]);
  const [history, setHistory] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [caloriePreset, setCaloriePreset] = useState(loadPreset);
  const [pendingDelete, setPendingDelete] = useState(null);

  const exerciseBurn = exercises.reduce((s, e) => s + (e.calories_burned || 0), 0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dayRes, mealsRes, totalsRes, foodsRes, historyRes, exerciseRes] = await Promise.all([
      fetch(`/api/meals/day/${date}`).then(r => r.json()),
      fetch(`/api/meals/${date}`).then(r => r.json()),
      fetch(`/api/meals/totals/${date}`).then(r => r.json()),
      fetch('/api/foods').then(r => r.json()),
      fetch('/api/meals/history/week').then(r => r.json()),
      fetch(`/api/exercise/${date}`).then(r => r.json()),
    ]);
    setDay(dayRes);
    setMeals(mealsRes);
    setTotals(totalsRes);
    setFoods(foodsRes);
    setHistory(historyRes);
    setExercises(exerciseRes);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleChangeCaloriePreset(preset) {
    setCaloriePreset(preset);
    localStorage.setItem('caloriePreset', preset);
  }

  async function handleSelectDayType(type) {
    const res = await fetch('/api/meals/day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, day_type: type }),
    });
    setDay(await res.json());
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

  function handleDeleteMeal(id) {
    // Flush any previous pending delete immediately
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      fetch(`/api/meals/entry/${pendingDelete.meal.id}`, { method: 'DELETE' });
    }

    const meal = meals.find(m => m.id === id);
    if (!meal) return;

    setMeals(prev => prev.filter(m => m.id !== id));
    setTotals(prev => ({
      protein: Math.max(0, prev.protein - (meal.protein || 0)),
      carbs:   Math.max(0, prev.carbs   - (meal.carbs   || 0)),
      fat:     Math.max(0, prev.fat     - (meal.fat     || 0)),
      fiber:   Math.max(0, prev.fiber   - (meal.fiber   || 0)),
    }));

    const timeoutId = setTimeout(() => {
      fetch(`/api/meals/entry/${id}`, { method: 'DELETE' });
      setPendingDelete(null);
    }, 3000);

    setPendingDelete({ meal, timeoutId });
  }

  function handleUndoDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    setMeals(prev => [...prev, pendingDelete.meal].sort((a, b) => a.id - b.id));
    setTotals(prev => ({
      protein: prev.protein + (pendingDelete.meal.protein || 0),
      carbs:   prev.carbs   + (pendingDelete.meal.carbs   || 0),
      fat:     prev.fat     + (pendingDelete.meal.fat     || 0),
      fiber:   prev.fiber   + (pendingDelete.meal.fiber   || 0),
    }));
    setPendingDelete(null);
  }

  async function handleMoveMeal(id, newMealNumber) {
    const res = await fetch(`/api/meals/entry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_number: newMealNumber }),
    });
    const updated = await res.json();
    setMeals(prev => prev.map(m => m.id === id ? updated : m));
  }

  async function handleAddExercise(entry) {
    const res = await fetch('/api/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, date }),
    });
    const ex = await res.json();
    setExercises(prev => [...prev, ex]);
  }

  async function handleDeleteExercise(id) {
    await fetch(`/api/exercise/${id}`, { method: 'DELETE' });
    setExercises(prev => prev.filter(e => e.id !== id));
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

        {/* Header: date nav row, then streak right-justified below */}
        <div className="space-y-1.5">
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
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              + Add food
            </button>
          </div>

          {/* Streak — left-justified, below date nav */}
          <div className="flex justify-start">
            <StreakSummary history={history} onSelectDate={setDate} />
          </div>
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
                exerciseBurn={exerciseBurn}
                caloriePreset={caloriePreset}
                onChangeCaloriePreset={handleChangeCaloriePreset}
              />
            )}

            <MealLogger
              meals={meals}
              foods={foods}
              date={date}
              dayType={day?.day_type || 'training'}
              onAdd={handleAddMeal}
              onDelete={handleDeleteMeal}
              onMove={handleMoveMeal}
              readOnly={!isToday && !day}
            />

            {day && (
              <ExerciseLogger
                exercises={exercises}
                onAdd={handleAddExercise}
                onDelete={handleDeleteExercise}
              />
            )}
          </>
        )}

        <WeeklyReport onSelectDate={setDate} caloriePreset={caloriePreset} />

        <div className="h-20" />
      </div>

      {/* Floating "What to eat?" button */}
      {day && isToday && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-6 right-6 z-40 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all text-3xl"
          title="What should I eat next?"
        >
          👨‍🍳
        </button>
      )}

      {/* AI Coach modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-6 sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAI(false)}
          />
          <div className="relative w-full max-w-md">
            <AISuggestion
              totals={totals}
              dayType={day.day_type}
              mealsLogged={mealsLogged}
              meals={meals}
              date={date}
              exerciseBurn={exerciseBurn}
              caloriePreset={caloriePreset}
              onClose={() => setShowAI(false)}
            />
          </div>
        </div>
      )}

      {showCustomForm && (
        <CustomFoodForm
          onAdd={food => setFoods(prev => [...prev, food])}
          onClose={() => setShowCustomForm(false)}
        />
      )}

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-700 border border-slate-600 text-slate-200 text-sm px-4 py-3 rounded-xl shadow-xl whitespace-nowrap">
          <span className="text-slate-400">Removed <span className="text-slate-200">{pendingDelete.meal.food_name}</span></span>
          <button
            onClick={handleUndoDelete}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
