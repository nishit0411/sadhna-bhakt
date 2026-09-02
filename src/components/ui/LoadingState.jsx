export default function LoadingState({ label = "Loading your Sadhana…", fullHeight = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-brown-500 ${fullHeight ? "min-h-[60vh]" : ""}`}>
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron-300 opacity-50" />
        <span className="relative inline-flex h-6 w-6 rounded-full bg-saffron-400" />
      </span>
      <p className="text-sm">{label}</p>
    </div>
  );
}
