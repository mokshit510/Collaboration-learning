import React, { useState } from 'react';
import { Calendar, Info } from 'lucide-react';
import type { AuthorityNavId } from '../types/authority';
import {
  authorityStats,
  verificationTrendData,
  riskDistributionData,
  documentTypeDistribution,
  recentHighRiskCases,
  locationVerifications,
  activeInvestigators,
  systemActivityFeed,
} from '../data/authorityData';
import { AuthoritySidebar } from '../components/authority/AuthoritySidebar';
import { AuthorityHeader } from '../components/authority/AuthorityHeader';
import { OverviewStats } from '../components/authority/OverviewStats';
import { VerificationTrends } from '../components/authority/VerificationTrends';
import { RiskDistribution } from '../components/authority/RiskDistribution';
import { DocumentTypes } from '../components/authority/DocumentTypes';
import { HighRiskCases } from '../components/authority/HighRiskCases';
import { LocationStatistics } from '../components/authority/LocationStatistics';
import { ActiveInvestigators } from '../components/authority/ActiveInvestigators';
import { SystemActivity } from '../components/authority/SystemActivity';
import { QuickActions } from '../components/authority/QuickActions';

import { RecordsStorage } from '../services/recordsStorage';

interface AuthorityDashboardProps {
  onSwitchToInvestigator?: () => void;
  onShowToast?: (title: string, desc?: string) => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({
  onSwitchToInvestigator,
  onShowToast,
}) => {
  const [activeNav, setActiveNav] = useState<AuthorityNavId>('overview');

  const savedRecords = RecordsStorage.getRecords();
  const dynamicHighRiskCases = [
    ...savedRecords
      .filter((r) => r.riskLevel === 'HIGH' || r.status === 'FLAGGED')
      .map((r) => ({
        id: `#${r.verificationId.replace('PRM-2026-', 'PR-')}`,
        name: r.holderName,
        documentType: (r.documentType.charAt(0).toUpperCase() + r.documentType.slice(1)) as 'Passport' | 'Visa' | 'Other',
        riskScore: r.riskScore,
        reason: r.keyFindings[0] || 'Forensic Inconsistencies',
        status: r.status === 'FLAGGED' ? ('Flagged' as const) : ('Under Review' as const),
        timestamp: 'Recent',
        checkpoint: r.location,
        investigator: r.investigator,
      })),
    ...recentHighRiskCases,
  ].slice(0, 5);

  const dynamicStats = {
    ...authorityStats,
    totalVerifications: {
      ...authorityStats.totalVerifications,
      value: authorityStats.totalVerifications.value + Math.max(0, savedRecords.length - 5),
      formatted: (authorityStats.totalVerifications.value + Math.max(0, savedRecords.length - 5)).toLocaleString(),
    },
  };

  const handleTriggerToast = (msg: string) => {
    onShowToast?.('Authority Action Completed', msg);
  };

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-[#14213D] font-sans antialiased">
      {/* 1. Dark Navy Sidebar (Left) */}
      <AuthoritySidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onSwitchToInvestigator={onSwitchToInvestigator}
      />

      {/* 2. Main Authority Layout (Right) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <AuthorityHeader onSwitchToInvestigator={onSwitchToInvestigator} />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Welcome Banner Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight font-sans">
                Welcome, R. Mehta
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Monitor operations, manage investigators, and ensure secure borders.
              </p>
            </div>

            {/* Date / Time Card */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-slate-700 text-xs font-semibold shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div className="leading-tight">
                <span className="text-slate-800">Fri, 05 Sep 2026</span>
                <span className="text-slate-400 font-normal ml-2">10:24 AM</span>
              </div>
            </div>
          </div>

          {/* If another nav item is clicked, show subview feedback with easy return */}
          {activeNav !== 'overview' && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2 font-medium">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Viewing section: <strong className="capitalize">{activeNav.replace(/_/g, ' ')}</strong> (Active authority view mode)
                </span>
              </div>
              <button
                onClick={() => setActiveNav('overview')}
                className="px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-300 transition-colors"
              >
                ← Return to Overview
              </button>
            </div>
          )}

          {/* ROW 1: Statistics Row (4 Cards) */}
          <OverviewStats stats={dynamicStats} />

          {/* ROW 2: Verification Trends (Chart) + Risk Distribution (Donut) + Document Types (Donut) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Chart: Verification Trends (5 cols) */}
            <div className="lg:col-span-5">
              <VerificationTrends data={verificationTrendData} />
            </div>

            {/* Donut: Risk Distribution (3.5 / 4 cols) */}
            <div className="lg:col-span-4">
              <RiskDistribution data={riskDistributionData} />
            </div>

            {/* Donut: Document Types (3.5 / 3 cols) */}
            <div className="lg:col-span-3">
              <DocumentTypes data={documentTypeDistribution} />
            </div>
          </div>

          {/* ROW 3: Recent High-Risk Cases (Table) + Verifications by Location (India Map) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* High Risk Cases Table (7 cols) */}
            <div className="lg:col-span-7">
              <HighRiskCases
                cases={dynamicHighRiskCases}
                onViewAll={() => setActiveNav('high_risk_cases')}
              />
            </div>

            {/* Verifications by Location (5 cols) */}
            <div className="lg:col-span-5">
              <LocationStatistics locations={locationVerifications} />
            </div>
          </div>

          {/* ROW 4: Active Investigators + System Activity + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Active Investigators (5 cols) */}
            <div className="lg:col-span-5">
              <ActiveInvestigators
                investigators={activeInvestigators}
                onViewAll={() => setActiveNav('investigators')}
              />
            </div>

            {/* System Activity (4 cols) */}
            <div className="lg:col-span-4">
              <SystemActivity
                activities={systemActivityFeed}
                onViewAll={() => setActiveNav('audit_logs')}
              />
            </div>

            {/* Quick Actions (3 cols) */}
            <div className="lg:col-span-3">
              <QuickActions onTriggerToast={handleTriggerToast} />
            </div>
          </div>

          {/* ROW 5: Bottom Informational Disclaimer Banner */}
          <div className="w-full bg-blue-50/90 border border-blue-200/80 rounded-xl p-3 flex items-center justify-center gap-2 text-blue-800 text-xs font-medium shadow-2xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              This is a demo system. Data is simulated for research and hackathon purposes only.
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};
