import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Send, BellRing, Trash2, Search, Users } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Notifications({ setActiveRoute }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [broadcastForm, setBroadcastForm] = useState({ title: "", message: "", type: "system", emailNotify: true, recipientType: "all", selectedUserId: "" });
  const [users, setUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get("/admin/accounts");
      setUsers(response.accounts || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/notifications");
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      let result;
      if (broadcastForm.recipientType === "all") {
        result = await apiClient.post("/admin/notifications/broadcast", broadcastForm, { signal: controller.signal });
      } else {
        if (!broadcastForm.selectedUserId) {
          alert("Please select a user");
          setIsSending(false);
          clearTimeout(timeoutId);
          return;
        }
        result = await apiClient.post(`/accounts/${broadcastForm.selectedUserId}/notifications`, broadcastForm, { signal: controller.signal });
      }

      const email = result.email;
      if (email?.requested && (email.failed || email.withoutEmail)) {
        const errorDetails = email.error || email.errors?.join(" | ");
        alert(`Notification saved. Email sent: ${email.sent || 0}. Failed: ${email.failed || 0}. Missing email: ${email.withoutEmail || 0}.${errorDetails ? `\n\nEmail error: ${errorDetails}` : ""}`);
      } else if (email?.requested) {
        alert(`Notification saved and email sent successfully to ${email.sent || 1} recipient(s).`);
      } else {
        alert("Notification saved successfully.");
      }

      setBroadcastForm({ 
        ...broadcastForm, 
        title: "", 
        message: "", 
        type: "system",
        emailNotify: true
      });
      fetchNotifications();
    } catch (error) {
      alert(error.name === "AbortError" ? "Notification request timed out. Check Railway email settings and try again." : (error.message || "Failed to send notification"));
    } finally {
      clearTimeout(timeoutId);
      setIsSending(false);
    }
  };

  const filteredNotifications = notifications.filter(n => 
    (n.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.message || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Communication"
        title="Notification Center"
        description="Broadcast system-wide alerts or monitor recent notifications sent to users."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="admin-grid">
        <section className="panel broadcast-panel">
          <div className="panel-header">
            <h2>Send Notification</h2>
            <div className="recipient-selector" style={{ display: "flex", gap: "8px" }}>
              <Button 
                variant={broadcastForm.recipientType === "all" ? "primary" : "outline"} 
                size="sm"
                onClick={() => setBroadcastForm({ ...broadcastForm, recipientType: "all" })}
              >
                All Users
              </Button>
              <Button 
                variant={broadcastForm.recipientType === "user" ? "primary" : "outline"} 
                size="sm"
                onClick={() => setBroadcastForm({ ...broadcastForm, recipientType: "user" })}
              >
                Specific User
              </Button>
            </div>
          </div>
          
          <form onSubmit={handleSend} className="edit-form">
            {broadcastForm.recipientType === "user" && (
              <div className="form-group">
                <label>Select Recipient</label>
                <select 
                  className="admin-select"
                  value={broadcastForm.selectedUserId}
                  onChange={(e) => setBroadcastForm({...broadcastForm, selectedUserId: e.target.value})}
                  required
                >
                  <option value="">-- Select a User --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Alert Title</label>
              <Input 
                placeholder="e.g. System Update"
                value={broadcastForm.title} 
                onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea 
                className="admin-textarea"
                placeholder="Enter the message for all users..."
                value={broadcastForm.message} 
                onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                required
                style={{ width: "100%", minHeight: "100px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", padding: "12px" }}
              ></textarea>
            </div>
            <div className="form-group">
              <label>Priority Type</label>
              <select 
                className="admin-select"
                value={broadcastForm.type} 
                onChange={(e) => setBroadcastForm({...broadcastForm, type: e.target.value})}
              >
                <option value="system">System (Blue)</option>
                <option value="alert">Alert (Yellow)</option>
                <option value="critical">Critical (Red)</option>
                <option value="success">Update (Green)</option>
              </select>
            </div>
            <label className="admin-checkbox-row">
              <input
                type="checkbox"
                checked={broadcastForm.emailNotify}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, emailNotify: e.target.checked })}
              />
              Send this notification to Gmail/email too
            </label>
            <div className="form-actions">
              <Button type="submit" disabled={isSending} className="full-width">
                <Send size={16} /> {isSending ? "Sending..." : broadcastForm.recipientType === "all" ? "Broadcast to All Users" : "Send to Specific User"}
              </Button>
            </div>
          </form>
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Recent History</h2>
            <span className="badge">{filteredNotifications.length} Sent</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.slice(0, 15).map((n) => (
                  <tr key={n.id}>
                    <td><small>{n.user_id}</small></td>
                    <td><strong>{n.title}</strong></td>
                    <td>
                      <span className={`status-pill ${n.read_status ? "completed" : "pending"}`}>
                        {n.read_status ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td>{new Date(n.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
