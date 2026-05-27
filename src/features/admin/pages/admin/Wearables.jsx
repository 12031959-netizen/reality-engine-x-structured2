import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Eye, Edit2, Trash2, X, Search, Watch, Activity } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Wearables({ setActiveRoute }) {
  const [wearables, setWearables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchWearables();
  }, []);

  const fetchWearables = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/wearable-data");
      setWearables(response.wearables || []);
    } catch (error) {
      console.error("Failed to fetch wearables", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setIsEditing(false);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditForm({ ...item });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this mobile data record?")) {
      try {
        await apiClient.delete(`/admin/wearable-data/${id}`);
        setWearables(wearables.filter(w => w.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
      } catch (error) {
        alert("Failed to delete record");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedItem(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/wearable-data/${selectedItem.id}`, editForm);
      setWearables(wearables.map(w => w.id === selectedItem.id ? { ...w, ...editForm } : w));
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      alert("Failed to update mobile data");
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

  const filteredItems = wearables.filter(w => 
    String(w.user_id || "").toLowerCase().includes(search.toLowerCase()) ||
    (w.device || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Integration"
        title="Mobile Data"
        description="Review health metrics synced from smart devices, including steps, heart rate, and recovery scores."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by User or Device..." 
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
            <h2>Device Logs</h2>
            <span className="badge">{filteredItems.length} Records</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Device</th>
                  <th>Steps</th>
                  <th>Heart Rate</th>
                  <th>User ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((w) => (
                  <tr key={w.id} className={selectedItem?.id === w.id ? "selected" : ""}>
                    <td>{formatDate(w.wearable_date)}</td>
                    <td>
                      <div className="device-cell">
                        <Watch size={14} />
                        <span>{w.device || "Generic"}</span>
                      </div>
                    </td>
                    <td>{w.steps?.toLocaleString() || 0}</td>
                    <td>{w.heart_rate || "-"} bpm</td>
                    <td><small>{w.user_id}</small></td>
                    <td className="actions-cell">
                      <button className="action-btn view" title="View" onClick={() => handleView(w)}><Eye size={16} /></button>
                      <button className="action-btn edit" title="Edit" onClick={() => handleEdit(w)}><Edit2 size={16} /></button>
                      <button className="action-btn delete" title="Delete" onClick={() => handleDelete(w.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(selectedItem || isEditing) && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>{isEditing ? "Modify Data" : "Metric Details"}</h2>
              <button className="close-btn" onClick={handleCancel}><X size={20} /></button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="edit-form">
                <div className="form-group">
                  <label>Device Name</label>
                  <Input value={editForm.device || ""} onChange={(e) => setEditForm({...editForm, device: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Steps</label>
                    <Input type="number" value={editForm.steps || ""} onChange={(e) => setEditForm({...editForm, steps: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Heart Rate</label>
                    <Input type="number" value={editForm.heart_rate || ""} onChange={(e) => setEditForm({...editForm, heart_rate: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Active Minutes</label>
                    <Input type="number" value={editForm.active_minutes || ""} onChange={(e) => setEditForm({...editForm, active_minutes: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Recovery Score</label>
                    <Input type="number" value={editForm.recovery_score || ""} onChange={(e) => setEditForm({...editForm, recovery_score: e.target.value})} />
                  </div>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                  <Button type="submit">Update Record</Button>
                </div>
              </form>
            ) : (
              <div className="user-details">
                <div className="detail-hero">
                  <div className="avatar-large"><Activity size={32} /></div>
                  <h3>Health Metrics</h3>
                  <p>{selectedItem.source || "Unknown Source"}</p>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Active Minutes</label>
                    <p>{selectedItem.active_minutes} min</p>
                  </div>
                  <div className="detail-item">
                    <label>Recovery</label>
                    <p>{selectedItem.recovery_score}%</p>
                  </div>
                  <div className="detail-item full-width">
                    <label>System Flags</label>
                    <div className="flags-list">
                      {selectedItem.apple_health_active && <span className="flag">Apple Health</span>}
                      {selectedItem.iphone_active && <span className="flag">iPhone</span>}
                      {selectedItem.bluetooth_active && <span className="flag">Bluetooth</span>}
                    </div>
                  </div>
                </div>
                <div className="detail-actions">
                  <Button variant="outline" className="full-width delete-btn" onClick={() => handleDelete(selectedItem.id)}>
                    <Trash2 size={16} /> Delete Record
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
