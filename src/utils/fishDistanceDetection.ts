// Fish Distance Detection and Weight Calculation using MediaPipe
// Based on the MediaPipe face mesh approach adapted for fish detection

interface FishLandmark {
  x: number;
  y: number;
  z: number;
}

interface FishDetectionResult {
  distance: number; // in cm
  realLength: number; // in cm
  realGirth: number; // in cm (estimated)
  weight: number; // in kg
  confidence: number;
  landmarks: FishLandmark[];
}

interface CameraConfig {
  width: number;
  height: number;
  normalizedFocalX: number; // Camera-specific focal length normalization
}

// Add interfaces for the detection data structure
interface DistanceAnalysis {
  distance_cm: number;
  real_length_cm: number;
  real_girth_cm: number;
  estimated_weight_kg: number;
  distance_confidence: number;
  calculation_method: string;
  formulas_used: string[];
}

interface FishClassification {
  accuracy: number;
  common_name: string;
  scientific_name: string;
  species: string;
  species_id: string;
}

interface FishDetectionData {
  fish_id: number;
  classification: FishClassification;
  detection: {
    bounding_box: number[];
    confidence: number;
    detected_class: string;
    model: string;
  };
  metrics: {
    dimensions: {
      area_pixels: number;
      height_pixels: number;
      width_pixels: number;
    };
    position: {
      center_x: number;
      center_y: number;
      relative_center_x: number;
      relative_center_y: number;
    };
    relative_size: {
      area_ratio: number;
      height_ratio: number;
      width_ratio: number;
    };
    size_category: string;
  };
  polygon: number[][];
  processing_time_ms: number;
  distance_analysis?: DistanceAnalysis;
}

interface FishAnalysisData {
  success: boolean;
  fish_count: number;
  detections: FishDetectionData[];
  annotated_image?: {
    filename: string;
    url: string;
  };
  models_used?: {
    classification: string;
    detection: string;
  };
  processing_time?: {
    classification_ms: number;
    detection_ms: number;
    total_ms: number;
  };
  image_info?: {
    channels: number;
    height: number;
    width: number;
    size_mb: number;
  };
  timestamp: string;
  error?: string;
}

// Fish measurement constants
const FISH_CONSTANTS = {
  // Average fish eye diameter in mm (varies by species but useful for reference)
  AVERAGE_EYE_DIAMETER: 8, // mm
  AVERAGE_HEAD_TO_TAIL_RATIO: 0.15, // Head typically 15% of total length
  GIRTH_TO_LENGTH_RATIO: 0.25, // Girth typically 25% of length for average fish

  // Camera configurations for different devices
  CAMERA_CONFIGS: {
    default: { normalizedFocalX: 1.40625 }, // Similar to Logitech HD Pro C922
    mobile: { normalizedFocalX: 1.2 },
    webcam: { normalizedFocalX: 1.40625 },
  },

  // Weight calculation formulas
  WEIGHT_FORMULAS: {
    // Standard formula: (length x girth x girth) / 800
    STANDARD: (length: number, girth: number) => (length * girth * girth) / 800,
    // Alternative formula: (length x length x length) / 1200
    LENGTH_BASED: (length: number) => (length * length * length) / 1200,
    // Species-specific adjustments
    SPECIES_MULTIPLIERS: {
      bass: 1.1,
      trout: 0.9,
      salmon: 1.3,
      carp: 1.5,
      catfish: 1.4,
      tuna: 2.0,
      mackerel: 0.7,
      default: 1.0,
    },
  },
};

export class FishDistanceDetector {
  private cameraConfig: CameraConfig;

  constructor(
    width: number,
    height: number,
    deviceType: "default" | "mobile" | "webcam" = "default"
  ) {
    this.cameraConfig = {
      width,
      height,
      normalizedFocalX:
        FISH_CONSTANTS.CAMERA_CONFIGS[deviceType].normalizedFocalX,
    };
  }

