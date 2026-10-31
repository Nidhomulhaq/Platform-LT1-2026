"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "operator" | "panitia" | "juri" | "peserta";
export type ScoreStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "revision_needed";
export type TaskType = "cbt" | "upload" | "live";

export interface Competition {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  isActive: boolean;
}

export interface School {
  id: string;
  name: string;
  schoolType: "MI" | "MTs";
  headmasterName: string;
  headmasterTitle: string;
  pembinaName: string;
  pembinaTitle: string;
}

export interface Team {
  id: string;
  name: string;
  category: "Putra" | "Putri";
  schoolId: string;
}

export interface Participant {
  id: string;
  name: string;
  teamId: string;
  isPinru: boolean;
}

export interface ScoreRecord {
  id: string;
  competitionId: string;
  teamId: string;
  score: number;
  status: ScoreStatus;
  feedback: string;
}

export interface SubmissionRecord {
  submitted: boolean;
  url: string;
}

export interface WorkspaceData {
  schools: School[];
  teams: Team[];
  participants: Participant[];
  competitions: Competition[];
  scores: ScoreRecord[];
  submissions: Record<string, SubmissionRecord>;
  attendance: Record<string, boolean>;
  leaderboardPublished: boolean;
  certificatesPublished: boolean;
  certificatesPublishedAt: string | null;
}

const schoolRecords: School[] = [
  {
    id: "school-mi",
    name: "MI Ma’arif NU Islamiyah",
    schoolType: "MI",
    headmasterName: "H. Ahmad Fauzi, S.Pd.I.",
    headmasterTitle: "Kepala Madrasah / Ka Mabigus",
    pembinaName: "Siti Nur Aini, S.Pd.",
    pembinaTitle: "Pembina Pramuka",
  },
  {
    id: "school-mts",
    name: "MTs Ma’arif 28 Islamiyah",
    schoolType: "MTs",
    headmasterName: "Drs. Abdul Karim",
    headmasterTitle: "Kepala Madrasah / Ka Mabigus",
    pembinaName: "Rina Kurniasih, S.Pd.",
    pembinaTitle: "Pembina Pramuka",
  },
];

const teamRecords: Team[] = [
  { id: "team-elang", name: "Elang", category: "Putra", schoolId: "school-mts" },
  {
    id: "team-rajawali",
    name: "Rajawali",
    category: "Putra",
    schoolId: "school-mi",
  },
  { id: "team-garuda", name: "Garuda", category: "Putra", schoolId: "school-mi" },
  { id: "team-melati", name: "Melati", category: "Putri", schoolId: "school-mi" },
  { id: "team-kenari", name: "Kenari", category: "Putri", schoolId: "school-mts" },
];

const memberNames = [
  "Ahmad Fauzan",
  "Rizky Hidayat",
  "Fajar Ramadhan",
  "Dimas Saputra",
  "Ilham Maulana",
  "Rafi Firmansyah",
  "Arif Setiawan",
  "Naufal Akbar",
  "Daffa Pratama",
  "Raihan Kurnia",
  "Fikri Ramadhan",
  "Iqbal Nugraha",
  "Aditya Permana",
  "Rizal Maulana",
  "Farhan Hakim",
  "Bagas Santoso",
  "Reza Alfarizi",
  "Fauzan Akmal",
  "Hafiz Maulana",
  "Rendi Kurniawan",
  "Nabila Putri",
  "Aisyah Rahma",
  "Nadia Safitri",
  "Salsabila Zahra",
  "Putri Aulia",
  "Dinda Maharani",
  "Syifa Nurfadila",
  "Intan Permata",
  "Laila Khairunnisa",
  "Alya Ramadhani",
  "Nisa Amalia",
  "Zahra Fathia",
  "Annisa Rahmawati",
];

const teamSizes = [7, 7, 6, 6, 7];
const participantRecords: Participant[] = [];
let memberIndex = 0;

