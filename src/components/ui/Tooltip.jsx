export default function Tooltip({ text, children }) {
  return (
    <span className="tooltip">
      {children}
      <span className="tooltip-content">{text}</span>
    </span>
  );
}