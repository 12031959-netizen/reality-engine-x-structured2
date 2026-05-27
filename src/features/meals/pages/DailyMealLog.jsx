import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Flame, Plus, Scale, Trash2, Utensils } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import SectionHeader from "../../../components/shared/SectionHeader";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/apiClient";

const emptyMeal = {
  mealName: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  waterintake: ""
};

const emptyFoodEstimate = {
  foodId: "",
  grams: ""
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function getMealId(log) {
  return log.foodLogiD || log.foodLogID || log.foodLogId || log.id;
}

function calculateMacroCalories(meal) {
  return Math.round(toNumber(meal.protein) * 4 + toNumber(meal.carbs) * 4 + toNumber(meal.fats) * 9);
}

function calculateFoodMacros(food, grams) {
  const factor = toNumber(grams) / 100;

  return {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor),
    carbs: Math.round(food.carbs * factor),
    fats: Math.round(food.fats * factor)
  };
}

function mealItemsToForm(items) {
  const totals = calculateTotals(items);

  return {
    mealName: items.map((item) => item.name).join(" + "),
    calories: totals.calories ? String(Math.round(totals.calories)) : "",
    protein: totals.protein ? String(Math.round(totals.protein)) : "",
    carbs: totals.carbs ? String(Math.round(totals.carbs)) : "",
    fats: totals.fats ? String(Math.round(totals.fats)) : ""
  };
}

function calculateTotals(logs) {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + toNumber(log.calories),
      protein: totals.protein + toNumber(log.protein),
      carbs: totals.carbs + toNumber(log.carbs),
      fats: totals.fats + toNumber(log.fats),
      waterintake: totals.waterintake + toNumber(log.waterintake)
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      waterintake: 0
    }
  );
}

function groupLogsByDate(logs) {
  return logs.reduce((groups, log) => {
    const date = log.date || "No date";
    groups[date] = [...(groups[date] || []), log];
    return groups;
  }, {});
}

