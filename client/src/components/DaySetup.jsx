export default function DaySetup({ date, onSelect }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-2xl p-10 max-w-md w-full mx-4 shadow-2xl text-center">
        <div className="text-5xl mb-4">🏋️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Good morning!</h1>
        <p className="text-slate-400 mb-8">{date}</p>
        <p className="text-slate-300 mb-6 text-lg">What type of day is today?</p>
        <div className="flex gap-4">
          <button
            onClick={() => onSelect('training')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            💪 Training Day
            <div className="text-sm font-normal text-emerald-200 mt-1">Carbs: 40g</div>
          </button>
          <button
            onClick={() => onSelect('rest')}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            😴 Rest Day
            <div className="text-sm font-normal text-slate-300 mt-1">Carbs: 20g</div>
          </button>
        </div>
      </div>
    </div>
  );
}
