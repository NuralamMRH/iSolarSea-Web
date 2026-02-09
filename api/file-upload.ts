import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Request, Response, NextFunction } from "express";
import { uploadFile } from "../src/utils/fileUploader";
import formidable from "formidable";
import path from "path";
import fs from "fs";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import type { Multer } from "multer";

// Helper functions for Vercel serverless
function generateUniqueFileName(originalName: string) {
  const extension = path.extname(originalName || ".jpg");
  const filename = `${
    new Date().toISOString().split("T")[0]
  }-${uuidv4()}${extension}`;
  return filename;
}

async function ensureUploadDirectory(uploadDir: string) {
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
}

// Vercel serverless function (for production)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const folderName = Array.isArray(fields.folderName)
      ? fields.folderName[0]
      : fields.folderName;

    if (!file || !file.filepath) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const subfolder = folderName || currentDate;

    // Create upload directory path relative to project root
    const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
    await ensureUploadDirectory(uploadDir);

    // Generate unique filename
    const fileName = generateUniqueFileName(file.originalFilename || "upload");
    const destPath = path.join(uploadDir, fileName);

    // Read the uploaded file and write to destination
    const fileBuffer = fs.readFileSync(file.filepath);
    await writeFile(destPath, fileBuffer);

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (error) {
      // Temp file cleanup failed, but upload succeeded
      console.warn("Failed to cleanup temp file:", error);
    }

    // Generate public URL (matching original fileUploader pattern)
    const fileUrl = `/uploads/${subfolder}/${fileName}`.replace(/\\/g, "/");

    return res.json({
      fileName,
      fileUrl,
      status: "success",
    });
  } catch (error) {
    console.error("Error in file upload:", error);
    return res.status(500).json({
      error: "File upload failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// Express middleware (for development)
export function fileUploadHandler(
  req: Request & { file?: Multer.File },
  res: Response,
  next: NextFunction
) {
  (async () => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const { folderName } = req.body;
      const currentDate = new Date().toISOString().split("T")[0];
      const folder = folderName || currentDate;

      // Save the uploaded file to disk
      const { fileName, fileUrl } = await uploadFile(req.file, folder);

      res.json({
        fileName,
        fileUrl,
        status: "success",
      });
    } catch (error) {
      next(error);
    }
  })();
}

export function fileDownloadHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  (async () => {
    try {
      const { fileName, folderName } = req.body;
      const currentDate = new Date().toISOString().split("T")[0];
      const folder = folderName || currentDate;

      // Simple implementation to construct file URL
      const fileUrl = `/uploads/${folder}/${fileName}`;

      // Check if file exists
      const filePath = path.join(process.cwd(), fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found." });
      }

      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  })();
}
