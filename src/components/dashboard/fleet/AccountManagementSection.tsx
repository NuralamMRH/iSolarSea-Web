import React from 'react'
import AccountInfo from './AccountInfo';
import VesselFleetInfo from './VesselFleetInfo';
import VesselAccess from './VesselAccess';
import VesselSelection from './VesselSelection';
import VesselTab from './VesselTab';

export default function AccountManagementSection() {
  return (
    <div className="account-management-section p-1 md:p-6 rounded-lg mb-6">
      <div className="account-header text-center mb-4">
        <h3 className="text-xl font-bold text-blue-800">THÔNG TIN TÀI KHOẢN</h3>
        <p className="text-[12px] text-gray-600">Company ID</p>
      </div>

      <AccountInfo />

      <VesselFleetInfo />

      <VesselAccess />

      <VesselSelection />

      <VesselTab />
    </div>
  );
}
