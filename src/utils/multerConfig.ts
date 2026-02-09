import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";

export function getMulterUpload(subfolder: string = "") {
  const uploadPath = path.join("public", "uploads", subfolder);
  // Ensure the upload directory exists
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage: StorageEngine = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|avif)$/i)) {
        return cb(new Error("Only image files are allowed!"));
      }
      cb(null, true);
    },
  });
}
