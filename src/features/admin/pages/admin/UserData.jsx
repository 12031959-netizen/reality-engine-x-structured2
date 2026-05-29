import { useEffect, useMemo, useState } from "react";
import "../../admin-styles.css";
import {
  Brain,
  Eye,
  Gauge,
  LineChart,
  ListChecks,
  Search,
  Target,
  Utensils,
  X
} from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

const tabs = [
  { key: "failureRisks", label: "Failure Risk", icon: Gauge },
  { key: "dietPlans", label: "Diet Plans", icon: Target },
  { key: "mealLogs", label: "Meal Log", icon: Utensils },
  { key: "moodLogs", label: "Mood Log", icon: Brain },
  { key: "progress", label: "Progress Tracking", icon: LineChart },
  { key: "recommendations", label: "Recommendations", icon: ListChecks }
];

const emptyData = {
  failureRisks: [],
  dietPlans: [],
  mealLogs: [],
  moodLogs: [],
  progress: [],
  recommendations: []
};

function formatValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function formatNumber(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number}${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
}

function userLabel(record) {
  return record.userName || record.email || record.userId || "Unknown user";
}

function avatarInitial(record) {
  return String(userLabel(record)).trim().charAt(0).toUpperCase() || "U";
}

function joinList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => {
        const detail = entry && typeof entry === "object" ? JSON.stringify(entry) : entry;
        return `${key}: ${detail}`;
      })
      .join(", ");
  }

  return formatValue(value, "No saved detail.");
}

function getDateLabel(tabKey, record) {
  if (tabKey === "dietPlans") return formatDate(record.startDate);
  return formatDate(record.date);
}

function getPrimary(tabKey, record) {
  switch (tabKey) {
    case "failureRisks":
      return `${formatNumber(record.riskScore, "%")} ${formatValue(record.riskLevel, "risk")}`;
    case "dietPlans":
      return formatValue(record.planName, "Diet plan");
    case "mealLogs":
      return formatValue(record.mealName, "Meal entry");
    case "moodLogs":
      return `Mood ${formatNumber(record.moodLevel, "/10")}`;
    case "progress":
      return `Weight ${formatNumber(record.weight, " kg")}`;
    case "recommendations":
      return formatValue(record.recommendationType, "Recommendation");
    default:
      return "-";
  }
}

function getSummary(tabKey, record) {
  switch (tabKey) {
    case "failureRisks":
      return record.riskMessage || joinList(record.reasons);
    case "dietPlans":
      return `${formatNumber(record.dailyCalories, " kcal")} daily, ${formatNumber(record.proteinGoal, "g")} protein`;
    case "mealLogs":
      return `${formatNumber(record.calories, " kcal")} | P ${formatNumber(record.protein, "g")} C ${formatNumber(record.carbs, "g")} F ${formatNumber(record.fats, "g")}`;
    case "moodLogs":
      return `Stress ${formatNumber(record.stressLevel, "/10")}, cravings ${formatNumber(record.cravingLevel, "/10")}, sleep ${formatNumber(record.sleepHours, "h")}`;
    case "progress":
      return record.progressNote || `Consistency ${formatNumber(record.consistencyScore, "/100")}`;
    case "recommendations":
      return formatValue(record.recommendationText, "No recommendation text saved.");
    default:
      return "-";
  }
}

