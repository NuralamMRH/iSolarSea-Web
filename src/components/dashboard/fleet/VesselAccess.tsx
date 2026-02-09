import React from 'react'

export default function VesselAccess() {
  return (
    <div className="vessel-access-section text-center mb-6">
      <h4 className="font-bold text-blue-700 mb-4 text-xl">
        CẤP QUYỀN TRUY CẬP CHO TÀU
      </h4>
      <div className="access-buttons flex justify-center gap-4 mt-5">
        <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md">
          CẤP QUYỀN CHO TÀU
        </button>
        <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-md">
          + UPLOAD FILE
        </button>
      </div>
    </div>
  );
}
