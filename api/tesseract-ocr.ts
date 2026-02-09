import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Request, Response, NextFunction } from "express";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import { uploadFile } from "../src/utils/fileUploader";
import formidable from "formidable";
import { writeFile, mkdir } from "fs/promises";
import { readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Multer } from "multer";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Helper to generate unique filename (matching original fileUploader)
function generateUniqueFileName(originalName: string) {
  const extension = path.extname(originalName || ".jpg");
  const filename = `${
    new Date().toISOString().split("T")[0]
  }-${uuidv4()}${extension}`;
  return filename;
}

// Helper to ensure upload directory exists
async function ensureUploadDirectory(uploadDir: string) {
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
}

// Helper to save uploaded file (matching original fileUploader pattern)
async function saveUploadedFile(
  file: formidable.File,
  subfolder = "tesseract"
): Promise<{ fileName: string; fileUrl: string }> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await ensureUploadDirectory(uploadDir);

  const fileName = generateUniqueFileName(file.originalFilename || "image.jpg");
  const destPath = path.join(uploadDir, fileName);

  // Read uploaded file and write to destination
  const fileBuffer = readFileSync(file.filepath);
  await writeFile(destPath, fileBuffer);

  const fileUrl = `/uploads/${subfolder}/${fileName}`.replace(/\\/g, "/");
  return { fileName, fileUrl };
}

// Helper to extract a field using regex patterns with fallback
function extractField(
  text: string,
  patterns: RegExp[],
  fieldKey?: string
): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let extracted = match[1].trim().replace(/\s{2,}/g, " ");

      // Post-processing for vessel_owner to remove everything after "Nơi thường trú:"
      if (fieldKey === "vessel_owner") {
        // Remove everything after "Nơi thường trú:" or its variations
        extracted = extracted.replace(
          /\s*(nơi thường tr[úó]|residential address).*$/i,
          ""
        );
        extracted = extracted.trim();
      }

      // Post-processing for length_overall to remove everything after "Chiều rộng"
      if (fieldKey === "length_overall") {
        // Remove everything after "Chiều rộng" or breadth labels
        extracted = extracted.replace(/\s*(chiều rộng|breadth).*$/i, "");
        extracted = extracted.trim();
      }

      // Post-processing for draught to remove everything after "Chiều chìm"
      if (fieldKey === "draught") {
        // Remove everything after "Chiều chìm" or draft depth labels
        extracted = extracted.replace(
          /\s*(chiều\s*chìm|draught\s*depth).*$/i,
          ""
        );
        extracted = extracted.trim();
      }

      // Post-processing for type_of_machine to remove engine numbers and other text
      if (fieldKey === "type_of_machine") {
        // Remove everything after engine numbers like "B-11124"
        extracted = extracted.replace(/\s*[A-Z]-\d+.*$/i, "");
        // Remove any trailing numbers or symbols
        extracted = extracted.replace(/\s*\d+.*$/i, "");
        extracted = extracted.trim();
      }

      // Post-processing for number_engines to ensure correct hyphenated format
      if (fieldKey === "number_engines") {
        // Extract only the hyphenated engine number pattern
        const engineMatch = extracted.match(/([A-Z]-\d{4,6})/i);
        if (engineMatch) {
          extracted = engineMatch[1];
        }
        extracted = extracted.trim();
      }

      // Post-processing for port_registry to remove everything after inspection center label
      if (fieldKey === "port_registry") {
        // Remove everything after various inspection center patterns
        extracted = extracted.replace(
          /\s*(cơ sở đăng kiểm|register of vessels|trung tâm đăng kiểm).*$/i,
          ""
        );
        // Remove everything after "kiểm tàu cá" variations
        extracted = extracted.replace(/\s*(kiểm tàu cá|port registry).*$/i, "");
        // Remove everything after place names that indicate next section
        extracted = extracted.replace(
          /\s*(quảng ngãi|bà rịa|vũng tàu).*$/i,
          ""
        );
        extracted = extracted.trim();
      }

      return extracted;
    }
  }
  return null;
}

// Improve image preprocessing
async function preprocessImage(imagePath: string): Promise<Buffer> {
  const imageBuffer = readFileSync(imagePath);
  return sharp(imageBuffer)
    .resize(3000, 3000, { fit: "inside", withoutEnlargement: true })
    .gamma(1.5) // Increase contrast
    .normalize() // Normalize the image
    .sharpen({ sigma: 2 }) // Increase sharpening
    .threshold(150) // Adjust threshold for better text extraction
    .png()
    .toBuffer();
}

