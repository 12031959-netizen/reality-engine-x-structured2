export default function Loader({ label = "Loading intelligence..." }) {
  return (
    <div className="loader-wrap">
      <div className="loader" />
      <p>{label}</p>
    </div>
  );
}