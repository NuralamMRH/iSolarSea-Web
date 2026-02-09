import React from "react";

export default function VesselSelection() {
  return (
    <div className="vessel-selection mb-6">
      <p className="text-center mb-4">• Chọn tàu từ danh sách thả xuống</p>
      <div className="vessel-categories flex flex-col md:flex-row justify-between gap-4">
        <div className="vessel-category bg-amber-100 rounded-md p-3 md:w-1/3">
          <div className="category-header bg-amber-300 rounded-t-md p-2 flex justify-between items-center">
            <span className="font-medium">Tàu Khai Thác</span>
            <span className="close-icon">×</span>
          </div>
          <ul className="vessel-list" id="fishing-vessels-list">
            {/* <!-- Vessel items will be populated dynamically --> */}
          </ul>
        </div>

        <div className="vessel-category bg-amber-100 rounded-md p-3 md:w-1/3">
          <div className="category-header bg-amber-300 rounded-t-md p-2 flex justify-between items-center">
            <span className="font-medium">Tàu DV Hậu Cần</span>
            <span className="close-icon">×</span>
          </div>
          <ul className="vessel-list" id="logistics-vessels-list">
            {/* <!-- Vessel items will be populated dynamically --> */}
          </ul>
        </div>

        <div className="vessel-category bg-amber-100 rounded-md p-3 md:w-1/3">
          <div className="category-header bg-amber-300 rounded-t-md p-2 flex justify-between items-center">
            <span className="font-medium">Khác</span>
            <span className="close-icon">×</span>
          </div>
          <ul className="vessel-list" id="other-vessels-list">
            {/* <!-- Vessel items will be populated dynamically --> */}
          </ul>
        </div>
      </div>
    </div>
  );
}