teamRecords.forEach((team, teamIndex) => {
  for (let index = 0; index < teamSizes[teamIndex]; index += 1) {
    participantRecords.push({
      id: `participant-${memberIndex + 1}`,
      name: memberNames[memberIndex],
      teamId: team.id,
      isPinru: index === 0,
    });
    memberIndex += 1;
  }
});

export const COMPETITIONS: Competition[] = [
  {
    id: "pionering",
    title: "Pionering",
    description: "Bangun tandu dan menara dari tongkat serta tali.",
    taskType: "live",
    isActive: true,
  },
  {
    id: "sandi-morse",
    title: "Sandi dan Morse",
    description: "Pecahkan pesan sandi dan kirim jawaban lewat Morse.",
    taskType: "cbt",
    isActive: true,
  },
  {
    id: "p3k",
    title: "Pertolongan Pertama",
    description: "Tunjukkan langkah pertolongan pertama pada korban.",
    taskType: "upload",
    isActive: true,
  },
  {
    id: "sandi-pramuka",
    title: "Sandi Pramuka",
    description: "Unggah lembar jawaban sandi yang sudah dikerjakan.",
    taskType: "upload",
    isActive: true,
  },
  {
    id: "islamiyah",
    title: "Pengetahuan Islamiyah",
    description: "Jawab 20 pertanyaan pengetahuan umum dan keislaman.",
    taskType: "cbt",
    isActive: true,
  },
  {
    id: "yel-yel",
    title: "Yel-yel Regu",
    description: "Tampilkan yel-yel regu di depan dewan juri.",
    taskType: "live",
    isActive: true,
  },
];

export const CURRENT_PARTICIPANT_ID = "participant-1";
export const CURRENT_TEAM_ID = "team-elang";
export const CURRENT_USER_ID = "lt1-2026-001";

