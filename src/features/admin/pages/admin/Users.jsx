import { useEffect, useState } from "react";
import "../../admin-styles.css";
import { Eye, Edit2, Trash2, X, Search, UserCheck, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import SectionHeader from "../../../../components/shared/SectionHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { apiClient } from "../../../../services/apiClient";
import Loader from "../../../../components/ui/Loader";

export default function Users({ setActiveRoute }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", username: "" });
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ title: "", message: "", type: "alert", emailNotify: true });
  const [isSendingNotify, setIsSendingNotify] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/accounts");
      setUsers(response.accounts || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsNotifying(false);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({ name: user.name || "", email: user.email || "", username: user.username || "" });
    setIsEditing(true);
    setIsNotifying(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await apiClient.delete(`/admin/accounts/${id}`);
        setUsers(users.filter((u) => u.id !== id));
        if (selectedUser?.id === id) setSelectedUser(null);
      } catch (error) {
        alert(error.message || "Failed to delete user");
      }
    }
  };

  const handleRoleChange = async (user, role) => {
    const action = role === "admin" ? "make this user an admin" : "remove admin access from this account";

    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    try {
      const response = await apiClient.patch(`/admin/accounts/${user.id}/role`, { role });
      const updatedUser = response.account
        ? { ...response.account, id: response.account.id, name: response.account.fullName || response.account.name }
        : { ...user, role };

      setUsers(users.map((item) => item.id === user.id ? updatedUser : item));
      if (selectedUser?.id === user.id) setSelectedUser(updatedUser);
    } catch (error) {
      alert(error.message || "Failed to update user role");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsNotifying(false);
    setSelectedUser(null);
  };

  const handleNotify = async (e) => {
    e.preventDefault();
    setIsSendingNotify(true);
    try {
      const result = await apiClient.post(`/accounts/${selectedUser.id}/notifications`, notifyForm);
      if (result.email?.requested && result.email.failed) {
        alert(`Notification saved, but the email could not be sent.${result.email.error ? `\n\nEmail error: ${result.email.error}` : "\n\nCheck the backend email settings."}`);
      } else if (result.email?.requested && result.email.withoutEmail) {
        alert("Notification saved, but this user does not have an email address.");
      } else if (result.email?.requested) {
        alert("Notification saved and email sent successfully!");
      } else {
        alert("Notification saved successfully!");
      }
      setIsNotifying(false);
      setNotifyForm({ title: "", message: "", type: "alert", emailNotify: true });
    } catch (error) {
      alert(error.message || "Failed to send notification");
    } finally {
      setIsSendingNotify(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.put(`/accounts/${selectedUser.id}`, editForm);
      const updatedUser = response.account 
        ? { ...response.account, id: response.account.id, name: response.account.fullName || response.account.name }
        : { ...selectedUser, ...editForm };
      
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      setIsEditing(false);
      setSelectedUser(null);
    } catch (error) {
      alert("Failed to update user");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader fullPage />;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Management"
        title="User Control"
        description="Monitor and manage all system users, their credentials, and permissions."
        action={
          <div className="admin-header-actions">
            <Button variant="ghost" onClick={() => setActiveRoute("admin")}>
              Continue to Dashboard
            </Button>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search users..." 
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
            <h2>System Users</h2>
            <span className="badge">{filteredUsers.length} Users</span>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={selectedUser?.id === user.id ? "selected" : ""}>
                    <td>
                      <div className="user-info-cell">
                        <div className="avatar-small">{(user.name || user.username || "?")[0].toUpperCase()}</div>
                        <span>{user.name || user.username || "Unnamed User"}</span>
                      </div>
                    </td>
                    <td>{user.username || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>
                      <span className={`role-pill ${user.role || "user"}`}>
                        {(user.role || "user") === 'admin' ? <Shield size={12} /> : <UserCheck size={12} />}
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn view" title="View" onClick={() => handleView(user)}><Eye size={16} /></button>
                      <button className="action-btn edit" title="Edit" onClick={() => handleEdit(user)}><Edit2 size={16} /></button>
                      {(user.role || "user") === "admin" ? (
                        <button className="action-btn role" title="Make user" onClick={() => handleRoleChange(user, "user")}><ShieldOff size={16} /></button>
                      ) : (
                        <button className="action-btn role" title="Make admin" onClick={() => handleRoleChange(user, "admin")}><ShieldCheck size={16} /></button>
                      )}
                      <button className="action-btn delete" title="Delete" onClick={() => handleDelete(user.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(selectedUser || isEditing) && (
          <aside className="panel detail-panel animate-in">
            <div className="panel-header">
              <h2>{isEditing ? "Edit User" : isNotifying ? "Notify User" : "User Details"}</h2>
              <button className="close-btn" onClick={handleCancel}><X size={20} /></button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <Input 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <Input 
                    type="email"
                    value={editForm.email} 
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <Input 
                    value={editForm.username} 
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            ) : isNotifying ? (
              <form onSubmit={handleNotify} className="edit-form">
                <div className="form-group">
                  <label>Notification Title</label>
                  <Input 
                    placeholder="e.g. Action Required"
                    value={notifyForm.title} 
                    onChange={(e) => setNotifyForm({...notifyForm, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    className="admin-textarea"
                    placeholder="Enter message for user..."
                    value={notifyForm.message} 
                    onChange={(e) => setNotifyForm({...notifyForm, message: e.target.value})}
                    required
                    style={{ width: "100%", minHeight: "100px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", padding: "12px" }}
                  ></textarea>
                </div>
                <div className="form-group checkbox-group" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                  <input 
                    type="checkbox" 
                    id="emailNotifySingle"
                    checked={notifyForm.emailNotify} 
                    onChange={(e) => setNotifyForm({...notifyForm, emailNotify: e.target.checked})}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="emailNotifySingle" style={{ margin: 0, cursor: "pointer", fontWeight: "500", color: "var(--text)" }}>Notify by Email</label>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={() => setIsNotifying(false)}>Back</Button>
                  <Button type="submit" disabled={isSendingNotify}>
                    {isSendingNotify ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="user-details">
                <div className="detail-hero">
                  <div className="avatar-large">{(selectedUser.name || selectedUser.username || "?")[0].toUpperCase()}</div>
                  <h3>{selectedUser.name || selectedUser.username || "Unnamed User"}</h3>
                  <p>{(selectedUser.role || "USER").toUpperCase()}</p>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>ID</label>
                    <p>{selectedUser.id}</p>
                  </div>
                  <div className="detail-item">
                    <label>Username</label>
                    <p>{selectedUser.username || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{selectedUser.email || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Joined</label>
                    <p>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
                <div className="detail-actions">
                  <Button variant="outline" className="full-width" onClick={() => setIsNotifying(true)}>
                    <Eye size={16} /> Send Notification
                  </Button>
                  <Button variant="ghost" className="full-width" onClick={() => handleEdit(selectedUser)}>
                    <Edit2 size={16} /> Edit Profile
                  </Button>
                  {(selectedUser.role || "user") === "admin" ? (
                    <Button variant="ghost" className="full-width" onClick={() => handleRoleChange(selectedUser, "user")}>
                      <ShieldOff size={16} /> Make User
                    </Button>
                  ) : (
                    <Button variant="outline" className="full-width" onClick={() => handleRoleChange(selectedUser, "admin")}>
                      <ShieldCheck size={16} /> Make Admin
                    </Button>
                  )}
                  <Button variant="outline" className="full-width delete-btn" onClick={() => handleDelete(selectedUser.id)}>
                    <Trash2 size={16} /> Delete Account
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
