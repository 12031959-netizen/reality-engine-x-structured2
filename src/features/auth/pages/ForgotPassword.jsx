import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";

export default function ForgotPassword({ setAuthRoute }) {
  const { account, resetPassword } = useAuth();
  const [email, setEmail] = useState(account?.email || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await resetPassword(email, password);

    if (!result.ok) {
      setError(result.message);
      setMessage("");
      return;
    }

    setError("");
    setMessage("Password updated. You can login with the new password.");
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Password recovery</p>
        <h1>Reset your password</h1>

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          error={error}
          required
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
        />
        <Input
          label="New password"
          type="password"
          placeholder="New password"
          value={password}
          required
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit">Update Password</Button>
        <Toast type="success" message={message} />

        <div className="auth-links">
          <button type="button" onClick={() => setAuthRoute("login")}>
            Back to login
          </button>
        </div>
      </form>
    </section>
  );
}