export default function DailyMealLog() {
  const { account, deleteFoodLog, refreshAccount, saveFoodLog, todayKey } = useAuth();
  const [foodCatalog, setFoodCatalog] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [expandedDate, setExpandedDate] = useState(todayKey);
  const [form, setForm] = useState(emptyMeal);
  const [foodEstimate, setFoodEstimate] = useState(emptyFoodEstimate);
  const [mealItems, setMealItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const logs = account?.foodLogs || [];
  const selectedLogs = logs.filter((log) => log.date === selectedDate);
  const totals = calculateTotals(selectedLogs);
  const macroCalories = calculateMacroCalories(form);
  const selectedFood = foodCatalog.find((food) => food.id === foodEstimate.foodId) || foodCatalog[0];
  const estimatedMacros = selectedFood
    ? calculateFoodMacros(selectedFood, foodEstimate.grams)
    : { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);
  const dailySummaries = Object.entries(groupedLogs)
    .map(([date, dateLogs]) => ({
      date,
      count: dateLogs.length,
      totals: calculateTotals(dateLogs)
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  useEffect(() => {
    refreshAccount?.();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFoodCatalog() {
      try {
        const result = await apiClient.get("/food-catalog");
        const foods = result.foods || [];

        if (!isMounted) return;
        setFoodCatalog(foods);
        setFoodEstimate((current) => ({
          ...current,
          foodId: current.foodId || foods[0]?.id || ""
        }));
      } catch (error) {
        if (isMounted) {
          setError(
            "Could not load meal foods from the database. Restart the API server so the /food-catalog route is active."
          );
        }
      }
    }

    loadFoodCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleHistoryDay(date) {
    setSelectedDate(date);
    setExpandedDate((current) => current === date ? "" : date);
  }

  function addEstimatedFood() {
    setError("");

    if (!selectedFood) {
      setError("Food catalog is not loaded from the database yet.");
      return;
    }

    if (!toNumber(foodEstimate.grams)) {
      setError("Enter grams for the selected food.");
      return;
    }

    const item = {
      id: `${selectedFood.id}-${Date.now()}`,
      name: selectedFood.name,
      grams: toNumber(foodEstimate.grams),
      ...estimatedMacros
    };
    const nextItems = [...mealItems, item];
    const nextForm = mealItemsToForm(nextItems);

    setMealItems(nextItems);
    setForm((current) => ({
      ...current,
      ...nextForm
    }));
    setFoodEstimate((current) => ({
      ...current,
      grams: ""
    }));
  }

  function removeMealItem(itemId) {
    const nextItems = mealItems.filter((item) => item.id !== itemId);
    const nextForm = mealItemsToForm(nextItems);

    setMealItems(nextItems);
    setForm((current) => ({
      ...current,
      mealName: nextForm.mealName,
      calories: nextForm.calories,
      protein: nextForm.protein,
      carbs: nextForm.carbs,
      fats: nextForm.fats
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.mealName.trim()) {
      setError("Enter a meal name first.");
      return;
    }

    const payload = {
      ...form,
      date: selectedDate,
      calories: form.calories || (macroCalories > 0 ? String(macroCalories) : "")
    };

    setSaving(true);
    const result = await saveFoodLog(payload);
    setSaving(false);

    if (result.ok) {
      setForm(emptyMeal);
      setMealItems([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } else {
      setError(result.message || "Could not save this meal.");
    }
  }

  async function handleDelete(log) {
    const mealId = getMealId(log);
    if (!mealId) {
      setError("This meal has no saved id, so it cannot be deleted.");
      return;
    }

    const result = await deleteFoodLog(mealId);
    if (!result.ok) {
      setError(result.message || "Could not delete this meal.");
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Daily meal log"
        title="Meals and Macro Calculator"
        description="Log each meal by date, calculate calories from macros, and review daily totals for calories, protein, carbs, and fats."
      />

      <section className="meal-log-layout">
        <article className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Add meal</p>
              <h2>Meal details</h2>
            </div>
            <div className="stat-icon">
              <Utensils size={20} />
            </div>
          </div>

          <form className="meal-log-form" onSubmit={handleSubmit}>
            <Input
              label="Log date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Input
              label="Meal name"
              placeholder="Breakfast, chicken rice, snack..."
              value={form.mealName}
              onChange={(event) => updateField("mealName", event.target.value)}
            />

            <div className="food-estimator">
              <div className="food-estimator-header">
                <div>
                  <span>Food estimator</span>
                  <strong>{formatNumber(estimatedMacros.calories)} kcal</strong>
                </div>
                <small>
                  P {formatNumber(estimatedMacros.protein)}g / C {formatNumber(estimatedMacros.carbs)}g / F {formatNumber(estimatedMacros.fats)}g
                </small>
              </div>

              <div className="macro-input-grid">
                <label className="form-field">
                  <span>Known food</span>
                  <select
                    value={foodEstimate.foodId}
                    onChange={(event) => setFoodEstimate((current) => ({
                      ...current,
                      foodId: event.target.value
                    }))}
                  >
                    {foodCatalog.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name}
                      </option>
                    ))}
                  </select>
                  <small>
                    {foodCatalog.length
                      ? "Nutrition is loaded from the database per 100g."
                      : "Loading foods from database..."}
                  </small>
                </label>

                <Input
                  label="Amount (g)"
                  type="number"
                  min="0"
                  value={foodEstimate.grams}
                  onChange={(event) => setFoodEstimate((current) => ({
                    ...current,
                    grams: event.target.value
                  }))}
                />
              </div>

              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={addEstimatedFood}>
                  <Plus size={16} />
                  Add Food To Meal
                </Button>
              </div>

              {mealItems.length > 0 && (
                <div className="meal-builder-list">
                  {mealItems.map((item) => (
                    <div className="meal-builder-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{formatNumber(item.grams)}g / {formatNumber(item.calories)} kcal</span>
                      </div>
                      <small>
                        P {formatNumber(item.protein)}g / C {formatNumber(item.carbs)}g / F {formatNumber(item.fats)}g
                      </small>
                      <button
                        type="button"
                        className="action-btn delete"
                        aria-label="Remove food"
                        onClick={() => removeMealItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="macro-input-grid">
              <Input
                label="Protein (g)"
                type="number"
                min="0"
                value={form.protein}
                onChange={(event) => updateField("protein", event.target.value)}
              />
              <Input
                label="Carbs (g)"
                type="number"
                min="0"
                value={form.carbs}
                onChange={(event) => updateField("carbs", event.target.value)}
              />
              <Input
                label="Fat (g)"
                type="number"
                min="0"
                value={form.fats}
                onChange={(event) => updateField("fats", event.target.value)}
              />
            </div>

            <div className="macro-calorie-preview">
              <div>
                <span>Macro formula</span>
                <strong>{formatNumber(macroCalories)} kcal</strong>
              </div>
              <small>Protein x4 + carbs x4 + fat x9</small>
            </div>

            <div className="macro-input-grid">
              <Input
                label="Calories"
                type="number"
                min="0"
                placeholder={macroCalories ? String(macroCalories) : "Auto from macros"}
                value={form.calories}
                onChange={(event) => updateField("calories", event.target.value)}
              />
              <Input
                label="Water (L)"
                type="number"
                min="0"
                step="0.1"
                value={form.waterintake}
                onChange={(event) => updateField("waterintake", event.target.value)}
              />
            </div>

            <div className="form-actions">
              <Button type="submit" disabled={saving}>
                <Plus size={17} />
                {saving ? "Saving..." : "Save Meal"}
              </Button>
            </div>

            <Toast type="success" message={saved ? "Meal saved for selected day." : ""} />
            <Toast type="error" message={error} />
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Selected day</p>
              <h2>{selectedDate}</h2>
            </div>
            <Button variant="ghost" onClick={() => setSelectedDate(todayKey)}>
              Today
            </Button>
          </div>

          <div className="meal-total-grid">
            <MacroTotal icon={Flame} label="Calories" value={formatNumber(totals.calories)} suffix="kcal" />
            <MacroTotal icon={Scale} label="Protein" value={formatNumber(totals.protein)} suffix="g" />
            <MacroTotal icon={Scale} label="Carbs" value={formatNumber(totals.carbs)} suffix="g" />
            <MacroTotal icon={Scale} label="Fat" value={formatNumber(totals.fats)} suffix="g" />
          </div>

          {selectedLogs.length === 0 ? (
            <p className="text-muted">No meals saved for this day yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Meal</th>
                    <th>Kcal</th>
                    <th>Protein</th>
                    <th>Carbs</th>
                    <th>Fat</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLogs.map((log) => (
                    <tr key={getMealId(log) || `${log.date}-${log.mealName}`}>
                      <td><strong>{log.mealName || "Meal"}</strong></td>
                      <td>{formatNumber(log.calories)}</td>
                      <td>{formatNumber(log.protein)}g</td>
                      <td>{formatNumber(log.carbs)}g</td>
                      <td>{formatNumber(log.fats)}g</td>
                      <td>
                        <button
                          type="button"
                          className="action-btn delete"
                          aria-label="Delete meal"
                          onClick={() => handleDelete(log)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Saved days</p>
            <h2>Daily macro history</h2>
          </div>
          <div className="stat-icon">
            <CalendarDays size={20} />
          </div>
        </div>

        {dailySummaries.length === 0 ? (
          <p className="text-muted">No meal days saved yet.</p>
        ) : (
          <div className="meal-day-grid">
            {dailySummaries.map((summary) => (
              <div
                className={`meal-day-entry ${summary.date === selectedDate ? "active" : ""}`}
                key={summary.date}
              >
                <button
                  type="button"
                  className="meal-day-row"
                  onClick={() => toggleHistoryDay(summary.date)}
                >
                  <span>{summary.date}</span>
                  <strong>{formatNumber(summary.totals.calories)} kcal</strong>
                  <small>
                    {summary.count} meals / P {formatNumber(summary.totals.protein)}g / C {formatNumber(summary.totals.carbs)}g / F {formatNumber(summary.totals.fats)}g
                  </small>
                </button>

                {expandedDate === summary.date && (
                  <div className="meal-day-meals">
                    {groupedLogs[summary.date].map((log) => (
                      <div
                        className="meal-day-meal"
                        key={getMealId(log) || `${log.date}-${log.mealName}`}
                      >
                        <strong>{log.mealName || "Meal"}</strong>
                        <span>{formatNumber(log.calories)} kcal</span>
                        <span>P {formatNumber(log.protein)}g</span>
                        <span>C {formatNumber(log.carbs)}g</span>
                        <span>F {formatNumber(log.fats)}g</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

function MacroTotal({ icon: Icon, label, value, suffix }) {
  return (
    <div className="macro-total">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
    </div>
  );
}
