import React from 'react';
import { Footer } from "@/components/footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-grow">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy – iSolarSea Platform</h1>
          <p className="text-gray-600 mb-8">Effective Date: 2026-01-01</p>

          <div className="prose prose-blue max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Privacy Policy – iSolarSea & iTruckSea Ecosystem</h2>
              <p className="text-gray-700 leading-relaxed">
                iSolarSea and iTruckSea ("we", "our", "us"), operated by iSolarSea, provide a specialized fishing compliance, traceability, and logistics ecosystem. This policy covers the SolarFishIUU suite (Member, Captain, Admin) and the iTruckSea suite (Boat Owner, Boat Captain).
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Scope and Target Audience</h3>
              <p className="text-gray-700 mb-3">
                These applications are B2B tools designed specifically for the fishing industry and are not intended for the general public. Authorized users include:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Registered fishing companies and vessel owners.</li>
                <li>Licensed boat captains and authorized crew members.</li>
                <li>Fish processing associations and logistics partners.</li>
                <li>Compliance authorities (IUU, fisheries, and port authorities).</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h3>
              <p className="text-gray-700 mb-3">To facilitate maritime logistics and regulatory compliance, we collect:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li><strong>Account Data:</strong> Name, contact details, professional licenses, and role-based credentials.</li>
                <li><strong>Vessel & Trip Data:</strong> GPS coordinates, IMO numbers, trip durations, and routes.</li>
                <li><strong>Catch & Logistics Data:</strong> Species identification, quantity, AI-scan records, and QR-linked traceability data.</li>
                <li><strong>Compliance Data:</strong> IUU reporting logs and inspection records.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Account Deletion & Data Retention</h3>
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">3.1 Account Deletion</h4>
                <p className="text-gray-700 mb-2">
                  In compliance with global privacy standards and App Store guidelines, every user has the right to delete their account.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Users can initiate account deletion directly within the App Settings menu or by email <a href="mailto:customar@isolarsea.com" className="text-blue-600 hover:underline">customar@isolarsea.com</a></li>
                  <li>Upon account deletion, all personal identifiable information (PII) is removed from our active databases.</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">3.2 Regulatory Retention Note</h4>
                <p className="text-gray-700">
                  As this platform serves a highly regulated industry (Fisheries & IUU Compliance), certain operational data (such as catch logs and trip history) must be retained for a period defined by local maritime laws and international fishing regulations. This data will be anonymized or archived for audit purposes only and will no longer be linked to your personal identity.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Data Sharing</h3>
              <p className="text-gray-700 mb-3">We share data only with authorized parties:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Government fisheries and port authorities for legal compliance.</li>
                <li>Authorized logistics partners involved in the specific supply chain.</li>
              </ul>
              <p className="text-gray-700 mt-2">We do not sell user or operational data to third parties.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Contact & Support</h3>
              <p className="text-gray-700 mb-2">For privacy inquiries or manual data requests:</p>
              <ul className="list-none space-y-1 text-gray-700">
                <li>Email: <a href="mailto:privacy@isolarsea.com" className="text-blue-600 hover:underline">privacy@isolarsea.com</a></li>
                <li>Web: <a href="https://isolarsea.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://isolarsea.com</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
