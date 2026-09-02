export default function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-brown-900/5 bg-beige-100 p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <h2 className="font-display text-lg font-semibold text-maroon-600 sm:text-xl">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-brown-500">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
