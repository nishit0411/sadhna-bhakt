/**
 * Discreet developer-credit line for the bottom of every page. `dark`
 * switches the palette for pages with a dark background (Landing's
 * footer, AdminLogin) — otherwise it uses the app's normal light-theme
 * muted-caption colors.
 */
export default function DeveloperCredit({ dark = false, className = "" }) {
  const textColor = dark ? "text-[#a89b87]" : "text-brown-400";
  const nameColor = dark ? "text-[#e3cd9a]" : "text-brown-600";
  const hoverColor = dark ? "hover:text-[#f7f2e7]" : "hover:text-maroon-600";

  return (
    <div className={`flex flex-col items-center gap-0.5 text-center text-xs ${textColor} ${className}`}>
      <p>
        Designed &amp; Developed by <span className={`font-medium ${nameColor}`}>INFINIMAI SOLUTIONS</span>
      </p>
      <p>
        Contact:{" "}
        <a href="tel:+916239396006" className={`${hoverColor} hover:underline`}>
          +91 62393 96006
        </a>
      </p>
    </div>
  );
}
