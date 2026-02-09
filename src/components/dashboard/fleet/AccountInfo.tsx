import React from 'react'

export default function AccountInfo() {
  return (
    <div className="account-info-container flex flex-col md:flex-row justify-between mb-6">
      <div className="company-info md:w-1/2 mb-4 md:mb-0">
        <h4 className="font-bold text-blue-700 mb-2">THÔNG TIN CÔNG TY</h4>
        <div className="info-row mb-1">
          <span className="font-medium">Tên Công Ty:</span>
          <span className="ml-2"></span>
        </div>
        <div className="info-row mb-1">
          <span className="font-medium">Địa chỉ:</span>
          <span className="ml-2"></span>
        </div>
        <div className="info-row mb-1">
          <span className="font-medium">MST:</span>
          <span className="ml-2"></span>
        </div>
      </div>

      <div className="representative-info md:w-1/2">
        <h4 className="font-bold text-blue-700 mb-2">
          THÔNG TIN NGƯỜI ĐẠI DIỆN
        </h4>
        <div className="info-row mb-1">
          <span className="font-medium">Họ và Tên:</span>
          <span className="ml-2"></span>
        </div>
        <div className="info-row mb-1">
          <span className="font-medium">Chức vụ:</span>
          <span className="ml-2"></span>
        </div>
        <div className="info-row mb-1">
          <span className="font-medium">Số điện thoại:</span>
          <span className="ml-2"></span>
        </div>
        <div className="info-row mb-1">
          <span className="font-medium">Email:</span>
          <span className="ml-2"></span>
        </div>
      </div>
    </div>
  );
}