// Update field patterns with more flexible matching
const fieldPatterns: Record<string, RegExp[]> = {
  vessel_owner: [
    /chủ tàu[:\s]*([^\n]+?)(?:\n|vessel owner|hô hiêu|$)/i,
    /vessel owner[:\s]*([^\n]+?)(?:\n|$)/i,
    /owner[:\s]*([^\n]+?)(?:\n|$)/i,
    /([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ\s]{3,})\s*(?:vessel owner|chủ tàu)/i,
  ],
  owner_id: [
    /cccd[:\s]*([0-9]{9,12})/i,
    /cmnd[:\s]*([0-9]{9,12})/i,
    /citizen id[:\s]*([0-9]{9,12})/i,
    /id[:\s]*([0-9]{9,12})/i,
    /([0-9]{9,12})/i,
  ],
  vessel_id: [
    /số đăng ký[:\s]*([A-Z]{2}[-\s]?\d{4,5}[-\s]?[A-Z]{1,2})/i,
    /(?:BV|CV)[-\s]?\d{4,5}[-\s]?TS/i,
    /number[:\s]*([A-Z]{2}[-\s]?\d{4,5}[-\s]?[A-Z]{1,2})/i,
    /registry[:\s]*([A-Z]{2}[-\s]?\d{4,5}[-\s]?[A-Z]{1,2})/i,
    /([A-Z]{2}[-\s]?\d{4,5}[-\s]?TS)/i,
  ],
  type_of_vessel: [
    /kiểu tàu[:\s]*([^\n]+?)(?:\n|type of vessel|$)/i,
    /type of vessel[:\s]*([^\n]+?)(?:\n|$)/i,
    /tàu\s*(cá[^\n]*)/i,
    /fishing\s*(vessel[^\n]*)/i,
    /vessel type[:\s]*([^\n]+?)(?:\n|$)/i,
  ],
  gross_tonnage: [
    /tổng dung tích[^:]*gt[:\s]*([0-9,.]+)/i,
    /gross tonnage[:\s]*([0-9,.]+)/i,
    /gt[:\s]*([0-9,.]+)/i,
    /(\d{1,3}[,.]\d{1,2})\s*(?:gt|tổng|gross)/i,
    /tonnage[:\s]*([0-9,.]+)/i,
  ],
  length_overall: [
    /chiều dài[^:]*lmax?[^:]*m[:\s]*([0-9,.]+)/i,
    /length[:\s]*([0-9,.]+)/i,
    /lmax?[^:]*m[:\s]*([0-9,.]+)/i,
    /(\d{1,2}[,.]\d{1,2})\s*(?:m|chiều dài|length)/i,
  ],
  breadth: [
    /chiều rộng[^:]*b[^:]*m[:\s]*([0-9,.]+)/i,
    /breadth[:\s]*([0-9,.]+)/i,
    /bmax?[:\s]*([0-9,.]+)/i,
    /(\d{1,2}[,.]\d{1,2})\s*(?:m.*chiều rộng|breadth)/i,
  ],
  draught: [
    /chiều\s*cao\s*mạn[^:]*d[^:]*m[:\s]*([0-9,.]+)/i,
    /draught[:\s]*([0-9,.]+)/i,
    /depth[:\s]*([0-9,.]+)/i,
    /d[^:]*m[:\s]*([0-9,.]+)/i,
    /(\d{1,2}[,.]\d{1,2})\s*(?:m.*chiều cao|draught|depth)/i,
  ],
  materials: [
    /vật liệu[:\s]*([^\n]+?)(?:\n|materials|$)/i,
    /materials[:\s]*([^\n]+?)(?:\n|$)/i,
    /(?:gỗ|wood|steel|composite|fiberglass)[^\n]*/i,
  ],
  number_of_engines: [
    /số lượng máy[:\s]*(\d+)/i,
    /number of engines[:\s]*(\d+)/i,
    /engines[:\s]*(\d+)/i,
    /(\d+)\s*(?:engines|máy)/i,
  ],
  total_power: [
    /tổng công suất[^:]*kw[:\s]*([0-9,.]+)/i,
    /total power[:\s]*([0-9,.]+)/i,
    /công suất[^:]*kw[:\s]*([0-9,.]+)/i,
    /power[:\s]*([0-9,.]+)/i,
    /(\d{2,3}[,.]\d{1,2})\s*(?:kw|công suất|power)/i,
  ],
  type_of_machine: [
    /ký hiệu máy[:\s]*([A-Z][A-Z0-9\s]+)/i,
    /type of machine[:\s]*([A-Z][A-Z0-9\s]+)/i,
    /(DAEWOO|HINO|YANMAR|DEUTZ|CATERPILLAR|VOLVO|ISUZU|MITSUBISHI)[^\n]*/i,
    /machine[:\s]*([A-Z][A-Z0-9\s]+)/i,
  ],
  number_engines: [
    /số máy[:\s]*([A-Z0-9-]+)/i,
    /engine number[:\s]*([A-Z0-9-]+)/i,
    /([A-Z]-\d{4,6})/i,
    /((?:DAEWOO|HINO|YANMAR|DEUTZ|CATERPILLAR|VOLVO|ISUZU|MITSUBISHI)\s+[A-Z0-9-]+)/i,
  ],
  port_registry: [
    /cảng đăng ký[:\s]*([^\n]+?)(?:\n|cơ sở|$)/i,
    /port registry[:\s]*([^\n]+?)(?:\n|$)/i,
    /port of registry[:\s]*([^\n]+?)(?:\n|$)/i,
    /registry[:\s]*([^\n]+?)(?:\n|$)/i,
  ],
};

