import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Eye, Edit2, X, Search, Utensils, Target } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Diets({ setActiveRoute }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/diet-profiles");
      setProfiles(response.dietProfiles || []);
    } catch (error) {
      console.error("Failed to fetch diet profiles", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (profile) => {
    setSelectedProfile(profile);
    setIsEditing(false);
  };

  const handleEdit = (profile) => {
    setSelectedProfile(profile);
    setEditForm({ ...profile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedProfile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const dietProfile = {
      personName: editForm.person_name,
      age: editForm.age,
      gender: editForm.gender,
      heightCm: editForm.height_cm,
      currentWeightKg: editForm.current_weight_kg,
      targetWeightKg: editForm.target_weight_kg,
      goal: editForm.goal,
      activityLevel: editForm.activity_level,
      dietStyle: editForm.diet_style,
      mealsPerDay: editForm.meals_per_day,
      allergies: editForm.allergies,
      healthConditions: editForm.health_conditions,
      targetDate: editForm.target_date,
      notes: editForm.notes,
      completed: editForm.completed
    };

    try {
      await apiClient.put(`/accounts/${selectedProfile.user_id}`, { dietProfile });
      setProfiles(profiles.map(p => p.user_id === selectedProfile.user_id ? { ...p, ...editForm } : p));
      setIsEditing(false);
      setSelectedProfile(null);
    } catch (error) {
      alert("Failed to update diet profile");
    }
  };

  const filteredProfiles = profiles.filter(p => 
    (p.person_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.goal || "").toLowerCase().includes(search.toLowerCase()) ||
    String(p.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Management"
        title="Diet Profiles"
        description="Oversee user health goals, physical attributes, and personalized diet configurations."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search profiles..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="admin-grid">
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Active Profiles</h2>
            <span className="badge">{filteredProfiles.length} Profiles</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / Name</th>
                  <th>Goal</th>
                  <th>Weight</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => (
                  <tr key={p.user_id} className={selectedProfile?.user_id === p.user_id ? "selected" : ""}>
                    <td>
                      <div className="user-info-cell">
                        <div className="avatar-small"><Utensils size={14} /></div>
                        <span>{p.person_name || p.user_id}</span>
                      </div>
                    </td>
                    <td>{p.goal || "Not set"}</td>
                    <td>{p.current_weight_kg ? `${p.current_weight_kg} kg` : "-"}</td>
                    <td>{p.target_weight_kg ? `${p.target_weight_kg} kg` : "-"}</td>
                    <td>
                      <span className={`status-pill ${p.completed ? "completed" : "pending"}`}>
                        {p.completed ? "Completed" : "In Progress"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn view" title="View" onClick={() => handleView(p)}><Eye size={16} /></button>
                      <button className="action-btn edit" title="Edit" onClick={() => handleEdit(p)}><Edit2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(selectedProfile || isEditing) && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>{isEditing ? "Edit Profile" : "Profile Details"}</h2>
              <button className="close-btn" onClick={handleCancel}><X size={20} /></button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="edit-form">
                <div className="form-group">
                  <label>Person Name</label>
                  <Input 
                    value={editForm.person_name || ""} 
                    onChange={(e) => setEditForm({...editForm, person_name: e.target.value})}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age</label>
                    <Input 
                      type="number"
                      value={editForm.age || ""} 
                      onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select 
                      className="admin-select"
                      value={editForm.gender || ""} 
                      onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Goal</label>
                  <Input 
                    value={editForm.goal || ""} 
                    onChange={(e) => setEditForm({...editForm, goal: e.target.value})}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <Input 
                      type="number"
                      value={editForm.current_weight_kg || ""} 
                      onChange={(e) => setEditForm({...editForm, current_weight_kg: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Target (kg)</label>
                    <Input 
                      type="number"
                      value={editForm.target_weight_kg || ""} 
                      onChange={(e) => setEditForm({...editForm, target_weight_kg: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                  <Button type="submit">Update Profile</Button>
                </div>
              </form>
            ) : (
              <div className="user-details">
                <div className="detail-hero">
                  <div className="avatar-large"><Target size={32} /></div>
                  <h3>{selectedProfile.person_name || "Anonymous"}</h3>
                  <p>{selectedProfile.goal || "No Goal Set"}</p>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>User ID</label>
                    <p>{selectedProfile.user_id}</p>
                  </div>
                  <div className="detail-item">
                    <label>Activity Level</label>
                    <p>{selectedProfile.activity_level || "Unknown"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Diet Style</label>
                    <p>{selectedProfile.diet_style || "Standard"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Meals/Day</label>
                    <p>{selectedProfile.meals_per_day || "3"}</p>
                  </div>
                  <div className="detail-item full-width">
                    <label>Health Conditions</label>
                    <p>{selectedProfile.health_conditions || "None reported"}</p>
                  </div>
                </div>
                <div className="detail-actions">
                  <Button variant="ghost" className="full-width" onClick={() => handleEdit(selectedProfile)}>
                    <Edit2 size={16} /> Edit Profile
                  </Button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
