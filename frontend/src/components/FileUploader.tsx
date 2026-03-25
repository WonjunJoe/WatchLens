import { useCallback, useState } from "react";

interface FileUploaderProps {
  label: string;
  accept: string;
  endpoint: string;
  onResult: (data: any) => void;
}

export function FileUploader({ label, accept, endpoint, onResult }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 50 * 1024 * 1024;

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError("파일 크기가 50MB를 초과합니다");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      }

      const data = await res.json();
      onResult(data);
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
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <label className="cursor-pointer">
        <p className="text-lg font-medium mb-2">{label}</p>
        <p className="text-sm text-gray-500 mb-4">
          파일을 드래그하거나 클릭하여 선택하세요 (최대 50MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      {uploading && <p className="text-blue-600 mt-2">업로드 중...</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