const scoreRecords: ScoreRecord[] = [
  {
    id: "score-elang-pionering",
    competitionId: "pionering",
    teamId: "team-elang",
    score: 88,
    status: "approved",
    feedback: "Simpul kuat dan konstruksi berdiri stabil.",
  },
  {
    id: "score-elang-morse",
    competitionId: "sandi-morse",
    teamId: "team-elang",
    score: 92,
    status: "pending_review",
    feedback: "Jawaban tepat. Waktu pengerjaan sangat baik.",
  },
  {
    id: "score-elang-p3k",
    competitionId: "p3k",
    teamId: "team-elang",
    score: 76,
    status: "approved",
    feedback: "Perhatikan urutan pemeriksaan kondisi korban.",
  },
  {
    id: "score-elang-sandi",
    competitionId: "sandi-pramuka",
    teamId: "team-elang",
    score: 84,
    status: "pending_review",
    feedback: "Beberapa jawaban masih perlu dicocokkan.",
  },
  {
    id: "score-elang-yelyel",
    competitionId: "yel-yel",
    teamId: "team-elang",
    score: 90,
    status: "approved",
    feedback: "Kompak dan kreatif.",
  },
  {
    id: "score-rajawali-pionering",
    competitionId: "pionering",
    teamId: "team-rajawali",
    score: 81,
    status: "pending_review",
    feedback: "Simpul pangkal perlu ditinjau kembali.",
  },
  {
    id: "score-rajawali-morse",
    competitionId: "sandi-morse",
    teamId: "team-rajawali",
    score: 89,
    status: "approved",
    feedback: "Tepat dan selesai sesuai waktu.",
  },
  {
    id: "score-rajawali-p3k",
    competitionId: "p3k",
    teamId: "team-rajawali",
    score: 82,
    status: "approved",
    feedback: "Penanganan luka dilakukan dengan benar.",
  },
  {
    id: "score-rajawali-sandi",
    competitionId: "sandi-pramuka",
    teamId: "team-rajawali",
    score: 85,
    status: "approved",
    feedback: "Sebagian besar jawaban sudah tepat.",
  },
  {
    id: "score-rajawali-yelyel",
    competitionId: "yel-yel",
    teamId: "team-rajawali",
    score: 87,
    status: "approved",
    feedback: "Penampilan percaya diri.",
  },
  {
    id: "score-garuda-pionering",
    competitionId: "pionering",
    teamId: "team-garuda",
    score: 87,
    status: "approved",
    feedback: "Konstruksi kokoh dan rapi.",
  },
  {
    id: "score-garuda-morse",
    competitionId: "sandi-morse",
    teamId: "team-garuda",
    score: 88,
    status: "approved",
    feedback: "Pesan terbaca dengan benar.",
  },
  {
    id: "score-garuda-p3k",
    competitionId: "p3k",
    teamId: "team-garuda",
    score: 83,
    status: "approved",
    feedback: "Kerja sama regu berjalan baik.",
  },
  {
    id: "score-garuda-sandi",
    competitionId: "sandi-pramuka",
    teamId: "team-garuda",
    score: 78,
    status: "pending_review",
    feedback: "Mohon cek satu lembar jawaban yang belum terbaca.",
  },
  {
    id: "score-garuda-yelyel",
    competitionId: "yel-yel",
    teamId: "team-garuda",
    score: 86,
    status: "approved",
    feedback: "Koreografi kompak.",
  },
  {
    id: "score-melati-pionering",
    competitionId: "pionering",
    teamId: "team-melati",
    score: 91,
    status: "approved",
    feedback: "Simpul dan struktur sangat rapi.",
  },
  {
    id: "score-melati-morse",
    competitionId: "sandi-morse",
    teamId: "team-melati",
    score: 95,
    status: "approved",
    feedback: "Akurasi dan waktu sangat baik.",
  },
  {
    id: "score-melati-p3k",
    competitionId: "p3k",
    teamId: "team-melati",
    score: 92,
    status: "approved",
    feedback: "Langkah pertolongan dilakukan berurutan.",
  },
  {
    id: "score-melati-sandi",
    competitionId: "sandi-pramuka",
    teamId: "team-melati",
    score: 84,
    status: "approved",
    feedback: "Jawaban sandi tepat.",
  },
  {
    id: "score-melati-yelyel",
    competitionId: "yel-yel",
    teamId: "team-melati",
    score: 88,
    status: "approved",
    feedback: "Ekspresi dan kekompakan baik.",
  },
  {
    id: "score-kenari-pionering",
    competitionId: "pionering",
    teamId: "team-kenari",
    score: 83,
    status: "approved",
    feedback: "Konstruksi berdiri dengan baik.",
  },
  {
    id: "score-kenari-morse",
    competitionId: "sandi-morse",
    teamId: "team-kenari",
    score: 86,
    status: "approved",
    feedback: "Mayoritas jawaban benar.",
  },
  {
    id: "score-kenari-p3k",
    competitionId: "p3k",
    teamId: "team-kenari",
    score: 68,
    status: "revision_needed",
    feedback: "Lengkapi penjelasan tentang pembidaian.",
  },
  {
    id: "score-kenari-sandi",
    competitionId: "sandi-pramuka",
    teamId: "team-kenari",
    score: 84,
    status: "approved",
    feedback: "Jawaban sesuai kunci.",
  },
  {
    id: "score-kenari-islamiyah",
    competitionId: "islamiyah",
    teamId: "team-kenari",
    score: 90,
    status: "approved",
    feedback: "Pengetahuan umum dikuasai dengan baik.",
  },
  {
    id: "score-kenari-yelyel",
    competitionId: "yel-yel",
    teamId: "team-kenari",
    score: 91,
    status: "approved",
    feedback: "Penampilan kreatif dan teratur.",
  },
];

export const INITIAL_WORKSPACE_DATA: WorkspaceData = {
  schools: schoolRecords,
  teams: teamRecords,
  participants: participantRecords,
  competitions: COMPETITIONS,
  scores: scoreRecords,
  submissions: {
    "pionering": { submitted: true, url: "" },
    "sandi-morse": { submitted: true, url: "" },
    "p3k": { submitted: true, url: "" },
    "sandi-pramuka": {
      submitted: true,
      url: "https://drive.google.com/",
    },
    "islamiyah": { submitted: false, url: "" },
    "yel-yel": { submitted: true, url: "" },
  },
  attendance: {},
  leaderboardPublished: true,
  certificatesPublished: false,
  certificatesPublishedAt: null,
};

