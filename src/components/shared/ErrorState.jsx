export default function ErrorState({ title = "Something went wrong", description }) {
  return (
    <div className="state-card error-state">
      <h3>{title}</h3>
      <p>{description || "Please try again later."}</p>
    </div>
  );
}