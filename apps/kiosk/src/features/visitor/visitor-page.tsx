import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckInResponse, VisitorPassResponse } from '@pmg/contracts';
import { VisitorForm } from './visitor-form.js';
import { ReturningVisitor } from './returning-visitor.js';
import { SuccessScreen } from '../../components/success-screen.js';
import { VisitorPassCard } from './visitor-pass-card.js';

type Tab = 'new' | 'returning';

export function VisitorPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('new');
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [pass, setPass] = useState<VisitorPassResponse | null>(null);

  function handleSuccess(r: CheckInResponse, p?: VisitorPassResponse) {
    setResult(r);
    setPass(p ?? null);
  }

  // Multi-day visitor with pass — show pass card first
  if (result && pass) {
    return (
      <VisitorPassCard
        pass={pass}
        visitorName={result.displayName}
        onDone={() => navigate('/')}
      />
    );
  }

  if (result) {
    return (
      <SuccessScreen
        direction={result.direction}
        displayName={result.displayName}
        personType="visitor"
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
          <h1 className="font-semibold text-xl">Visitor Sign In</h1>
          <p className="text-white/60 text-sm">Welcome to Peacocks Medical Group</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        <button
          onClick={() => setTab('new')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
            tab === 'new'
              ? 'border-pmg-orange text-pmg-navy'
              : 'border-transparent text-gray-500 hover:text-pmg-navy'
          }`}
        >
          New visitor
        </button>
        <button
          onClick={() => setTab('returning')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
            tab === 'returning'
              ? 'border-pmg-orange text-pmg-navy'
              : 'border-transparent text-gray-500 hover:text-pmg-navy'
          }`}
        >
          Returning (have a pass)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-lg mx-auto w-full overflow-y-auto">
        {tab === 'new' && <VisitorForm onSuccess={handleSuccess} />}
        {tab === 'returning' && <ReturningVisitor onSuccess={(r) => setResult(r)} />}
      </div>
    </div>
  );
}
