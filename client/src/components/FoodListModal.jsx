import { useState } from 'react';
import CustomFoodForm from './CustomFoodForm';

export default function FoodListModal({ foods, onAdd, onDelete, onClose }) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleDelete(food) {
    await fetch(`/api/foods/${food.id}`, { method: 'DELETE' });
    onDelete(food.id);
  }

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <h3 className="text-white font-bold text-lg">Food Library</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >+ Add food</button>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none px-1">×</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 shrink-0">
          <input
            type="text"
            placeholder="Search foods…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 px-5 pb-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 font-medium w-1/2">Food</th>
                <th className="text-left py-2 font-medium">Serving</th>
                <th className="text-right py-2 font-medium">P</th>
                <th className="text-right py-2 font-medium">C</th>
                <th className="text-right py-2 font-medium">Fat</th>
                <th className="text-right py-2 font-medium">Fib</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-2 pr-2">
                    <span className="text-slate-200">{f.name}</span>
                    {f.is_custom ? <span className="ml-1.5 text-xs text-blue-400">custom</span> : null}
                  </td>
                  <td className="py-2 pr-2 text-slate-400 text-xs">{f.serving_label}</td>
                  <td className="py-2 text-right text-slate-300">{f.protein}g</td>
                  <td className="py-2 text-right text-slate-300">{f.carbs}g</td>
                  <td className="py-2 text-right text-slate-300">{f.fat}g</td>
                  <td className="py-2 text-right text-slate-300">{f.fiber}g</td>
                  <td className="py-2 pl-2 text-right">
                    {f.is_custom ? (
                      <button
                        onClick={() => handleDelete(f)}
                        className="text-slate-600 hover:text-red-400 text-lg leading-none transition-colors"
                      >×</button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">No foods match "{search}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <CustomFoodForm
          onAdd={food => { onAdd(food); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
