import { useState } from "react";
import { ClipboardCheck, Calendar, Target, Plus, Flame, Utensils } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";

export default function DietPlans() {
  const { account, saveDietPlan } = useAuth();
  const plans = account.dietPlans || [];
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    planName: "",
    dailyCalories: "",
    proteinGoal: "",
    carbGoal: "",
    fatGoal: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    planStatus: "active"
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await saveDietPlan(form);
    if (res.ok) {
      setShowAdd(false);
      setForm({
        planName: "",
        dailyCalories: "",
        proteinGoal: "",
        carbGoal: "",
        fatGoal: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        planStatus: "active"
      });
    } else {
      setError(res.message || "Could not save diet plan.");
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Structure"
        title="Diet Plans"
        description="Define your nutritional phases, set calorie and macro targets, and manage your diet timeline."
        action={
          <Button onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : <><Plus size={18} /> New Plan</>}
          </Button>
        }
      />

      {showAdd && (
        <article className="panel animate-in">
          <h2>Create New Diet Plan</h2>
          <form onSubmit={handleSubmit} className="form-grid mt-md">
            <div className="full-width">
              <Input 
                label="Plan Name" 
                placeholder="e.g. Summer Cut, Winter Bulk..." 
                value={form.planName} 
                required 
                onChange={e => setForm({...form, planName: e.target.value})}
              />
            </div>
            <Input 
              label="Daily Calories" 
              type="number" 
              value={form.dailyCalories} 
              required 
              onChange={e => setForm({...form, dailyCalories: e.target.value})}
            />
            <Input 
              label="Protein Goal (g)" 
              type="number" 
              value={form.proteinGoal} 
              onChange={e => setForm({...form, proteinGoal: e.target.value})}
            />
            <Input 
              label="Carb Goal (g)" 
              type="number" 
              value={form.carbGoal} 
              onChange={e => setForm({...form, carbGoal: e.target.value})}
            />
            <Input 
              label="Fat Goal (g)" 
              type="number" 
              value={form.fatGoal} 
              onChange={e => setForm({...form, fatGoal: e.target.value})}
            />
            <Input 
              label="Start Date" 
              type="date" 
              value={form.startDate} 
              required 
              onChange={e => setForm({...form, startDate: e.target.value})}
            />
            <Input 
              label="End Date" 
              type="date" 
              value={form.endDate} 
              onChange={e => setForm({...form, endDate: e.target.value})}
            />
            <div className="form-actions">
              <Button type="submit">Activate Plan</Button>
            </div>
            {error && <p className="form-error full-width">{error}</p>}
          </form>
        </article>
      )}

      <div className="plans-list">
        {plans.length === 0 ? (
          <article className="panel text-center py-xl">
            <Utensils size={48} className="text-muted mx-auto mb-md" />
            <h2>No active plans</h2>
            <p className="text-muted">Create your first diet plan to start tracking against targets.</p>
          </article>
        ) : (
          plans.map((plan, idx) => (
            <article key={idx} className={`panel plan-card ${plan.planStatus === 'active' ? 'active-plan' : ''}`}>
              <div className="plan-card-header">
                <div>
                  <div className="badge">{plan.planStatus}</div>
                  <h2>{plan.planName}</h2>
                  <p className="text-muted">
                    <Calendar size={14} className="inline mr-xs" />
                    {plan.startDate} to {plan.endDate || 'Ongoing'}
                  </p>
                </div>
                <div className="plan-calories">
                  <Flame size={20} className="text-primary" />
                  <span><strong>{plan.dailyCalories}</strong> kcal</span>
                </div>
              </div>

              <div className="macro-grid mt-lg">
                <div className="macro-item">
                  <span className="eyebrow">Protein</span>
                  <strong>{plan.proteinGoal}g</strong>
                  <div className="macro-bar"><div style={{ width: '30%', backgroundColor: '#f87171' }}></div></div>
                </div>
                <div className="macro-item">
                  <span className="eyebrow">Carbs</span>
                  <strong>{plan.carbGoal}g</strong>
                  <div className="macro-bar"><div style={{ width: '50%', backgroundColor: '#60a5fa' }}></div></div>
                </div>
                <div className="macro-item">
                  <span className="eyebrow">Fats</span>
                  <strong>{plan.fatGoal}g</strong>
                  <div className="macro-bar"><div style={{ width: '20%', backgroundColor: '#fbbf24' }}></div></div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
