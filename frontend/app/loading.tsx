export default function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 min-h-[50vh] text-neutral-400 text-xs">
      <span className="h-5 w-5 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />
      Loading...
    </div>
  );
}
