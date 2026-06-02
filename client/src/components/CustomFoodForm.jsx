import { useState } from 'react';

export default function CustomFoodForm({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '', serving_label: '100g',
    protein: '', carbs: '', fat: '', fiber: '',
  });
  const [saving, setSaving] = useState(false);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          serving_label: form.serving_label,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fat: parseFloat(form.fat) || 0,
          fiber: parseFloat(form.fiber) || 0,
        }),
      });
      const food = await res.json();
      onAdd(food);
      onClose();
    } catch (e) {
      alert('Error saving food');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">Add Custom Food</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Food name *"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
          />
          <input
            placeholder="Serving size (e.g. 100g, 1 cup)"
            value={form.serving_label}
            onChange={e => set('serving_label', e.target.value)}
            className="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              ['protein', 'Protein (g)'],
              ['carbs', 'Carbs (g)'],
              ['fat', 'Fat (g)'],
              ['fiber', 'Fiber (g)'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  className="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
