import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import { tesseractOcrHandler } from "./api/tesseract-ocr";
import { fileUploadHandler, fileDownloadHandler } from "./api/file-upload";
import { fileDeleteHandler } from "./api/file-delete";
import { getLocationHandler } from "./api/get-location";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Debug: Check if environment variables are loaded

console.log("VITE_API_URL:", process.env.VITE_API_URL || "Not found");

const app = express();

// Multer config for disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/avif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// CORS configuration to prevent duplicate headers
app.use(
  cors({
    origin: ["https://itrucksea.com", "https://www.itrucksea.com", "https://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// app.use(cookieParser());
app.use("/public", express.static(path.join(__dirname, "public")));

// Mount API routes
app.post("/api/tesseract-ocr", upload.single("image"), tesseractOcrHandler);
app.post("/api/file-upload", upload.single("file"), fileUploadHandler);
app.post("/api/file-download", fileDownloadHandler);
app.post("/api/file-delete", fileDeleteHandler);
app.get("/api/get-location", getLocationHandler);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    console.error(err.stack);
    res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    res.status(500).json({ error: "Unknown error", detail: err });
  }
});

app.listen(8081, () => {
  console.log("Server running on port 8081");
});
