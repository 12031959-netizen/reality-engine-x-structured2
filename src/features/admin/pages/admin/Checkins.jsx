import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Eye, Edit2, Trash2, X, Search, Calendar, Coffee } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Checkins({ setActiveRoute }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchCheckins();
  }, []);

  const fetchCheckins = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/daily-checkins");
      setCheckins(response.checkins || []);
    } catch (error) {
      console.error("Failed to fetch checkins", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (checkin) => {
    setSelectedCheckin(checkin);
    setIsEditing(false);
  };

  const handleEdit = (checkin) => {
    setSelectedCheckin(checkin);
    setEditForm({ ...checkin });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this check-in record?")) {
      try {
        await apiClient.delete(`/admin/daily-checkins/${id}`);
        setCheckins(checkins.filter(c => c.id !== id));
        if (selectedCheckin?.id === id) setSelectedCheckin(null);
      } catch (error) {
        alert("Failed to delete check-in");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedCheckin(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/daily-checkins/${selectedCheckin.id}`, editForm);
      setCheckins(checkins.map(c => c.id === selectedCheckin.id ? { ...c, ...editForm } : c));
      setIsEditing(false);
      setSelectedCheckin(null);
    } catch (error) {
      alert("Failed to update check-in");
    }
  };

  const formatDate = (value) => {
    if (!value) return "No date";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
  };

  const filteredCheckins = checkins.filter(c => 
    String(c.user_id || "").toLowerCase().includes(search.toLowerCase()) ||
    String(c.check_in_date || "").includes(search)
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Monitoring"
        title="Daily Check-ins"
        description="Track and audit user daily entries for calories, macros, sleep, and emotional wellbeing."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by User ID or Date..." 
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
            <h2>Recent Entries</h2>
            <span className="badge">{filteredCheckins.length} Logs</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User ID</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Mood</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckins.map((c) => (
                  <tr key={c.id} className={selectedCheckin?.id === c.id ? "selected" : ""}>
                    <td>
                      <div className="user-info-cell">
                        <div className="avatar-small"><Calendar size={14} /></div>
                        <span>{formatDate(c.check_in_date)}</span>
                      </div>
                    </td>
                    <td><small>{c.user_id}</small></td>
                    <td>{c.calories} kcal</td>
                    <td>{c.protein}g</td>
                    <td>
                      <div className="mood-indicator">
                        <div className="mood-bar" style={{ width: `${c.mood * 10}%` }}></div>
                        <span>{c.mood}/10</span>
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn view" title="View" onClick={() => handleView(c)}><Eye size={16} /></button>
                      <button className="action-btn edit" title="Edit" onClick={() => handleEdit(c)}><Edit2 size={16} /></button>
                      <button className="action-btn delete" title="Delete" onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(selectedCheckin || isEditing) && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>{isEditing ? "Edit Entry" : "Entry Details"}</h2>
              <button className="close-btn" onClick={handleCancel}><X size={20} /></button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Calories</label>
                    <Input type="number" value={editForm.calories || ""} onChange={(e) => setEditForm({...editForm, calories: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Protein (g)</label>
                    <Input type="number" value={editForm.protein || ""} onChange={(e) => setEditForm({...editForm, protein: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Water (L)</label>
                    <Input type="number" step="0.1" value={editForm.water || ""} onChange={(e) => setEditForm({...editForm, water: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Sleep (h)</label>
                    <Input type="number" step="0.5" value={editForm.sleep || ""} onChange={(e) => setEditForm({...editForm, sleep: e.target.value})} />
                  </div>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="user-details">
                <div className="detail-hero">
                  <div className="avatar-large"><Coffee size={32} /></div>
                  <h3>Daily Summary</h3>
                  <p>{formatDate(selectedCheckin.check_in_date)}</p>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Stress Level</label>
                    <p>{selectedCheckin.stress}/10</p>
                  </div>
                  <div className="detail-item">
                    <label>Cravings</label>
                    <p>{selectedCheckin.cravings}/10</p>
                  </div>
                  <div className="detail-item full-width">
                    <label>User Notes</label>
                    <p className="notes-box">{selectedCheckin.notes || "No notes provided."}</p>
                  </div>
                  <div className="detail-item">
                    <label>Saved At</label>
                    <p>{new Date(selectedCheckin.saved_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="detail-actions">
                  <Button variant="outline" className="full-width delete-btn" onClick={() => handleDelete(selectedCheckin.id)}>
                    <Trash2 size={16} /> Remove Entry
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
