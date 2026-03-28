import { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-100 text-[var(--text-tertiary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-colors inline-flex items-center justify-center"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <Info size={10} />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-[var(--text-primary)] text-white text-[11px] leading-relaxed rounded-lg shadow-lg pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}
