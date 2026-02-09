import React from 'react'

export default function VesselFleetInfo() {
  return (
    <div className="vessel-fleet-info mb-6">
      <h4 className="font-bold text-blue-700 mb-2">THÔNG TIN ĐỘI TÀU</h4>
      <div className="vessel-types flex flex-col md:flex-row justify-between">
        <div className="vessel-type mb-2">
          <div className="info-row">
            <span className="font-medium">Loại Tàu (1) - Khai Thác:</span>
            <span className="ml-2">Số lượng: 5</span>
          </div>
        </div>
        <div className="vessel-type mb-2">
          <div className="info-row">
            <span className="font-medium">Loại Tàu (2) - Dịch Vụ Hậu Cần:</span>
            <span className="ml-2">Số lượng: 5</span>
          </div>
        </div>
        <div className="vessel-type mb-2">
          <div className="info-row">
            <span className="font-medium">Loại Tàu (3) - Khác (nếu có):</span>
            <span className="ml-2">Số lượng:</span>
          </div>
        </div>
      </div>
    </div>
  );
}
