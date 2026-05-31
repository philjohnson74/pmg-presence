import React, { useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { KioskProvider, useKiosk } from './context/kiosk-context.js';
import { HomePage } from './features/home/home-page.js';
import { EmployeePage } from './features/employee/employee-page.js';
import { VisitorPage } from './features/visitor/visitor-page.js';
import { CheckoutPage } from './features/visitor/checkout-page.js';
import { PatientPage } from './features/patient/patient-page.js';
import { FirePage } from './features/fire/fire-page.js';

function FireLockRedirect() {
  const { isFireActive } = useKiosk();
  if (isFireActive) return <Navigate to="/fire-lock" replace />;
  return null;
}

function KioskRoutes() {
  const { isFireActive } = useKiosk();

  // If fire is active and user isn't already on fire-lock or fire page, redirect to fire-lock
  return (
    <>
      {isFireActive && <FireLockRedirect />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/employee" element={isFireActive ? <Navigate to="/fire-lock" replace /> : <EmployeePage />} />
        <Route path="/visitor" element={isFireActive ? <Navigate to="/fire-lock" replace /> : <VisitorPage />} />
        <Route path="/checkout" element={isFireActive ? <Navigate to="/fire-lock" replace /> : <CheckoutPage />} />
        <Route path="/patient" element={isFireActive ? <Navigate to="/fire-lock" replace /> : <PatientPage />} />
        <Route path="/fire" element={<FirePage />} />
        <Route path="/fire-lock" element={<FirePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RouterWrapper />
    </BrowserRouter>
  );
}

function RouterWrapper() {
  const navigate = useNavigate();
  const goHome = useCallback(() => navigate('/'), [navigate]);

  return (
    <KioskProvider onIdle={goHome}>
      <KioskRoutes />
    </KioskProvider>
  );
}
