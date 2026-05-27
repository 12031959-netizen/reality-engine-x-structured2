import { useState } from "react";
import { Utensils, Plus, Trash2, Droplets } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect } from "react";

export default function MealLogger() {
  const { account, saveFoodLog, refreshAccount, todayKey } = useAuth();
  const logs = account.foodLogs || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    mealName: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    waterintake: ""
  });

  useEffect(() => {
    if (typeof refreshAccount === "function") {
      refreshAccount();
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      date: todayKey
    };
    const res = await saveFoodLog(payload);
    if (res.ok) {
      setShowAdd(false);
      setForm({ mealName: "", calories: "", protein: "", carbs: "", fats: "", waterintake: "" });
    } else {
      alert(res.message || "Failed to log meal");
    }
  }

  const todayLogs = logs.filter(log => log.date === todayKey);

  return (
    <article className="panel mt-lg">
      <div className="panel-header">
        <div className="stat-icon"><Utensils size={20} /></div>
        <h2>Detailed Food Log</h2>
        <Button variant="ghost" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : <><Plus size={16} /> Add Meal</>}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="form-grid mt-md border-b pb-lg mb-lg">
          <div className="full-width">
            <Input 
              label="Meal Name" 
              placeholder="Breakfast, Snack, Lunch..." 
              value={form.mealName} 
              required 
              onChange={e => setForm({...form, mealName: e.target.value})}
            />
          </div>
          <Input label="Calories" type="number" value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} />
          <Input label="Protein (g)" type="number" value={form.protein} onChange={e => setForm({...form, protein: e.target.value})} />
          <Input label="Carbs (g)" type="number" value={form.carbs} onChange={e => setForm({...form, carbs: e.target.value})} />
          <Input label="Fats (g)" type="number" value={form.fats} onChange={e => setForm({...form, fats: e.target.value})} />
          <Input label="Water (L)" type="number" step="0.1" value={form.waterintake} onChange={e => setForm({...form, waterintake: e.target.value})} />
          <div className="form-actions">
            <Button type="submit">Log Meal</Button>
          </div>
        </form>
      )}

      <div className="meal-list mt-md">
        {todayLogs.length === 0 ? (
          <p className="text-muted italic">No individual meals logged for today yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Kcal</th>
                  <th>P</th>
                  <th>C</th>
                  <th>F</th>
                  <th>Water</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td><strong>{log.mealName}</strong></td>
                    <td>{log.calories}</td>
                    <td>{log.protein}g</td>
                    <td>{log.carbs}g</td>
                    <td>{log.fats}g</td>
                    <td>{log.waterintake}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
