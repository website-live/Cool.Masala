import X from "lucide-react/dist/esm/icons/x.js";

export function ConversionModal({ kind, onClose }: { kind: "exit" | "scroll"; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="conversion-title" className="fixed inset-0 z-[1900] flex items-center justify-center bg-black/55 px-4">
    <section className="relative w-full max-w-md rounded-3xl bg-[#c1fbd4] p-7 text-black shadow-2xl sm:p-9">
      <button type="button" onClick={onClose} aria-label="Close offer" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/10 hover:bg-black/20"><X className="size-5" /></button>
      <p className="text-xs font-black uppercase tracking-[.16em] text-[#006e52]">{kind === "exit" ? "Wait — flavour before you go" : "A little extra flavour"}</p>
      <h2 id="conversion-title" className="mt-3 font-display text-3xl font-bold tracking-[-.06em]">Take 10% off your first order.</h2>
      <p className="mt-3 text-sm leading-6 text-black/70">Use code <strong className="rounded bg-white/70 px-2 py-1 font-mono text-black">WELCOME10</strong> at checkout. Your cart is saved.</p>
      <button type="button" onClick={onClose} className="mt-6 h-11 w-full rounded-full bg-black px-5 text-sm font-bold text-white hover:bg-[#3f3f46]">Continue shopping</button>
    </section>
  </div>;
}
