import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FacultyPage } from './pages/FacultyPage';
import { CoursesPage } from './pages/CoursesPage';
import { EligibilityPage } from './pages/EligibilityPage';
import { AllocationPage } from './pages/AllocationPage';
import { ResultsPage } from './pages/ResultsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="faculty" element={<FacultyPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="eligibility" element={<EligibilityPage />} />
            <Route path="allocation" element={<AllocationPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
