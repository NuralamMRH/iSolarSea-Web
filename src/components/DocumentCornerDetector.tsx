import React, { useRef, useState, useEffect } from "react";
import getCv from "opencv-ts";

type Point = { x: number; y: number };

function orderPoints(points: Point[]): Point[] {
  const sortedX = [...points].sort((a, b) => a.x - b.x);
  const leftPoints = sortedX.slice(0, 2).sort((a, b) => a.y - b.y);
  const rightPoints = sortedX.slice(2, 4).sort((a, b) => a.y - b.y);
  return [leftPoints[0], rightPoints[0], rightPoints[1], leftPoints[1]];
}

function inferFourCorners(points: Point[], w: number, h: number): Point[] {
  if (points.length === 4) return orderPoints(points);
  if (points.length === 2) {
    const [p1, p2] = points;
    return orderPoints([p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }]);
  }
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

async function detectDocumentCorners(img: HTMLImageElement): Promise<Point[]> {
  const cv = getCv;
  const src = cv.imread(img);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Improve contrast and binarize
  const bin = new cv.Mat();
  cv.adaptiveThreshold(
    gray,
    bin,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    11,
    2
  );

  // Dilate to close gaps
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  cv.dilate(bin, bin, kernel);

  // Find edges
  const edges = new cv.Mat();
  cv.Canny(bin, edges, 50, 150);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  let maxArea = 0;
  let bestApprox: typeof cv.Mat | null = null;
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const peri = cv.arcLength(cnt, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
    // Filter by area and aspect ratio
    const area = cv.contourArea(cnt);
    if (
      (approx.rows === 4 || approx.rows === 2) &&
      area > maxArea &&
      area > (src.rows * src.cols) / 8 // at least 1/8th of image
    ) {
      maxArea = area;
      if (bestApprox) bestApprox.delete();
      bestApprox = approx.clone();
    }
    approx.delete();
    cnt.delete();
  }
  contours.delete();
  hierarchy.delete();
  gray.delete();
  bin.delete();
  edges.delete();
  kernel.delete();
  src.delete();

  if (!bestApprox) return [];
  const points: Point[] = [];
  for (let i = 0; i < bestApprox.rows; i++) {
    points.push({
      x: bestApprox.intAt(i, 0),
      y: bestApprox.intAt(i, 1),
    });
  }
  bestApprox.delete();
  return points;
}

function straightenImage(
  img: HTMLImageElement,
  corners: Point[]
): string | null {
  const cv = getCv;
  const src = cv.imread(img);

  // Destination points: corners of a rectangle (A4 aspect ratio or image size)
  const width = Math.max(
    Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y),
    Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y)
  );
  const height = Math.max(
    Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y),
    Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y)
  );

  const dstCorners = [
    new cv.Point(0, 0),
    new cv.Point(width - 1, 0),
    new cv.Point(width - 1, height - 1),
    new cv.Point(0, height - 1),
  ];

  const srcTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    corners.flatMap((pt) => [pt.x, pt.y])
  );
  const dstTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    dstCorners.flatMap((pt) => [pt.x, pt.y])
  );

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(width, height));

  // Convert result to data URL
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  cv.imshow(canvas, dst);

  // Clean up
  src.delete();
  dst.delete();
  srcTri.delete();
  dstTri.delete();
  M.delete();

  return canvas.toDataURL();
}

interface DocumentCornerDetectorProps {
  onCornersDetected: (file: File, corners: Point[], imageUrl: string) => void;
  scanning: boolean;
}

export default function DocumentCornerDetector({
  onCornersDetected,
  scanning,
}: DocumentCornerDetectorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualCorners, setManualCorners] = useState<Point[] | null>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCorners([]);
    setSelectedFile(file);
    setTimeout(async () => {
      if (imgRef.current) {
        const detected = await detectDocumentCorners(imgRef.current);
        const fourCorners = inferFourCorners(
          detected,
          imgRef.current.width,
          imgRef.current.height
        );
        setCorners(fourCorners);

        // Straighten the image
        const straightenedDataUrl = straightenImage(
          imgRef.current,
          fourCorners
        );

        // Use straightenedDataUrl for preview and OCR
        onCornersDetected(file, fourCorners, straightenedDataUrl || url);
      }
    }, 100);
  };

  const handleDragCorner = (index: number, newX: number, newY: number) => {
    if (!manualCorners) return;
    const updated = [...manualCorners];
    updated[index] = { x: newX, y: newY };
    setManualCorners(updated);
  };

  useEffect(() => {
    if (corners.length === 4) setManualCorners(corners);
  }, [corners]);

  return (
    <div
      style={{
        position: "relative",
        width: 500,
        height: 700,
        border: "2px dashed #aaa",
        borderRadius: 8,
        background: isDragging ? "#e0f2fe" : "#f8fafc",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        id="file-upload-input-corner"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2,
          background: "rgba(255,255,255,0.8)",
          padding: "4px 8px",
          borderRadius: 4,
          cursor: "pointer",
        }}
        onClick={() =>
          document.getElementById("file-upload-input-corner")?.click()
        }
      >
        {isDragging ? "Drop image here" : "Click or drag image here"}
      </div>
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Preview"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      )}
      {/* Overlay corners */}
      {corners.length === 4 &&
        corners.map((pt, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(pt.x / (imgRef.current?.width || 1)) * 100}%`,
              top: `${(pt.y / (imgRef.current?.height || 1)) * 100}%`,
              width: 16,
              height: 16,
              background: "red",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid #fff",
              zIndex: 10,
            }}
          />
        ))}
      {imageUrl &&
        manualCorners &&
        manualCorners.length === 4 &&
        manualCorners.map((pt, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(pt.x / (imgRef.current?.width || 1)) * 100}%`,
              top: `${(pt.y / (imgRef.current?.height || 1)) * 100}%`,
              width: 20,
              height: 20,
              background: "blue",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid #fff",
              zIndex: 20,
              cursor: "pointer",
            }}
            draggable
            onDrag={(e) => {
              const rect =
                e.currentTarget.parentElement!.getBoundingClientRect();
              const x =
                ((e.clientX - rect.left) / rect.width) *
                (imgRef.current?.width || 1);
              const y =
                ((e.clientY - rect.top) / rect.height) *
                (imgRef.current?.height || 1);
              handleDragCorner(i, x, y);
            }}
          />
        ))}
      {/* Scanning overlay */}
      {scanning && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-lg font-semibold">Scanning...</div>
          </div>
        </div>
      )}
    </div>
  );
}