  /**
   * Calculate distance to fish based on detected landmarks
   * This adapts the iris detection method for fish features
   */
  calculateDistance(landmarks: FishLandmark[]): number {
    if (landmarks.length < 2) {
      throw new Error("Need at least 2 landmarks to calculate distance");
    }

    // Find the widest span between landmarks (likely eye to eye or head features)
    let maxPixelDistance = 0;
    for (let i = 0; i < landmarks.length; i++) {
      for (let j = i + 1; j < landmarks.length; j++) {
        const dx = (landmarks[j].x - landmarks[i].x) * this.cameraConfig.width;
        const dy = (landmarks[j].y - landmarks[i].y) * this.cameraConfig.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        maxPixelDistance = Math.max(maxPixelDistance, distance);
      }
    }

    // Use average fish eye distance as reference (assuming we detect eye landmarks)
    const realFeatureSize = FISH_CONSTANTS.AVERAGE_EYE_DIAMETER; // mm
    const focalLength =
      Math.min(this.cameraConfig.width, this.cameraConfig.height) *
      this.cameraConfig.normalizedFocalX;

    // Distance formula: distance = (focal_length * real_size) / pixel_size
    const distance = (focalLength * realFeatureSize) / maxPixelDistance;

    return distance / 10; // Convert mm to cm
  }

  /**
   * Calculate real fish dimensions from polygon and distance
   */
  calculateRealDimensions(
    polygon: number[][],
    distance: number
  ): { length: number; girth: number } {
    if (polygon.length < 3) {
      throw new Error("Polygon must have at least 3 points");
    }

    // Calculate polygon bounding box in pixels
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const point of polygon) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }

    const pixelWidth = maxX - minX;
    const pixelHeight = maxY - minY;

    // Convert pixel dimensions to real dimensions using distance
    const focalLength =
      Math.min(this.cameraConfig.width, this.cameraConfig.height) *
      this.cameraConfig.normalizedFocalX;

    const realWidth = (pixelWidth * distance) / focalLength;
    const realHeight = (pixelHeight * distance) / focalLength;

    // Determine which dimension is length vs girth based on orientation
    const length = Math.max(realWidth, realHeight);
    const girth = Math.min(realWidth, realHeight) * 2; // Approximate girth from width/height

    return { length, girth };
  }

  /**
   * Calculate fish weight using standard formulas
   */
  calculateWeight(length: number, girth: number, species?: string): number {
    const speciesMultiplier = species
      ? FISH_CONSTANTS.WEIGHT_FORMULAS.SPECIES_MULTIPLIERS[
          species.toLowerCase() as keyof typeof FISH_CONSTANTS.WEIGHT_FORMULAS.SPECIES_MULTIPLIERS
        ] || FISH_CONSTANTS.WEIGHT_FORMULAS.SPECIES_MULTIPLIERS.default
      : FISH_CONSTANTS.WEIGHT_FORMULAS.SPECIES_MULTIPLIERS.default;

    // Use both formulas and average them for better accuracy
    const weightStandard = FISH_CONSTANTS.WEIGHT_FORMULAS.STANDARD(
      length,
      girth
    );
    const weightLengthBased =
      FISH_CONSTANTS.WEIGHT_FORMULAS.LENGTH_BASED(length);

    const averageWeight = (weightStandard + weightLengthBased) / 2;
    const adjustedWeight = averageWeight * speciesMultiplier;

    // Convert grams to kg
    return adjustedWeight / 1000;
  }

  /**
   * Process fish detection with distance and weight calculation
   */
  processDetection(
    landmarks: FishLandmark[],
    polygon: number[][],
    species?: string
  ): FishDetectionResult {
    try {
      // Calculate distance
      const distance = this.calculateDistance(landmarks);

      // Calculate real dimensions
      const { length, girth } = this.calculateRealDimensions(polygon, distance);

      // Calculate weight
      const weight = this.calculateWeight(length, girth, species);

      // Calculate confidence based on landmark quality and distance reasonableness
      const confidence = this.calculateConfidence(landmarks, distance, length);

      return {
        distance,
        realLength: length,
        realGirth: girth,
        weight,
        confidence,
        landmarks,
      };
    } catch (error) {
      console.error("Fish detection processing error:", error);
      return {
        distance: 0,
        realLength: 0,
        realGirth: 0,
        weight: 0,
        confidence: 0,
        landmarks: [],
      };
    }
  }

  /**
   * Calculate confidence score based on detection quality
   */
  private calculateConfidence(
    landmarks: FishLandmark[],
    distance: number,
    length: number
  ): number {
    let confidence = 1.0;

    // Reduce confidence if too few landmarks
    if (landmarks.length < 4) {
      confidence *= 0.7;
    }

    // Reduce confidence if distance seems unreasonable (too close or too far)
    if (distance < 10 || distance > 200) {
      // 10cm to 2m reasonable range
      confidence *= 0.5;
    }

    // Reduce confidence if fish size seems unreasonable
    if (length < 5 || length > 200) {
      // 5cm to 2m reasonable fish size
      confidence *= 0.6;
    }

    // Check landmark quality (z-depth consistency)
    const zVariance = this.calculateZVariance(landmarks);
    if (zVariance > 0.1) {
      confidence *= 0.8;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate z-depth variance to assess landmark quality
   */
  private calculateZVariance(landmarks: FishLandmark[]): number {
    if (landmarks.length === 0) return 1;

    const zValues = landmarks.map((l) => l.z);
    const mean = zValues.reduce((sum, z) => sum + z, 0) / zValues.length;
    const variance =
      zValues.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) /
      zValues.length;

    return Math.sqrt(variance);
  }
}

