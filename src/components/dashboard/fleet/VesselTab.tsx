import React from "react";

export default function VesselTab() {
  return (
    <div>
      <div className="vessel-tab-indicator text-center mb-6">
        <p className="text-blue-700 font-bold mt-2">TÀU 1</p>
      </div>

      <div className="captain-account-section bg-white p-1 md:p-6 rounded-lg shadow-sm">
        <h4 className="text-center font-bold text-blue-800 text-xl mb-6">
          CẤP TÀI KHOẢN CHO THUYỀN TRƯỞNG
        </h4>

        <div className="captain-account-form md:max-w-[600px] mx-auto">
          <div className="form-group mb-4 flex-col !justify-start !items-start gap-2 w-full">
            <label className="block mb-1 font-medium">Vessel ID</label>
            <div
              id="vessel-id"
              className="bg-gray-200 p-3 rounded-md w-full text-start text-[14px]"
            >
              VESSEL ID 1
            </div>
          </div>

          <div className="form-group mb-4 flex-col !justify-start !items-start gap-2">
            <label className="block mb-1 font-medium">Quyền hạn</label>
            <div className="select-container relative w-full">
              <div
                className="bg-white border p-3 rounded-md flex justify-between items-center cursor-pointer"
                onclick="toggleDropdown(this)"
              >
                <span id="permission-type" className="selected-option">
                  Chọn từ danh sách thả xuống
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="feather feather-chevron-down"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div className="dropdown-options absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 hidden">
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer option"
                  onclick="selectOption(this, 'Thuyền trưởng', 'captain')"
                >
                  Thuyền trưởng
                </div>
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer option"
                  onclick="selectOption(this, 'Máy trưởng', 'engineer')"
                >
                  Máy trưởng
                </div>
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer option"
                  onclick="selectOption(this, 'Thủy thủ', 'navigator')"
                >
                  Thủy thủ
                </div>
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer option"
                  onclick="selectOption(this, 'Quản lý', 'manager')"
                >
                  Quản lý
                </div>
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer option"
                  onclick="selectOption(this, 'Nhân viên', 'staff')"
                >
                  Nhân viên
                </div>
              </div>
              <input
                type="hidden"
                name="permission"
                id="permission-input"
                value=""
              />
            </div>
          </div>

          <div className="form-group mb-4 flex-col !justify-start !items-start gap-2">
            <label className="block mb-1 font-medium">Tên đăng nhập</label>
            <input
              type="text"
              className="w-full border p-3 rounded-md text-[14px]"
              name="name"
              value="Vessel ID"
            />
          </div>

          <div className="form-group mb-4 flex-col !justify-start !items-start gap-2">
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="text"
              className="w-full border p-3 rounded-md text-[14px]"
              name="email"
              value=""
            />
          </div>

          <div className="form-group mb-6 flex-col !justify-start !items-start gap-2">
            <label className="block mb-1 font-medium">Mật khẩu</label>
            <input
              type="password"
              className="w-full border p-3 rounded-md"
              name="password"
              value="000000"
            />
          </div>

          <div className="form-submit text-center">
            <button
              id="grant-permission-btn"
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-8 rounded-md"
            >
              CẤP QUYỀN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
