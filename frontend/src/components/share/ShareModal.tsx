import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { X, Copy, Check, Download } from "lucide-react";
import { ShareCard } from "./ShareCard";
import type { YouTubeData } from "../../types/youtube";
import type { InstagramData } from "../../types/instagram";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  youtube?: YouTubeData;
  instagram?: Partial<InstagramData>;
  period?: string;
}

export function ShareModal({
  open,
  onClose,
  youtube,
  instagram,
  period,
}: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(
    async (existingBlob?: Blob) => {
      const blob = existingBlob ?? (await generateImage());
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "watchlens-share.png";
      a.click();
      URL.revokeObjectURL(url);
    },
    [generateImage]
  );

  const handleCopy = useCallback(async () => {
    const blob = await generateImage();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download instead
      handleDownload(blob);
    }
  }, [generateImage, handleDownload]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Card preview (scaled down to fit screen) */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 1080 * 0.3,
            height: 1920 * 0.3,
          }}
        >
          <div
            style={{
              transform: "scale(0.3)",
              transformOrigin: "top left",
            }}
          >
            <ShareCard
              ref={cardRef}
              youtube={youtube}
              instagram={instagram}
              period={period}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleCopy}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-white text-[#0f172a] rounded-xl font-medium text-[14px] hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "복사됨!" : generating ? "생성 중..." : "이미지 복사"}
          </button>
          <button
            onClick={() => handleDownload()}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium text-[14px] hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
