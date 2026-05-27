export default function Input({ label, hint, error, ...props }) {
  return (
    <label className="form-field">
      {label && <span>{label}</span>}

      <input className={error ? "input-error" : ""} {...props} />

      {hint && !error && <small>{hint}</small>}
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}