// Improve text normalization
function normalizeOcrText(raw: string): string {
  let text = raw
    .replace(/[：]/g, ":")
    .replace(/ :/g, ":")
    .replace(/\s+/g, " ")
    .replace(/[^ -~\u00C0-\u1EF9\n]+/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([^\n])\n(?=[^\n])/g, "$1 ")
    .replace(/\n+/g, "\n")
    .trim();

  // Additional Vietnamese text normalization
  text = text
    .replace(/[ăâ]/g, "a")
    .replace(/[êế]/g, "e")
    .replace(/[ôơ]/g, "o")
    .replace(/[ưứ]/g, "u")
    .replace(/[đ]/g, "d");

  return text;
}

// Extract structured fields from OCR text with improved patterns
function extractFieldsFromText(rawText: string): Record<string, string | null> {
  const text = normalizeOcrText(rawText);
  const lowerText = text.toLowerCase();

  const extracted: Record<string, string | null> = {};
  for (const [key, patterns] of Object.entries(fieldPatterns)) {
    extracted[key] = extractField(text, patterns, key);

    // If no match found, try on the original raw text
    if (!extracted[key]) {
      extracted[key] = extractField(rawText, patterns, key);
    }
  }

  return extracted;
}

// Add direct field extraction for Gemini response
function extractFieldsFromGeminiResponse(
  text: string
): Record<string, string | null> {
  const lines = text.split("\n");
  const result: Record<string, string | null> = {
    vessel_owner: null,
    owner_id: null,
    residential_address: null,
    vessel_id: null,
    type_of_vessel: null,
    gross_tonnage: null,
    length_overall: null,
    breadth: null,
    draught: null,
    materials: null,
    number_of_engines: null,
    total_power: null,
    type_of_machine: null,
    number_engines: null,
    port_registry: null,
  };

  for (const line of lines) {
    const [key, ...valueParts] = line.split(":").map((part) => part.trim());
    const value = valueParts.join(":").trim();
    const keyLower = key.toLowerCase();

    // Handle both Vietnamese and English keys
    switch (keyLower) {
      case "vessel owner":
      case "chủ tàu":
        result.vessel_owner = value;
        break;
      case "owner id":
      case "cccd":
      case "cmnd":
        result.owner_id = value !== "Không có thông tin" ? value : null;
        break;
      case "residential address":
      case "nơi thường trú":
        result.residential_address = value;
        break;
      case "vessel id":
      case "số đăng ký":
        result.vessel_id = value;
        break;
      case "type of vessel":
      case "kiểu tàu":
        result.type_of_vessel = value;
        break;
      case "gross tonnage":
      case "tổng dung tích":
        result.gross_tonnage = value;
        break;
      case "length overall":
      case "chiều dài":
        result.length_overall = value;
        break;
      case "breadth":
      case "chiều rộng":
        result.breadth = value;
        break;
      case "draught":
      case "chiều cao mạn":
        result.draught = value;
        break;
      case "materials":
      case "vật liệu vỏ":
        result.materials = value;
        break;
      case "number of engines":
      case "số lượng máy":
        result.number_of_engines = value;
        break;
      case "total power":
      case "tổng công suất":
        result.total_power = value.replace(" KW", ""); // Remove KW suffix if present
        break;
      case "type of machine":
      case "ký hiệu máy":
        result.type_of_machine = value;
        break;
      case "number engines":
      case "số máy":
        result.number_engines = value;
        break;
      case "port registry":
      case "cảng đăng ký":
        result.port_registry = value;
        break;
    }
  }

  return result;
}

