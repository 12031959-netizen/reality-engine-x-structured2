import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <section className="auth-warning">
        <h1>Access Restricted</h1>
        <p>Please log in to access Reality Engine X.</p>
      </section>
    );
  }

  return children;
}