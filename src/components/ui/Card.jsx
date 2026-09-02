export default function Card({ children, className = "", as: Tag = "div", padded = true, ...props }) {
  return (
    <Tag
      className={`rounded-2xl border border-brown-900/5 bg-beige-100 shadow-soft ${padded ? "p-5 sm:p-6" : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