function detailItems(tabKey, record) {
  switch (tabKey) {
    case "failureRisks":
      return [
        ["Date", getDateLabel(tabKey, record)],
        ["Risk Score", `${formatNumber(record.riskScore, "%")}`],
        ["Risk Level", formatValue(record.riskLevel)],
        ["Created At", formatValue(record.createdAt)],
        ["Message", formatValue(record.riskMessage, "No message saved."), true],
        ["Reasons", joinList(record.reasons), true],
        ["Insights", joinList(record.insights), true],
        ["Metrics", joinList(record.metrics), true]
      ];
    case "dietPlans":
      return [
        ["Plan Name", formatValue(record.planName)],
        ["Status", formatValue(record.planStatus)],
        ["Start Date", formatValue(record.startDate)],
        ["End Date", formatValue(record.endDate)],
        ["Daily Calories", formatNumber(record.dailyCalories, " kcal")],
        ["Protein Goal", formatNumber(record.proteinGoal, "g")],
        ["Carb Goal", formatNumber(record.carbGoal, "g")],
        ["Fat Goal", formatNumber(record.fatGoal, "g")]
      ];
    case "mealLogs":
      return [
        ["Date", getDateLabel(tabKey, record)],
        ["Meal", formatValue(record.mealName)],
        ["Calories", formatNumber(record.calories, " kcal")],
        ["Water", formatNumber(record.waterintake, " L")],
        ["Protein", formatNumber(record.protein, "g")],
        ["Carbs", formatNumber(record.carbs, "g")],
        ["Fats", formatNumber(record.fats, "g")]
      ];
    case "moodLogs":
      return [
        ["Date", getDateLabel(tabKey, record)],
        ["Mood", formatNumber(record.moodLevel, "/10")],
        ["Stress", formatNumber(record.stressLevel, "/10")],
        ["Cravings", formatNumber(record.cravingLevel, "/10")],
        ["Sleep", formatNumber(record.sleepHours, "h")],
        ["Motivation", formatNumber(record.motivationLevel, "/10")],
        ["Consistency", formatValue(record.consistencyStatus)]
      ];
    case "progress":
      return [
        ["Date", getDateLabel(tabKey, record)],
        ["Weight", formatNumber(record.weight, " kg")],
        ["Consistency Score", formatNumber(record.consistencyScore, "/100")],
        ["Body Measurement", formatValue(record.bodyMeasurement, "No measurement saved."), true],
        ["Progress Note", formatValue(record.progressNote, "No note saved."), true]
      ];
    case "recommendations":
      return [
        ["Date", getDateLabel(tabKey, record)],
        ["Type", formatValue(record.recommendationType)],
        ["Prediction ID", formatValue(record.predictionID)],
        ["Recommendation", formatValue(record.recommendationText, "No recommendation text saved."), true]
      ];
    default:
      return [];
  }
}

function buildFailureRecommendationText(risk) {
  const metrics = risk.metrics || {};
  const reasons = risk.reasons || [];
  const actions = [];

  if (metrics.proteinTarget && metrics.protein < metrics.proteinTarget * 0.75) {
    actions.push("Add a lean protein serving to the next meal.");
  }

  if (metrics.waterTarget && metrics.water < metrics.waterTarget * 0.75) {
    actions.push("Bring water intake closer to the hydration target.");
  }

  if (Number(metrics.sleep) < 6) {
    actions.push("Protect tonight's sleep window before adding more diet pressure.");
  }

  if (Number(metrics.stress) >= 7) {
    actions.push("Use a lower-stress meal plan and reduce decision fatigue today.");
  }

  if (Number(metrics.cravings) >= 7) {
    actions.push("Plan one controlled snack before cravings turn into overeating.");
  }

  if (!actions.length && reasons.length) {
    actions.push(reasons[0]);
  }

  if (!actions.length) {
    actions.push("Keep logging meals, mood, water, and sleep so the plan stays measurable.");
  }

  return `${risk.riskLevel || "Failure Risk"} (${Number(risk.riskScore) || 0}%): ${actions.slice(0, 3).join(" ")}`;
}

function withUser(record, account, idKey = "id") {
  return {
    ...record,
    id: record[idKey] || record.id,
    userId: record.userId || record.userID || record.user_id || account.id,
    userName: record.userName || account.fullName || account.name || account.username,
    email: record.email || account.email
  };
}

function normalizeAccountData(accounts = []) {
  return accounts.reduce((result, account) => {
    (account.failureRiskHistory || []).forEach((risk) => {
      result.failureRisks.push({
        ...withUser(risk, account),
        userId: risk.user_id || account.id,
        date: risk.date || risk.checkInDate,
        createdAt: risk.createdAt
      });
    });

    (account.dietPlans || []).forEach((plan) => {
      result.dietPlans.push(withUser(plan, account, "planID"));
    });

    (account.foodLogs || []).forEach((log) => {
      result.mealLogs.push(withUser(log, account, "foodLogiD"));
    });

    (account.moodLogs || []).forEach((log) => {
      result.moodLogs.push(withUser(log, account, "moodLogiD"));
    });

    (account.progressHistory || []).forEach((entry) => {
      result.progress.push(withUser(entry, account, "progressID"));
    });

    (account.recommendationHistory || []).forEach((recommendation) => {
      result.recommendations.push(withUser(recommendation, account, "recommendationID"));
    });

    const recommendationKeys = new Set(
      result.recommendations.map((recommendation) =>
        `${recommendation.userId}|${recommendation.date}|${recommendation.recommendationType}`
      )
    );

    (account.failureRiskHistory || []).forEach((risk) => {
      const date = risk.date || risk.checkInDate;
      const key = `${account.id}|${date}|Failure Risk Recommendation`;
      if (recommendationKeys.has(key)) return;

      result.recommendations.push({
        id: `failure-risk-${risk.id}`,
        userId: account.id,
        userName: account.fullName || account.name || account.username,
        email: account.email,
        date,
        predictionID: null,
        recommendationType: "Failure Risk Recommendation",
        recommendationText: buildFailureRecommendationText(risk)
      });
      recommendationKeys.add(key);
    });

    return result;
  }, {
    failureRisks: [],
    dietPlans: [],
    mealLogs: [],
    moodLogs: [],
    progress: [],
    recommendations: []
  });
}

