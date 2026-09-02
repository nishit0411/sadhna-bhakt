export default function SadhanaQuestion({ icon: Icon, title, question, required = true, children }) {
  return (
    <section className="scroll-mt-20 rounded-2xl border border-brown-900/5 bg-beige-100 p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <h2 className="font-display text-lg font-semibold text-maroon-600 sm:text-xl">{title}</h2>
      </div>
      {question && (
        <p className="mb-4 text-sm leading-relaxed text-brown-700 sm:text-base">
          {question}
          {required && <span className="ml-0.5 text-maroon-500">*</span>}
        </p>
      )}
      {children}
    </section>
  );
}