interface WorkspaceContextValue {
  data: WorkspaceData;
  updateScore: (
    teamId: string,
    competitionId: string,
    score: number,
    feedback: string,
    status: ScoreStatus,
  ) => void;
  setScoreStatus: (
    scoreId: string,
    status: ScoreStatus,
    feedback?: string,
  ) => void;
  updateSchool: (schoolId: string, changes: Partial<School>) => void;
  assignParticipants: (participantIds: string[], teamId: string) => void;
  setCompetitionActive: (competitionId: string, active: boolean) => void;
  submitWork: (competitionId: string, url: string) => void;
  setAttendance: (teamId: string, competitionId: string, present: boolean) => void;
  setLeaderboardPublished: (published: boolean) => void;
  setCertificatesPublished: (published: boolean) => void;
}

const STORAGE_KEY = "lt1-islamiyah-demo-v2";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(INITIAL_WORKSPACE_DATA);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceData;
        if (
          Array.isArray(parsed.schools) &&
          Array.isArray(parsed.teams) &&
          Array.isArray(parsed.scores) &&
          Array.isArray(parsed.competitions)
        ) {
          setData(parsed);
        }
      }
    } catch (error) {
      console.error("Tidak dapat memuat data demo LT-1 dari penyimpanan lokal.", error);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Tidak dapat menyimpan data demo LT-1 ke penyimpanan lokal.", error);
    }
  }, [data, hydrated]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      data,
      updateScore: (teamId, competitionId, score, feedback, status) => {
        setData((current) => {
          const found = current.scores.find(
            (record) =>
              record.teamId === teamId && record.competitionId === competitionId,
          );
          if (found) {
            return {
              ...current,
              scores: current.scores.map((record) =>
                record.id === found.id
                  ? { ...record, score, feedback, status }
                  : record,
              ),
            };
          }
          return {
            ...current,
            scores: [
              ...current.scores,
              {
                id: `score-${teamId}-${competitionId}`,
                teamId,
                competitionId,
                score,
                feedback,
                status,
              },
            ],
          };
        });
      },
      setScoreStatus: (scoreId, status, feedback) => {
        setData((current) => ({
          ...current,
          scores: current.scores.map((record) =>
            record.id === scoreId
              ? {
                  ...record,
                  status,
                  ...(feedback === undefined ? {} : { feedback }),
                }
              : record,
          ),
        }));
      },
      updateSchool: (schoolId, changes) => {
        setData((current) => ({
          ...current,
          schools: current.schools.map((school) =>
            school.id === schoolId ? { ...school, ...changes } : school,
          ),
        }));
      },
      assignParticipants: (participantIds, teamId) => {
        setData((current) => ({
          ...current,
          participants: current.participants.map((participant) =>
            participantIds.includes(participant.id)
              ? { ...participant, teamId }
              : participant,
          ),
        }));
      },
      setCompetitionActive: (competitionId, active) => {
        setData((current) => ({
          ...current,
          competitions: current.competitions.map((competition) =>
            competition.id === competitionId
              ? { ...competition, isActive: active }
              : competition,
          ),
        }));
      },
      submitWork: (competitionId, url) => {
        setData((current) => ({
          ...current,
          submissions: {
            ...current.submissions,
            [competitionId]: { submitted: true, url },
          },
        }));
      },
      setAttendance: (teamId, competitionId, present) => {
        setData((current) => ({
          ...current,
          attendance: {
            ...current.attendance,
            [`${teamId}:${competitionId}`]: present,
          },
        }));
      },
      setLeaderboardPublished: (published) => {
        setData((current) => ({ ...current, leaderboardPublished: published }));
      },
      setCertificatesPublished: (published) => {
        setData((current) => ({
          ...current,
          certificatesPublished: published,
          certificatesPublishedAt: published ? new Date().toISOString() : null,
        }));
      },
    }),
    [data],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace harus digunakan di dalam WorkspaceProvider.");
  }
  return context;
}
