/**
 * Declaration Data
 * This file contains detailed declaration data for IUU reporting
 * Specifically for vessel VN-KG-13579 and trip TRIP-2023-006
 */

const declarationData = {
  // Main declaration information
  id: "DECL-2023-006",
  vesselId: "VN-KG-13579",
  tripId: "TRIP-2023-006",
  declarationDate: "23/02/2023",

  // Vessel information
  vessel: {
    name: "Kiên Giang 13579",
    registrationNumber: "VN-KG-13579",
    ownerName: "Đặng Văn Thành",
    ownerAddress: "123 Nguyễn Trãi, Rạch Giá, Kiên Giang",
    captainName: "Trần Quốc Việt",
    captainId: "CAPT-2023-042",
    vesselType: "Khai Thác",
    vesselLength: "28.5",
    enginePower: "450",
    crewCount: "12",
  },

  // Trip information
  trip: {
    departurePort: "Cảng Rạch Giá",
    departureDate: "15/02/2023",
    departureTime: "05:30",
    returnPort: "Cảng Rạch Giá",
    returnDate: "23/02/2023",
    returnTime: "17:30",
    fishingZones: ["Kiên Giang - Zone F", "Cà Mau - Zone G"],
    fishingGear: "Lưới vây (Purse Seine)",
    fishingMethod: "Vây quanh đàn cá",
  },

  // Catch details
  catches: [
    {
      date: "23/02/2023",
      time: "14:40",
      zone: "Kiên Giang - Zone F",
      species: "Cá chẽm (Seabass)",
      productId: "BASS-011",
      quantity: 890,
      unit: "kg",
      fishImage: "../assets/images/common_img/fish-image.png",
    },
    {
      date: "23/02/2023",
      time: "17:05",
      zone: "Kiên Giang - Zone F",
      species: "Cá rô phi (Tilapia)",
      productId: "TILA-012",
      quantity: 750,
      unit: "kg",
      fishImage: "../assets/images/common_img/fish-image.png",
    },
    {
      date: "22/02/2023",
      time: "09:15",
      zone: "Cà Mau - Zone G",
      species: "Cá ngừ (Tuna)",
      productId: "TUNA-013",
      quantity: 320,
      unit: "kg",
      fishImage: "../assets/images/common_img/fish-image.png",
    },
    {
      date: "21/02/2023",
      time: "16:30",
      zone: "Kiên Giang - Zone F",
      species: "Cá thu (Mackerel)",
      productId: "MACK-014",
      quantity: 450,
      unit: "kg",
      fishImage: "../assets/images/common_img/fish-image.png",
    },
  ],

  // Transshipment information (if any)
  transshipments: [
    {
      date: "22/02/2023",
      receivingVesselId: "VN-CM-54321",
      receivingVesselName: "Cà Mau 54321",
      species: "Cá ngừ (Tuna)",
      quantity: 150,
      unit: "kg",
    },
  ],

  // Port activities
  portActivities: {
    unloadingPort: "Cảng Rạch Giá",
    unloadingDate: "23/02/2023",
    unloadingTime: "18:30",
    receivingFacility: "Nhà Máy Chế Biến Hải Sản Nam Phương",
    inspectionOfficer: "Nguyễn Văn Kiểm",
    inspectionNotes: "Kiểm tra đầy đủ, không phát hiện bất thường",
  },

  // Certification
  certification: {
    captainSignature: true,
    captainSignatureDate: "23/02/2023",
    inspectorSignature: true,
    inspectorSignatureDate: "23/02/2023",
    certificateNumber: "IUU-KG-2023-006",
    certificateIssueDate: "24/02/2023",
    certificateExpiryDate: "24/05/2023",
  },

  // Additional information
  additionalInfo: {
    weatherConditions: "Biển êm, gió nhẹ, nhiệt độ 28-32°C",
    incidentReports: "Không có sự cố",
    observations: "Hoạt động khai thác diễn ra bình thường",
  },
};

// Make the data available globally
window.declarationData = declarationData;

// Helper function to get formatted declaration for display
window.getFormattedDeclaration = function () {
  const declaration = window.declarationData;

  // Calculate total catch
  const totalCatch = declaration.catches.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Calculate total transshipped
  const totalTransshipped = declaration.transshipments.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Calculate total landed
  const totalLanded = totalCatch - totalTransshipped;

  return {
    ...declaration,
    totalCatch,
    totalTransshipped,
    totalLanded,
    formattedDepartureDate: `Ngày ${
      declaration.trip.departureDate.split("/")[0]
    } tháng ${declaration.trip.departureDate.split("/")[1]} năm ${
      declaration.trip.departureDate.split("/")[2]
    }`,
    formattedReturnDate: `Ngày ${
      declaration.trip.returnDate.split("/")[0]
    } tháng ${declaration.trip.returnDate.split("/")[1]} năm ${
      declaration.trip.returnDate.split("/")[2]
    }`,
  };
};
