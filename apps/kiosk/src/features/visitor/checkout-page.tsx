import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckInResponse } from '@pmg/contracts';
import { VisitorCheckoutPicker } from './visitor-checkout-picker.js';
import { SuccessScreen } from '../../components/success-screen.js';

export function CheckoutPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CheckInResponse | null>(null);

  if (result) {
    return (
      <SuccessScreen
        direction="out"
        displayName={result.displayName}
        personType={result.personType}
        onDone={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-pmg-navy text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-2xl leading-none">
          ←
        </button>
        <div>
          <h1 className="font-semibold text-xl">Sign Out</h1>
          <p className="text-white/60 text-sm">Select your name to sign out</p>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        <VisitorCheckoutPicker onSuccess={setResult} />
      </div>
    </div>
  );
}
