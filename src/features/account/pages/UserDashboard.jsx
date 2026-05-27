import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";

export default function UserDashboard() {
  const { account, logout, updateAccount } = useAuth();
  const dietProfile = account?.dietProfile || {};
  const [form, setForm] = useState({
    fullName: account?.fullName || account?.name || "",
    username: account?.username || "",
    email: account?.email || "",
    password: ""
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      fullName: account?.fullName || account?.name || "",
      username: account?.username || "",
      email: account?.email || "",
      password: ""
    });
  }, [account?.fullName, account?.name, account?.username, account?.email]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      fullName: form.fullName,
      username: form.username,
      email: form.email
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    const res = await updateAccount(payload);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } else {
      setError(res.message || "Could not save account information.");
    }
  }

  function handleEditDietProfile() {
    updateAccount({
      dietProfile: {
        ...dietProfile,
        completed: false
      }
    });
  }

  const profileRows = [
    ["Person name", dietProfile.personName],
    ["Age", dietProfile.age],
    ["Gender", dietProfile.gender],
    ["Height", dietProfile.heightCm ? `${dietProfile.heightCm} cm` : ""],
    [
      "Current weight",
      dietProfile.currentWeightKg ? `${dietProfile.currentWeightKg} kg` : ""
    ],
    [
      "Target weight",
      dietProfile.targetWeightKg ? `${dietProfile.targetWeightKg} kg` : ""
    ],
    ["Main goal", dietProfile.goal],
    ["Activity level", dietProfile.activityLevel],
    ["Diet style", dietProfile.dietStyle],
    ["Meals per day", dietProfile.mealsPerDay],
    ["Allergies", dietProfile.allergies],
    ["Target date", dietProfile.targetDate],
    ["Health conditions", dietProfile.healthConditions],
    ["Notes", dietProfile.notes]
  ];

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Access control"
        title="Profile"
        description="Manage your account information and login credentials."
        action={
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              logout();
            }}
          >
            <LogOut size={18} />
            Logout
          </Button>
        }
      />

      <section className="page-stack">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <p className="eyebrow">User profile</p>
          <h2>Account Information</h2>

          <div className="form-grid">
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
            />
            <Input
              label="Username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </div>

          <div className="form-actions">
            <Button type="submit">Save Changes</Button>
          </div>

          <Toast type="success" message={saved ? "Account information saved." : ""} />
          <Toast type="error" message={error} />
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Diet profile</p>
            <h2>Diet Profile Information</h2>
          </div>

          <Button variant="ghost" onClick={handleEditDietProfile}>
            Edit Profile
          </Button>
        </div>

        <div className="profile-summary">
          {profileRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value || "Not provided"}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
