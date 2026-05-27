import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";

export default function Signup({ setAuthRoute }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await signup(form);

    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Create account</p>
        <h1>Start with Reality Engine X</h1>

        <Input
          label="Name"
          type="text"
          placeholder="Your name"
          value={form.name}
          required
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          label="Username"
          type="text"
          placeholder="yourname"
          value={form.username}
          required
          onChange={(event) => updateField("username", event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          required
          onChange={(event) => updateField("email", event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Create a password"
          value={form.password}
          error={error}
          required
          onChange={(event) => {
            updateField("password", event.target.value);
            setError("");
          }}
        />
        <Button type="submit">Create Account</Button>

        <div className="auth-links">
          <button type="button" onClick={() => setAuthRoute("login")}>
            Back to login
          </button>
        </div>
      </form>
    </section>
  );
}
