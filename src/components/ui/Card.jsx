export default function Card({ children, className = "", as: Tag = "div", padded = true, ...props }) {
  return (
    <Tag
      className={`rounded-2xl border border-brown-900/8 bg-beige-100 shadow-soft transition-shadow duration-200 ${padded ? "p-5 sm:p-6" : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
