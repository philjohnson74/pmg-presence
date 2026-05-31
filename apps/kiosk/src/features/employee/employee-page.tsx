import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckInResponse } from '@pmg/contracts';
import { EmailCheckIn } from './email-checkin.js';
import { QrScanner } from './qr-scanner.js';
import { FindMeLookup } from './find-me-lookup.js';
import { SuccessScreen } from '../../components/success-screen.js';

type Tab = 'email' | 'scan' | 'findme';

const TABS: { id: Tab; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'scan', label: 'Scan QR' },
  { id: 'findme', label: 'Find Me' },
];

export function EmployeePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('email');
  const [result, setResult] = useState<CheckInResponse | null>(null);

  if (result) {
    return (
      <SuccessScreen
        direction={result.direction}
        displayName={result.displayName}
        personType={result.personType}
        onDone={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-pmg-navy text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-2xl leading-none">
          ←
        </button>
        <div>
          <h1 className="font-semibold text-xl">Employee Sign In / Out</h1>
          <p className="text-white/60 text-sm">Choose how to identify yourself</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
              tab === id
                ? 'border-pmg-orange text-pmg-navy'
                : 'border-transparent text-gray-500 hover:text-pmg-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        {tab === 'email' && <EmailCheckIn onSuccess={setResult} />}
        {tab === 'scan' && <QrScanner onSuccess={setResult} />}
        {tab === 'findme' && <FindMeLookup onSuccess={setResult} />}
      </div>
    </div>
  );
}
