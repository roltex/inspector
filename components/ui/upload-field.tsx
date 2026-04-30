"use client";

import * as React from "react";
import {
  Camera,
  File as FileIcon,
  ImagePlus,
  Loader2,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedAsset {
  url: string;
  key: string;
  name: string;
  size: number;
  mime: string;
}

interface UploadFieldProps {
  organizationId: string;
  folder?: string;
  /** Constrain to image MIME types. */
  imageOnly?: boolean;
  /** Render the camera capture trigger (mobile back camera). */
  capture?: boolean;
  /** Currently uploaded asset (single-file mode). */
  value: UploadedAsset | null | undefined;
  onChange: (next: UploadedAsset | null) => void;
  disabled?: boolean;
  required?: boolean;
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * A simple single-file uploader that POSTs to /api/uploads. Renders a tile
 * with image preview when applicable and a download/preview link otherwise.
 * Supports a separate "Take photo" button on mobile via input[capture].
 */
export function UploadField({
  organizationId,
  folder = "findings",
  imageOnly = false,
  capture = false,
  value,
  onChange,
  disabled,
  maxBytes = DEFAULT_MAX_BYTES,
}: UploadFieldProps) {
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > maxBytes) {
      toast.error(
        `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`,
      );
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "x-organization-id": organizationId },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json = (await res.json()) as { url: string; key: string };
      onChange({
        url: json.url,
        key: json.key,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) void upload(file);
  }

  if (value) {
    const isImage =
      value.mime.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|svg|heic)$/i.test(value.name);
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/10 p-2">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.url}
            alt={value.name}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium hover:underline"
          >
            {value.name}
          </a>
          <p className="text-xs text-muted-foreground">
            {formatBytes(value.size)} · {value.mime || "file"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          disabled={disabled || busy}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={imageOnly ? "image/*" : undefined}
        className="hidden"
        onChange={onSelect}
      />
      {capture && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onSelect}
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : imageOnly ? (
          <ImagePlus className="h-4 w-4" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {imageOnly ? "Choose photo" : "Choose file"}
      </Button>
      {capture && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || busy}
        >
          <Camera className="h-4 w-4" />
          Take photo
        </Button>
      )}
    </div>
  );
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log10(n) / 3), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