/**
 * Create a MediaPipe-style fish detection processor
 * This would integrate with the actual MediaPipe models for fish detection
 */
export class MediaPipeFishProcessor {
  private detector: FishDistanceDetector;

  constructor(
    width: number,
    height: number,
    deviceType: "default" | "mobile" | "webcam" = "default"
  ) {
    this.detector = new FishDistanceDetector(width, height, deviceType);
  }

  /**
   * Process image and return enhanced fish detection with distance and weight
   */
  async processImage(
    imageElement: HTMLImageElement,
    existingDetection: FishAnalysisData
  ): Promise<FishAnalysisData> {
    try {
      // Extract landmarks from existing detection or estimate from polygon
      const landmarks = this.extractLandmarksFromDetection(existingDetection);

      // Get polygon from existing detection
      const polygon = existingDetection?.detections?.[0]?.polygon || [];

      // Get species information
      const species =
        existingDetection?.detections?.[0]?.classification?.common_name;

      // Process with distance detection
      const distanceResult = this.detector.processDetection(
        landmarks,
        polygon,
        species
      );

      // Enhance the existing detection with distance and weight information
      const enhancedDetection: FishAnalysisData = {
        ...existingDetection,
        detections: existingDetection.detections?.map(
          (detection: FishDetectionData, index: number) => ({
            ...detection,
            distance_analysis:
              index === 0
                ? {
                    distance_cm: distanceResult.distance,
                    real_length_cm: distanceResult.realLength,
                    real_girth_cm: distanceResult.realGirth,
                    estimated_weight_kg: distanceResult.weight,
                    distance_confidence: distanceResult.confidence,
                    calculation_method: "mediapipe_landmarks",
                    formulas_used: [
                      "(length × girth × girth) / 800",
                      "(length × length × length) / 1200",
                    ],
                  }
                : undefined,
          })
        ),
      };

      return enhancedDetection;
    } catch (error) {
      console.error("MediaPipe fish processing error:", error);
      return existingDetection;
    }
  }

  /**
   * Extract or estimate landmarks from fish detection
   */
  private extractLandmarksFromDetection(
    detection: FishAnalysisData
  ): FishLandmark[] {
    if (!detection?.detections?.[0]) {
      return [];
    }

    const fishDetection = detection.detections[0];
    const polygon = fishDetection.polygon || [];

    if (polygon.length === 0) {
      return [];
    }

    // Estimate key landmarks from polygon (head, tail, top, bottom)
    const landmarks: FishLandmark[] = [];

    // Find extreme points as landmarks
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const point of polygon) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }

    // Create landmarks from extreme points (normalized coordinates)
    const width = detection.image_info?.width || 640;
    const height = detection.image_info?.height || 480;

    landmarks.push(
      { x: minX / width, y: (minY + maxY) / 2 / height, z: 0 }, // Left-most point
      { x: maxX / width, y: (minY + maxY) / 2 / height, z: 0 }, // Right-most point
      { x: (minX + maxX) / 2 / width, y: minY / height, z: 0 }, // Top-most point
      { x: (minX + maxX) / 2 / width, y: maxY / height, z: 0 } // Bottom-most point
    );

    return landmarks;
  }
}

// Export utility functions for easy integration
export const fishDistanceUtils = {
  createProcessor: (
    width: number,
    height: number,
    deviceType: "default" | "mobile" | "webcam" = "default"
  ) => new MediaPipeFishProcessor(width, height, deviceType),

  enhanceDetectionWithDistance: async (
    imageElement: HTMLImageElement,
    detection: FishAnalysisData,
    deviceType: "default" | "mobile" | "webcam" = "mobile"
  ) => {
    const processor = new MediaPipeFishProcessor(
      imageElement.width,
      imageElement.height,
      deviceType
    );
    return processor.processImage(imageElement, detection);
  },
};
