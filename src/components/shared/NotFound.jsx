import Button from "../ui/Button";

export default function NotFound({ setActiveRoute }) {
  return (
    <section className="center-page">
      <div className="state-card large">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist inside Reality Engine X.</p>

        <Button onClick={() => setActiveRoute?.("dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </section>
  );
}