export default function UserData({ setActiveRoute }) {
  const [activeTab, setActiveTab] = useState("failureRisks");
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  async function fetchUserData() {
    setLoading(true);

    try {
      const response = await apiClient.get("/admin/user-data");
      setData({
        failureRisks: response.failureRisks || [],
        dietPlans: response.dietPlans || [],
        mealLogs: response.mealLogs || [],
        moodLogs: response.moodLogs || [],
        progress: response.progress || [],
        recommendations: response.recommendations || []
      });
      setSelectedRecord(null);
    } catch (error) {
      try {
        const accountList = await apiClient.get("/admin/accounts");
        const userAccounts = (accountList.accounts || []).filter((account) => account.role !== "admin");
        const fullAccounts = await Promise.all(
          userAccounts.map((account) =>
            apiClient.get(`/accounts/${account.id || account.userID}`).then((response) => response.account)
          )
        );

        setData(normalizeAccountData(fullAccounts.filter(Boolean)));
        setSelectedRecord(null);
      } catch (fallbackError) {
        console.error("Failed to fetch user saved data", error, fallbackError);
        setData(emptyData);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserData();
  }, []);

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const activeRows = data[activeTab] || [];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeRows;

    return activeRows.filter((record) =>
      [
        record.userId,
        record.userName,
        record.email,
        record.date,
        record.startDate,
        getPrimary(activeTab, record),
        getSummary(activeTab, record)
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term))
    );
  }, [activeRows, activeTab, search]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    setSelectedRecord(null);
  }

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="User saved data"
        title="User Data"
        description="Read the real saved records users create from failure risk, diet plans, meal log, mood log, progress tracking, and recommendations."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <Button variant="ghost" onClick={fetchUserData}>
              Refresh
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search user, email, date, or detail..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        }
      />

      <section className="admin-data-tabs" aria-label="User data feature tabs">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? "active" : ""}
            onClick={() => handleTabChange(key)}
          >
            <Icon size={17} />
            <span>{label}</span>
            <strong>{data[key]?.length || 0}</strong>
          </button>
        ))}
      </section>

      <div className="admin-grid">
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>{activeTabConfig.label}</h2>
            <span className="badge">{filteredRows.length} Records</span>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Main</th>
                  <th>Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((record) => (
                  <tr
                    key={`${activeTab}-${record.id}`}
                    className={selectedRecord?.id === record.id ? "selected" : ""}
                  >
                    <td>{getDateLabel(activeTab, record)}</td>
                    <td>
                      <div className="user-info-cell">
                        <div className="avatar-small">{avatarInitial(record)}</div>
                        <span>
                          {userLabel(record)}
                          <small>{record.email ? record.email : record.userId}</small>
                        </span>
                      </div>
                    </td>
                    <td>{getPrimary(activeTab, record)}</td>
                    <td className="admin-summary-cell">{getSummary(activeTab, record)}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn view"
                        type="button"
                        title="View"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="admin-empty-inline">
                No saved records found for this feature.
              </div>
            )}
          </div>
        </section>

        {selectedRecord && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>Saved Record</h2>
              <button
                className="close-btn"
                type="button"
                onClick={() => setSelectedRecord(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="user-details">
              <div className="detail-hero">
                <div className="avatar-large">{avatarInitial(selectedRecord)}</div>
                <h3>{userLabel(selectedRecord)}</h3>
                <p>{selectedRecord.userId}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>User Email</label>
                  <p>{formatValue(selectedRecord.email, "No email")}</p>
                </div>
                <div className="detail-item">
                  <label>Feature</label>
                  <p>{activeTabConfig.label}</p>
                </div>
                {detailItems(activeTab, selectedRecord).map(([label, value, fullWidth]) => (
                  <div
                    className={`detail-item ${fullWidth ? "full-width" : ""}`}
                    key={label}
                  >
                    <label>{label}</label>
                    <p className={fullWidth ? "notes-box" : ""}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
