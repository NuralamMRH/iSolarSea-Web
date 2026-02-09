import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// Vercel serverless function (for production)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, folderName } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const folder = folderName || currentDate;
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      folder,
      fileName
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found." });
    }

    fs.unlinkSync(filePath);

    return res.json({
      message: "File deleted successfully",
      status: "success",
    });
  } catch (error) {
    console.error("Error in file deletion:", error);
    return res.status(500).json({
      error: "File deletion failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// Express middleware (for development)
export function fileDeleteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  (async () => {
    try {
      const { fileName, folderName } = req.body;

      const currentDate = new Date().toISOString().split("T")[0];
      const folder = folderName || currentDate;
      const fileUrl = `/uploads/${folder}/${fileName}`;
      const filePath = path.join(process.cwd(), fileUrl);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found." });
      }

      fs.unlinkSync(filePath);

      res.json({
        message: "File deleted successfully",
        status: "success",
      });
    } catch (error) {
      next(error);
    }
  })();
}