// Update Gemini processing function
async function processImageWithGemini(
  imageBuffer: Buffer
): Promise<Record<string, string | null>> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Updated to correct model name
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const prompt = `Please analyze this vessel registration document and extract the following information. Return ONLY the key-value pairs in Vietnamese, no additional text:

Chủ tàu
Nơi thường trú
Số đăng ký
Kiểu tàu
Tổng dung tích
Chiều dài
Chiều rộng
Chiều cao mạn
Vật liệu vỏ
Số lượng máy
Tổng công suất
Ký hiệu máy
Số máy
Cảng đăng ký

Format each line exactly as "Key: Value" and separate with newlines. Do not include any additional text or formatting.`;

  try {
    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini raw response:", text);

    // Use the new extraction function for Gemini response
    return extractFieldsFromGeminiResponse(text);
  } catch (error) {
    console.error("Error in Gemini processing:", error);
    throw error;
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
      filter: (part) => {
        return part.mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);
    const image = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!image || !image.filepath) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    // Save the uploaded file and get the URL (matching original pattern)
    const { fileName, fileUrl } = await saveUploadedFile(image, "tesseract");

    // Preprocess the image for better results
    const processedBuffer = await preprocessImage(image.filepath);

    let extractedData: Record<string, string | null>;
    let rawText: string = "";

    // Use Gemini if API key is available, otherwise fallback to Tesseract
    if (process.env.GOOGLE_API_KEY) {
      try {
        extractedData = await processImageWithGemini(processedBuffer);
      } catch (error) {
        console.error(
          "Gemini processing failed, falling back to Tesseract:",
          error
        );
        // Fallback to Tesseract if Gemini fails
        const worker = await createWorker("eng+vie");
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        });
        const {
          data: { text },
        } = await worker.recognize(processedBuffer);
        rawText = text;
        extractedData = extractFieldsFromText(text);
        await worker.terminate();
      }
    } else {
      // Use Tesseract as fallback
      const worker = await createWorker("eng+vie");
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      const {
        data: { text },
      } = await worker.recognize(processedBuffer);
      rawText = text;
      extractedData = extractFieldsFromText(text);
      await worker.terminate();
    }

    // Clean up temp uploaded file
    if (existsSync(image.filepath)) {
      unlinkSync(image.filepath);
    }

    return res.json({
      success: true,
      rawText,
      extractedData,
      fileName,
      fileUrl,
      processor: process.env.GOOGLE_API_KEY ? "gemini" : "tesseract",
    });
  } catch (error) {
    console.error("Error in OCR processing:", error);
    return res.status(500).json({
      error: "OCR processing failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// Express middleware (for development)
export function tesseractOcrHandler(
  req: Request & { file?: Multer.File },
  res: Response,
  next: NextFunction
) {
  (async () => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Save the uploaded file to disk
      const { fileName, fileUrl } = await uploadFile(req.file, "tesseract");
      const filePath = path.join(process.cwd(), fileUrl);

      // Enhanced image preprocessing
      const processedImageBuffer = await preprocessImage(filePath);

      // OCR with Tesseract
      const worker = await createWorker("eng+vie");

      // Use PSM 6 for uniform block of text
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      let extractedData: Record<string, string | null>;
      let rawText: string = "";

      // Use Gemini if API key is available, otherwise fallback to Tesseract
      if (process.env.GOOGLE_API_KEY) {
        try {
          extractedData = await processImageWithGemini(processedImageBuffer);
        } catch (error) {
          console.error(
            "Gemini processing failed, falling back to Tesseract:",
            error
          );
          // Fallback to Tesseract if Gemini fails
          const worker = await createWorker("eng+vie");
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          });
          const {
            data: { text },
          } = await worker.recognize(processedImageBuffer);
          rawText = text;
          extractedData = extractFieldsFromText(text);
          await worker.terminate();
        }
      } else {
        const {
          data: { text },
        } = await worker.recognize(processedImageBuffer);

        await worker.terminate();

        if (!text) {
          throw new Error("Could not extract text from the document.");
        }

        // Extract all data using multiple methods
        extractedData = extractFieldsFromText(text);
      }

      res.json({
        extractedData,
        rawText: rawText,
        fileUrl,
        status: "success",
        processor: process.env.GOOGLE_API_KEY ? "gemini" : "tesseract",
      });
    } catch (error) {
      next(error);
    }
  })();
}
