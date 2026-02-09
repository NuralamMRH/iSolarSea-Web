import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

export function UploadDropzone({ onUpload, className }: UploadDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        await onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "p-2 rounded cursor-pointer transition-colors",
        isDragActive ? "bg-blue-100" : "hover:bg-gray-100",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="text-sm text-center">
        {isDragActive ? <p>Drop the image here ...</p> : <p>Upload Image</p>}
      </div>
    </div>
  );
}
