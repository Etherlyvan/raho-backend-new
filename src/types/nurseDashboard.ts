// src/types/nurseDashboard.ts
import type { SessionStatus, PelaksanaanType } from "../generated/prisma";
//                                               ^^^^^^^^^^^^^^^^^^^^^^^^
//                           import dari Prisma, bukan ./session

export interface NurseSessionSummary {
  treatmentSessionId : string;
  infusKe            : number | null;
  status             : SessionStatus;
  treatmentDate      : string;
  pelaksanaan        : PelaksanaanType | null;
  hasVitalSigns      : boolean;
  hasInfusion        : boolean;
  encounter: {
    encounterId : string;
    member      : { memberNo: string; fullName: string };
    branch      : { name: string };
  };
}

export interface NurseDashboardStats {
  sessionsToday     : number;
  sessionInProgress : number;
  sessionsThisWeek  : number;
  sessionsThisMonth : number;
}

export interface NurseDashboardData {
  stats          : NurseDashboardStats;
  recentSessions : NurseSessionSummary[];
}