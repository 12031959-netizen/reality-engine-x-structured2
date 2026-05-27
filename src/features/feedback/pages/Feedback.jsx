import { useState } from "react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/apiClient";

export default function Feedback() {
  const { account, user, refreshAccount } = useAuth();
  const items = account.feedbackLog || [];
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    type: "General feedback",
    rating: "5",
    message: ""
  });

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const feedback = {
      author: account.fullName || user?.name || "User",
      ...form
    };

    try {
      const res = await apiClient.post(`/accounts/${account.id}/feedback`, feedback);
      if (res.ok) {
        await refreshAccount?.();
      }
    } catch (error) {
      console.error("Failed to send feedback", error);
      setError(error.message || "Failed to save feedback.");
      return;
    }

    setForm({
      title: "",
      type: "General feedback",
      rating: "5",
      message: ""
    });
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Feedback"
        title="Share your feedback"
        description="Send notes about the dashboard, diet setup, predictions, or anything that should be improved."
      />

      <section className="two-column">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <p className="eyebrow">New message</p>
          <h2>What should change?</h2>

          <div className="form-grid">
            <Input
              label="Title"
              value={form.title}
              placeholder="Short summary"
              required
              onChange={(event) => updateField("title", event.target.value)}
            />

            <label className="form-field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
              >
                <option value="General feedback">General feedback</option>
                <option value="Bug report">Bug report</option>
                <option value="Feature request">Feature request</option>
                <option value="Diet plan issue">Diet plan issue</option>
                <option value="Prediction concern">Prediction concern</option>
              </select>
            </label>

            <label className="form-field">
              <span>Rating</span>
              <select
                value={form.rating}
                onChange={(event) => updateField("rating", event.target.value)}
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Needs work</option>
                <option value="1">1 - Poor</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Message</span>
            <textarea
              value={form.message}
              placeholder="Write your feedback here..."
              required
              onChange={(event) => updateField("message", event.target.value)}
            />
          </label>

          <Button type="submit">Send Feedback</Button>
          <Toast type="success" message={saved ? "Feedback saved." : ""} />
          <Toast type="error" message={error} />
        </form>

        <article className="panel">
          <p className="eyebrow">Saved feedback</p>
          <h2>Recent messages</h2>

          <div className="feedback-list">
            {items.length === 0 ? (
              <div className="feedback-empty">No feedback submitted yet.</div>
            ) : (
              items.map((item) => (
                <div className="feedback-item" key={item.id}>
                  <div className="feedback-item-header">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.type}</span>
                    </div>
                    <b>{item.rating}/5</b>
                  </div>
                  <p>{item.message}</p>
                  <small>
                    {item.author} - {item.createdAt}
                  </small>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
