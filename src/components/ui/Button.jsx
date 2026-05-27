export default function Button({
  children,
  className = "",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}) {
  const classes = ["btn", `btn-${size}`, `btn-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
