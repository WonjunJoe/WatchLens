import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { API_BASE } from "../config";
import { supabase } from "../lib/supabase";

interface FileUploaderProps {
  label: string;
  subtitle: string;
  accept: string;
  endpoint: string;
  onResult: (data: any) => void;
}

interface Progress {
  step: string;
  percent: number;
}

export function FileUploader({ label, subtitle, accept, endpoint, onResult }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const MAX_SIZE = 50 * 1024 * 1024;

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setProgress(null);
    if (file.size > MAX_SIZE) {
      setError("파일 크기가 50MB를 초과합니다");
      return;
    }

    setUploading(true);
    setProgress({ step: "업로드 중...", percent: 5 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData,
        headers: authHeaders,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다");

      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            const eventMatch = block.match(/^event: (.+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const event = eventMatch[1];
            let data: any;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              continue;
            }

            if (event === "progress") {
              setProgress({ step: data.step, percent: data.percent });
            } else if (event === "done") {
              onResult(data);
            } else if (event === "error") {
              throw new Error(data.detail);
            }
          }
        }
      } finally {
        reader.cancel();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, [endpoint, onResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? "border-[var(--accent)] bg-[var(--accent-light)]"
          : "border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
      }`}
    >
      <label className="cursor-pointer block">
        <div className="w-10 h-10 mx-auto mb-3 bg-[var(--accent-light)] rounded-lg flex items-center justify-center">
          <Upload size={18} className="text-[var(--accent)]" />
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)] mb-0.5">{label}</p>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-0.5">{subtitle}</p>
        <p className="text-[12px] text-[var(--text-tertiary)]">드래그 또는 클릭 (최대 50MB)</p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {uploading && progress && (
        <div className="mt-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-[var(--accent)] text-[12px]">{progress.step}</p>
        </div>
      )}
      {error && <p className="text-[var(--rose)] text-[12px] mt-3">{error}</p>}
    </div>
  );
}
