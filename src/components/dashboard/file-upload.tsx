"use client";

// Reusable file upload component used by Gallery & Resources managers.
//
// Usage:
//   <FileUpload
//     accept="image/*"
//     label="Image"
//     onUpload={(url) => setImageUrl(url)}
//     currentUrl={imageUrl}
//   />
//   <FileUpload
//     accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
//     label="Document"
//     onUpload={(url) => setFileUrl(url)}
//     currentUrl={fileUrl}
//   />
//
// Posts the selected file to /api/upload as multipart/form-data, shows a
// spinner while uploading, then a preview (image) or filename (document).
// On success: calls onUpload(url) and shows a success toast.
// On error: shows a destructive toast.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  File as FileIcon,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface FileUploadProps {
  /** MIME or extension filter for the underlying <input accept=...> attribute. */
  accept: string;
  /** Called with the returned URL when upload succeeds. */
  onUpload: (url: string) => void;
  /** Human-readable label, e.g. "Image" or "Document". */
  label: string;
  /** Optional currently-set URL — used to render the preview / filename of an already-uploaded file. */
  currentUrl?: string;
  /** Optional helper text shown under the label. */
  hint?: string;
  /** Optional callback when the user clears the selected upload (clicks the X). */
  onClear?: () => void;
}

interface UploadResponse {
  url: string;
  filename: string;
  storedName: string;
  size: number;
  category: "image" | "document";
  extension: string;
}

function isImageUrl(url: string): boolean {
  const lower = url.split("?")[0].toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  );
}

function basename(url: string): string {
  const clean = url.split("?")[0].replace(/\/$/, "");
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileUpload({
  accept,
  onUpload,
  label,
  currentUrl,
  hint,
  onClear,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [lastUploaded, setLastUploaded] =
    React.useState<UploadResponse | null>(null);
  const { toast } = useToast();

  const isImage = currentUrl ? isImageUrl(currentUrl) : false;
  const showPreview = Boolean(currentUrl);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as
        | (UploadResponse & { error?: string })
        | null;

      if (!res.ok || !json || (json as { error?: string }).error) {
        const message =
          (json as { error?: string } | null)?.error ||
          "Upload failed. Please try again.";
        toast({
          title: "Upload failed",
          description: message,
          variant: "destructive",
        });
        return;
      }

      setLastUploaded(json);
      onUpload(json.url);
      toast({
        title: "Upload complete",
        description: `${json.filename} (${formatBytes(json.size)}) is ready.`,
      });
    } catch (err) {
      console.error("[file-upload] error:", err);
      toast({
        title: "Upload failed",
        description:
          "Network error while uploading. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the input value so the same file can be re-selected if needed.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleFile(file);
  }

  function handleClear() {
    if (onClear) onClear();
    setLastUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium leading-none">{label}</span>
        {showPreview && onClear && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClear}
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={uploading}
          className="sr-only"
          aria-label={`Upload ${label.toLowerCase()}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-fit"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" />
              Upload {label.toLowerCase()}
            </>
          )}
        </Button>

        {hint && !uploading && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>

      {/* Preview / current file */}
      {showPreview && !uploading && (
        <div className="rounded-md border border-border bg-secondary/30 p-2">
          {isImage ? (
            <div className="relative overflow-hidden rounded-md border border-border aspect-video bg-background">
              { }
              <img
                src={currentUrl}
                alt={lastUploaded?.filename ?? "Uploaded image"}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {lastUploaded?.filename ?? basename(currentUrl)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUrl}
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
