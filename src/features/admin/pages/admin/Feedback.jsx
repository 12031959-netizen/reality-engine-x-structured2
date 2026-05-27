import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Eye, Edit2, Trash2, X, Search, MessageSquare, Star } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Feedback({ setActiveRoute }) {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/feedback");
      setFeedback(response.feedback || []);
    } catch (error) {
      console.error("Failed to fetch feedback", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (item) => {
    setSelectedItem(item);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this feedback?")) {
      try {
        await apiClient.delete(`/admin/feedback/${id}`);
        setFeedback(feedback.filter(f => f.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
      } catch (error) {
        alert("Failed to delete feedback");
      }
    }
  };

  const handleCancel = () => {
    setSelectedItem(null);
  };

  const filteredItems = feedback.filter(f => 
    (f.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (f.author || "").toLowerCase().includes(search.toLowerCase()) ||
    (f.message || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Community"
        title="User Feedback"
        description="Read and manage messages, ratings, and suggestions submitted by users."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search feedback..." 
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
            <h2>Submissions</h2>
            <span className="badge">{filteredItems.length} Messages</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Title</th>
                  <th>Rating</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((f) => (
                  <tr key={f.id} className={selectedItem?.id === f.id ? "selected" : ""}>
                    <td>{f.author || "Anonymous"}</td>
                    <td><strong>{f.title}</strong></td>
                    <td>
                      <div className="rating-cell">
                        <Star size={12} fill="currentColor" />
                        <span>{f.rating}/5</span>
                      </div>
                    </td>
                    <td><span className="type-tag">{f.type}</span></td>
                    <td className="actions-cell">
                      <button className="action-btn view" title="View" onClick={() => handleView(f)}><Eye size={16} /></button>
                      <button className="action-btn cancel" title="Ignore" onClick={() => alert("Marked as ignored")}><X size={16} /></button>
                      <button className="action-btn delete" title="Delete" onClick={() => handleDelete(f.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedItem && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>Feedback Content</h2>
              <button className="close-btn" onClick={handleCancel}><X size={20} /></button>
            </div>

            <div className="user-details">
              <div className="detail-hero">
                <div className="avatar-large"><MessageSquare size={32} /></div>
                <h3>{selectedItem.title}</h3>
                <p>by {selectedItem.author || "Anonymous"}</p>
              </div>
              
              <div className="feedback-content">
                <div className="rating-large">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} fill={i < selectedItem.rating ? "#f59e0b" : "none"} stroke={i < selectedItem.rating ? "#f59e0b" : "#cbd5e1"} />
                  ))}
                </div>
                <p className="message-text">{selectedItem.message}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Type</label>
                  <p>{selectedItem.type}</p>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <p>{new Date(selectedItem.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="detail-actions">
                <Button variant="outline" className="full-width delete-btn" onClick={() => handleDelete(selectedItem.id)}>
                  <Trash2 size={16} /> Delete Feedback
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
