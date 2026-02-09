import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Multer } from "multer";

export interface UploadResult {
  fileName: string;
  fileUrl: string;
}

function ensureUploadDirectory(uploadDir: string) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function generateUniqueFileName(originalName: string) {
  const extension = path.extname(originalName);
  const filename = `${
    new Date().toISOString().split("T")[0]
  }-${uuidv4()}${extension}`;
  return filename;
}

export async function uploadFile(
  file: Multer.File,
  subfolder = ""
): Promise<UploadResult> {
  const uploadDir = path.join("public/uploads", subfolder);
  ensureUploadDirectory(uploadDir);
  const fileName = generateUniqueFileName(file.originalname);
  const destPath = path.join(uploadDir, fileName);

  if (file.buffer) {
    // Memory storage: write buffer to disk
    await fs.promises.writeFile(destPath, file.buffer);
  } else if (file.path) {
    // Disk storage: move file
    await fs.promises.rename(file.path, destPath);
  } else {
    throw new Error("No file buffer or path found on uploaded file.");
  }

  const fileUrl = `/public/uploads/${
    subfolder ? subfolder + "/" : ""
  }${fileName}`.replace(/\\/g, "/");
  return { fileName, fileUrl };
}

export async function uploadMultipleFiles(
  files: Multer.File[],
  subfolder = ""
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadFile(file, subfolder)));
}

export async function deleteLocalFile(fileFullUrl: string): Promise<boolean> {
  const filePath = path.join(process.cwd(), fileFullUrl);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
