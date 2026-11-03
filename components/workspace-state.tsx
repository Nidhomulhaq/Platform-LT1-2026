"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loginIdToAuthEmail } from "@/lib/auth/login-id";
import type { Database, Json } from "@/lib/supabase/database.types";

export type Role =
  | "operator"
  | "panitia"
  | "juri"
  | "peserta"
  | "pendamping_regu";
export type ScoreStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "revision_needed";
export type TaskType = "cbt" | "upload" | "live";

export interface ScoringCriterion {
  id: string;
  name: string;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  criteria: ScoringCriterion[];
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
  pendampingId?: string | null;
}

export interface Participant {
  id: string;
  name: string;
  teamId: string;
  schoolId: string | null;
  isPinru: boolean;
}

export interface Judge {
  id: string;
  name: string;
}

export interface EventStaff {
  id: string;
  name: string;
}

export interface JudgeAssignment {
  id: string;
  juriId: string;
  competitionId: string;
}

export interface PanitiaAssignment {
  id: string;
  panitiaId: string;
  competitionId: string;
}

export interface ScoreRecord {
  id: string;
  competitionId: string;
  teamId: string;
  judgeId?: string | null;
  judgeName?: string;
  criterionScores?: Record<string, number>;
  score: number | null;
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
  judges: Judge[];
  eventStaff: EventStaff[];
  judgeAssignments: JudgeAssignment[];
  panitiaAssignments: PanitiaAssignment[];
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
  { id: "team-elang", name: "Elang", category: "Putra" },
  { id: "team-rajawali", name: "Rajawali", category: "Putra" },
  { id: "team-garuda", name: "Garuda", category: "Putra" },
  { id: "team-melati", name: "Melati", category: "Putri" },
  { id: "team-kenari", name: "Kenari", category: "Putri" },
];

const participantSchoolsByTeam: Record<string, string> = {
  "team-elang": "school-mts",
  "team-rajawali": "school-mi",
  "team-garuda": "school-mi",
  "team-melati": "school-mi",
  "team-kenari": "school-mts",
};

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
      schoolId: participantSchoolsByTeam[team.id],
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
    criteria: [],
    isActive: true,
  },
  {
    id: "sandi-morse",
    title: "Sandi dan Morse",
    description: "Pecahkan pesan sandi dan kirim jawaban lewat Morse.",
    taskType: "cbt",
    criteria: [],
    isActive: true,
  },
  {
    id: "p3k",
    title: "Pertolongan Pertama",
    description: "Tunjukkan langkah pertolongan pertama pada korban.",
    taskType: "upload",
    criteria: [],
    isActive: true,
  },
  {
    id: "sandi-pramuka",
    title: "Sandi Pramuka",
    description: "Unggah lembar jawaban sandi yang sudah dikerjakan.",
    taskType: "upload",
    criteria: [],
    isActive: true,
  },
  {
    id: "islamiyah",
    title: "Pengetahuan Islamiyah",
    description: "Jawab 20 pertanyaan pengetahuan umum dan keislaman.",
    taskType: "cbt",
    criteria: [],
    isActive: true,
  },
  {
    id: "yel-yel",
    title: "Yel-yel Regu",
    description: "Tampilkan yel-yel regu di depan dewan juri.",
    taskType: "live",
    criteria: [],
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
  judges: [],
  eventStaff: [],
  judgeAssignments: [],
  panitiaAssignments: [],
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

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role" | "school_id" | "is_active"
>;

const EMPTY_WORKSPACE_DATA: WorkspaceData = {
  schools: [],
  teams: [],
  participants: [],
  judges: [],
  eventStaff: [],
  judgeAssignments: [],
  panitiaAssignments: [],
  competitions: [],
  scores: [],
  submissions: {},
  attendance: {},
  leaderboardPublished: false,
  certificatesPublished: false,
  certificatesPublishedAt: null,
};

async function loadSupabaseWorkspace(
  userId: string | null,
): Promise<{ data: WorkspaceData; profile: ProfileRow | null }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { data: EMPTY_WORKSPACE_DATA, profile: null };

  const [
    profileResult,
    schoolsResult,
    teamsResult,
    membershipsResult,
    profilesResult,
    judgeAssignmentsResult,
    panitiaAssignmentsResult,
    competitionsResult,
    scoresResult,
    submissionsResult,
    attendanceResult,
    settingsResult,
  ] = await Promise.all([
    userId
      ? supabase
          .from("profiles")
        .select("id, full_name, role, school_id, is_active")
          .eq("id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("schools").select("*").order("name"),
    supabase.from("teams").select("*").order("name"),
    userId
      ? supabase.from("team_members").select("*")
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("profiles").select("id, full_name, role, school_id")
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("judge_assignments").select("*")
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("panitia_assignments").select("*")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("competitions").select("*").order("created_at"),
    supabase.rpc("get_workspace_scores"),
    userId
      ? supabase.from("submissions").select("*")
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("attendance").select("*")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("event_settings").select("*").eq("id", true).maybeSingle(),
  ]);
  const results = [
    profileResult,
    schoolsResult,
    teamsResult,
    membershipsResult,
    profilesResult,
    judgeAssignmentsResult,
    panitiaAssignmentsResult,
    competitionsResult,
    scoresResult,
    submissionsResult,
    attendanceResult,
    settingsResult,
  ];
  for (const result of results) {
    if (result.error) throw result.error;
  }

  const schoolRows = schoolsResult.data ?? [];
  const teamRows = teamsResult.data ?? [];
  const membershipRows = membershipsResult.data ?? [];
  const profileRows = profilesResult.data ?? [];
  const settings = settingsResult.data;
  const submissionRecords: WorkspaceData["submissions"] = {};
  for (const submission of submissionsResult.data ?? []) {
    submissionRecords[`${submission.team_id}:${submission.competition_id}`] = {
      submitted: true,
      url: submission.submission_url,
    };
  }

  return {
    profile: profileResult.data,
    data: {
      schools: schoolRows.map((school) => ({
        id: school.id,
        name: school.name,
        schoolType: school.school_type,
        headmasterName: school.headmaster_name,
        headmasterTitle: school.headmaster_title,
        pembinaName: school.pembina_name,
        pembinaTitle: school.pembina_title,
      })),
      teams: teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        category: team.category === "putra" ? "Putra" : "Putri",
        pendampingId: team.pendamping_id,
      })),
      participants: profileRows
        .filter((person) => person.role === "peserta")
        .map((person) => {
          const membership = membershipRows.find(
            (row) => row.user_id === person.id,
          );
          return {
            id: person.id,
            name: person.full_name,
            teamId: membership?.team_id ?? "",
            schoolId: person.school_id,
            isPinru: membership?.is_pinru ?? false,
          };
        }),
      judges: profileRows
        .filter((person) => person.role === "juri")
        .map((person) => ({ id: person.id, name: person.full_name })),
      eventStaff: profileRows
        .filter((person) => person.role === "panitia")
        .map((person) => ({ id: person.id, name: person.full_name })),
      judgeAssignments: (judgeAssignmentsResult.data ?? []).map((assignment) => ({
        id: assignment.id,
        juriId: assignment.juri_id,
        competitionId: assignment.competition_id,
      })),
      panitiaAssignments: (panitiaAssignmentsResult.data ?? []).map(
        (assignment) => ({
          id: assignment.id,
          panitiaId: assignment.panitia_id,
          competitionId: assignment.competition_id,
        }),
      ),
      competitions: (competitionsResult.data ?? []).map((competition) => ({
        id: competition.id,
        title: competition.title,
        description: competition.description,
        taskType: competition.task_type,
        criteria: parseScoringCriteria(competition.criteria),
        isActive: competition.is_active,
      })),
      scores: (scoresResult.data ?? []).map((score) => ({
        id: score.id,
        competitionId: score.competitionId,
        teamId: score.teamId,
        judgeId: score.judgeId,
        judgeName: score.judgeName,
        criterionScores: parseCriterionScores(score.criterionScores),
        score: typeof score.score === "number" ? score.score : null,
        status: score.status,
        feedback: score.feedback,
      })),
      submissions: submissionRecords,
      attendance: Object.fromEntries(
        (attendanceResult.data ?? []).map((record) => [
          `${record.team_id}:${record.competition_id}`,
          record.present,
        ]),
      ),
      leaderboardPublished: settings?.leaderboard_published ?? false,
      certificatesPublished: settings?.certificates_published ?? false,
      certificatesPublishedAt: settings?.certificates_published_at ?? null,
    },
  };
}

interface WorkspaceContextValue {
  data: WorkspaceData;
  isConnected: boolean;
  authReady: boolean;
  dataLoading: boolean;
  dataError: string | null;
  session: Session | null;
  profile: ProfileRow | null;
  currentUserId: string;
  refreshWorkspace: () => Promise<void>;
  signIn: (loginId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createSchool: (
    school: Omit<School, "id">,
  ) => Promise<void>;
  createTeam: (team: Omit<Team, "id">) => Promise<void>;
  createCompetition: (competition: Competition) => Promise<void>;
  updateCompetition: (
    competitionId: string,
    changes: Pick<
      Competition,
      "title" | "description" | "taskType" | "criteria"
    >,
  ) => Promise<void>;
  deleteCompetition: (competitionId: string) => Promise<void>;
  assignJudge: (juriId: string, competitionId: string) => Promise<void>;
  removeJudgeAssignment: (assignmentId: string) => Promise<void>;
  assignPanitia: (panitiaId: string, competitionId: string) => Promise<void>;
  removePanitiaAssignment: (assignmentId: string) => Promise<void>;
  updateScore: (
    teamId: string,
    competitionId: string,
    score: number,
    criterionScores: Record<string, number>,
    feedback: string,
    status: ScoreStatus,
  ) => Promise<void>;
  setScoreStatus: (
    scoreId: string,
    status: ScoreStatus,
    feedback?: string,
  ) => Promise<void>;
  updateSchool: (schoolId: string, changes: Partial<School>) => Promise<void>;
  assignParticipants: (participantIds: string[], teamId: string) => Promise<void>;
  setTeamPinru: (userId: string, teamId: string) => Promise<void>;
  setCompetitionActive: (competitionId: string, active: boolean) => Promise<void>;
  submitWork: (competitionId: string, url: string) => Promise<void>;
  setAttendance: (
    teamId: string,
    competitionId: string,
    present: boolean,
  ) => Promise<void>;
  setLeaderboardPublished: (published: boolean) => Promise<void>;
  setCertificatesPublished: (published: boolean) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

function parseScoringCriteria(value: Json): ScoringCriterion[] {
  if (!Array.isArray(value)) {
    throw new Error("Kriteria penilaian mata lomba tidak valid.");
  }
  return value.map((criterion) => {
    if (
      typeof criterion !== "object" ||
      criterion === null ||
      Array.isArray(criterion) ||
      typeof criterion.id !== "string" ||
      typeof criterion.name !== "string"
    ) {
      throw new Error("Format kriteria penilaian mata lomba tidak valid.");
    }
    return { id: criterion.id, name: criterion.name };
  });
}

function parseCriterionScores(value: Json): Record<string, number> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("Nilai kriteria dari Supabase tidak valid.");
  }
  const scores: Record<string, number> = {};
  for (const [criterionId, score] of Object.entries(value)) {
    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error("Nilai kriteria dari Supabase tidak valid.");
    }
    scores[criterionId] = score;
  }
  return scores;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const isConnected = isSupabaseConfigured();
  const supabase = getSupabaseBrowserClient();
  const [data, setData] = useState<WorkspaceData>(EMPTY_WORKSPACE_DATA);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authReady, setAuthReady] = useState(!isConnected);
  const [dataLoading, setDataLoading] = useState(isConnected);
  const [dataError, setDataError] = useState<string | null>(null);

  const refreshRemoteData = useCallback(async (userId: string | null) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const loaded = await loadSupabaseWorkspace(userId);
      setData(loaded.data);
      setProfile(loaded.profile);
    } catch (error) {
      console.error("Gagal memuat data LT-1 dari Supabase.", error);
      setDataError(getErrorMessage(error));
      setData(EMPTY_WORKSPACE_DATA);
      setProfile(null);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      setDataLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      void refreshRemoteData(nextSession?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [refreshRemoteData, supabase]);

  const requireClient = () => {
    if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
    return supabase;
  };

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      data,
      isConnected,
      authReady,
      dataLoading,
      dataError,
      session,
      profile,
      currentUserId: session?.user.id ?? CURRENT_USER_ID,
      refreshWorkspace: async () => {
        await refreshRemoteData(session?.user.id ?? null);
      },
      signIn: async (loginId, password) => {
        const { error } = await requireClient().auth.signInWithPassword({
          email: loginIdToAuthEmail(loginId),
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await requireClient().auth.signOut();
        if (error) throw error;
      },
      createSchool: async (school) => {
        let nextSchool: School = { id: crypto.randomUUID(), ...school };
        if (supabase) {
          const { data: saved, error } = await supabase
            .from("schools")
            .insert({
              name: school.name,
              school_type: school.schoolType,
              headmaster_name: school.headmasterName,
              headmaster_title: school.headmasterTitle,
              pembina_name: school.pembinaName,
              pembina_title: school.pembinaTitle,
            })
            .select("*")
            .single();
          if (error) throw error;
          nextSchool = {
            id: saved.id,
            name: saved.name,
            schoolType: saved.school_type,
            headmasterName: saved.headmaster_name,
            headmasterTitle: saved.headmaster_title,
            pembinaName: saved.pembina_name,
            pembinaTitle: saved.pembina_title,
          };
        }
        setData((current) => ({
          ...current,
          schools: [...current.schools, nextSchool],
        }));
      },
      createTeam: async (team) => {
        let nextTeam: Team = { id: crypto.randomUUID(), ...team };
        if (supabase) {
          const { data: saved, error } = await supabase
            .from("teams")
            .insert({
              name: team.name,
              category: team.category === "Putra" ? "putra" : "putri",
            })
            .select("*")
            .single();
          if (error) throw error;
          nextTeam = {
            id: saved.id,
            name: saved.name,
            category: saved.category === "putra" ? "Putra" : "Putri",
          };
        }
        setData((current) => ({
          ...current,
          teams: [...current.teams, nextTeam],
        }));
      },
      createCompetition: async (competition) => {
        if (supabase) {
          const { error } = await supabase.from("competitions").insert({
            id: competition.id,
            title: competition.title,
            description: competition.description,
            task_type: competition.taskType,
            criteria: competition.criteria.map((criterion) => ({
              id: criterion.id,
              name: criterion.name,
            })),
            is_active: competition.isActive,
          });
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          competitions: [...current.competitions, competition],
        }));
      },
      updateCompetition: async (competitionId, changes) => {
        if (supabase) {
          const { error } = await supabase
            .from("competitions")
            .update({
              title: changes.title,
              description: changes.description,
              task_type: changes.taskType,
              criteria: changes.criteria.map((criterion) => ({
                id: criterion.id,
                name: criterion.name,
              })),
            })
            .eq("id", competitionId)
            .select("id")
            .single();
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          competitions: current.competitions.map((competition) =>
            competition.id === competitionId
              ? { ...competition, ...changes }
              : competition,
          ),
        }));
      },
      deleteCompetition: async (competitionId) => {
        if (supabase) {
          const { error } = await supabase
            .from("competitions")
            .delete()
            .eq("id", competitionId)
            .select("id")
            .single();
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          competitions: current.competitions.filter(
            (competition) => competition.id !== competitionId,
          ),
          judgeAssignments: current.judgeAssignments.filter(
            (assignment) => assignment.competitionId !== competitionId,
          ),
          panitiaAssignments: current.panitiaAssignments.filter(
            (assignment) => assignment.competitionId !== competitionId,
          ),
          scores: current.scores.filter(
            (score) => score.competitionId !== competitionId,
          ),
          submissions: Object.fromEntries(
            Object.entries(current.submissions).filter(
              ([key]) => key !== competitionId,
            ),
          ),
          attendance: Object.fromEntries(
            Object.entries(current.attendance).filter(
              ([key]) => !key.endsWith(`:${competitionId}`),
            ),
          ),
        }));
      },
      assignJudge: async (juriId, competitionId) => {
        let assignment: JudgeAssignment = {
          id: crypto.randomUUID(),
          juriId,
          competitionId,
        };
        if (supabase) {
          const { data: saved, error } = await supabase
            .from("judge_assignments")
            .upsert(
              { juri_id: juriId, competition_id: competitionId },
              { onConflict: "juri_id,competition_id" },
            )
            .select("*")
            .single();
          if (error) throw error;
          assignment = {
            id: saved.id,
            juriId: saved.juri_id,
            competitionId: saved.competition_id,
          };
        }
        setData((current) => ({
          ...current,
          judgeAssignments: current.judgeAssignments.some(
            (item) =>
              item.juriId === juriId && item.competitionId === competitionId,
          )
            ? current.judgeAssignments
            : [...current.judgeAssignments, assignment],
        }));
      },
      removeJudgeAssignment: async (assignmentId) => {
        if (supabase) {
          const { error } = await supabase
            .from("judge_assignments")
            .delete()
            .eq("id", assignmentId)
            .select("id")
            .single();
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          judgeAssignments: current.judgeAssignments.filter(
            (assignment) => assignment.id !== assignmentId,
          ),
        }));
      },
      assignPanitia: async (panitiaId, competitionId) => {
        let assignment: PanitiaAssignment = {
          id: crypto.randomUUID(),
          panitiaId,
          competitionId,
        };
        if (supabase) {
          const { data: saved, error } = await supabase
            .from("panitia_assignments")
            .upsert(
              { panitia_id: panitiaId, competition_id: competitionId },
              { onConflict: "panitia_id,competition_id" },
            )
            .select("*")
            .single();
          if (error) throw error;
          assignment = {
            id: saved.id,
            panitiaId: saved.panitia_id,
            competitionId: saved.competition_id,
          };
        }
        setData((current) => ({
          ...current,
          panitiaAssignments: current.panitiaAssignments.some(
            (item) =>
              item.panitiaId === panitiaId &&
              item.competitionId === competitionId,
          )
            ? current.panitiaAssignments
            : [...current.panitiaAssignments, assignment],
        }));
      },
      removePanitiaAssignment: async (assignmentId) => {
        if (supabase) {
          const { error } = await supabase
            .from("panitia_assignments")
            .delete()
            .eq("id", assignmentId)
            .select("id")
            .single();
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          panitiaAssignments: current.panitiaAssignments.filter(
            (assignment) => assignment.id !== assignmentId,
          ),
        }));
      },
      updateScore: async (
        teamId,
        competitionId,
        score,
        criterionScores,
        feedback,
        status,
      ) => {
        const judgeId = session?.user.id ?? CURRENT_USER_ID;
        let scoreId = `score-${teamId}-${competitionId}-${judgeId}`;
        if (supabase && session) {
          const existing = data.scores.find(
            (record) =>
              record.teamId === teamId &&
              record.competitionId === competitionId &&
              record.judgeId === session.user.id,
          );
          const values = {
            score_value: score,
            criterion_scores: criterionScores,
            feedback_notes: feedback,
            status,
          };
          const query = existing
            ? supabase
                .from("scores")
                .update(values)
                .eq("id", existing.id)
            : supabase.from("scores").insert({
                team_id: teamId,
                competition_id: competitionId,
                ...values,
                juri_id: session.user.id,
              });
          const { data: saved, error } = await query.select("id").single();
          if (error) throw error;
          scoreId = saved.id;
        }
        setData((current) => {
          const existing = current.scores.find(
            (record) =>
              record.teamId === teamId &&
              record.competitionId === competitionId &&
              (record.judgeId === judgeId ||
                (!isConnected && !record.judgeId)),
          );
          const nextRecord = {
            id: existing?.id ?? scoreId,
            teamId,
            competitionId,
            judgeId: judgeId || null,
            judgeName:
              current.judges.find((judge) => judge.id === judgeId)?.name ??
              "",
            criterionScores,
            score,
            feedback,
            status,
          };
          return {
            ...current,
            scores: existing
              ? current.scores.map((record) =>
                  record.id === existing.id ? nextRecord : record,
                )
              : [...current.scores, nextRecord],
          };
        });
      },
      setScoreStatus: async (scoreId, status, feedback) => {
        if (supabase) {
          const { error } = await supabase
            .from("scores")
            .update({
              status,
              ...(feedback === undefined ? {} : { feedback_notes: feedback }),
            })
            .eq("id", scoreId)
            .select("id")
            .single();
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          scores: current.scores.map((record) =>
            record.id === scoreId
              ? { ...record, status, ...(feedback === undefined ? {} : { feedback }) }
              : record,
          ),
        }));
      },
      updateSchool: async (schoolId, changes) => {
        if (supabase) {
          const { error } = await supabase
            .from("schools")
            .update({
              ...(changes.headmasterName === undefined
                ? {}
                : { headmaster_name: changes.headmasterName }),
              ...(changes.headmasterTitle === undefined
                ? {}
                : { headmaster_title: changes.headmasterTitle }),
              ...(changes.pembinaName === undefined
                ? {}
                : { pembina_name: changes.pembinaName }),
              ...(changes.pembinaTitle === undefined
                ? {}
                : { pembina_title: changes.pembinaTitle }),
            })
            .eq("id", schoolId);
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          schools: current.schools.map((school) =>
            school.id === schoolId ? { ...school, ...changes } : school,
          ),
        }));
      },
      assignParticipants: async (participantIds, teamId) => {
        if (supabase) {
          const memberships = participantIds.map((userId) => ({
            user_id: userId,
            team_id: teamId,
            is_pinru:
              data.participants.find((person) => person.id === userId)?.isPinru ??
              false,
          }));
          const { error } = await supabase
            .from("team_members")
            .upsert(memberships, { onConflict: "user_id" });
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          participants: current.participants.map((participant) =>
            participantIds.includes(participant.id)
              ? { ...participant, teamId }
              : participant,
          ),
        }));
      },
      setTeamPinru: async (userId, teamId) => {
        if (supabase) {
          const { error } = await supabase.rpc("set_team_pinru", {
            target_user_id: userId,
            target_team_id: teamId,
          });
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          participants: current.participants.map((participant) =>
            participant.teamId === teamId
              ? { ...participant, isPinru: participant.id === userId }
              : participant,
          ),
        }));
      },
      setCompetitionActive: async (competitionId, active) => {
        if (supabase) {
          const { error } = await supabase.rpc("set_competition_active", {
            target_competition_id: competitionId,
            should_be_active: active,
          });
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          competitions: current.competitions.map((competition) =>
            competition.id === competitionId
              ? { ...competition, isActive: active }
              : competition,
          ),
        }));
      },
      submitWork: async (competitionId, url) => {
        let submissionKey = competitionId;
        if (supabase) {
          const participant = data.participants.find(
            (person) => person.id === session?.user.id,
          );
          if (!participant) {
            throw new Error("Akun ini belum dipetakan ke regu oleh operator.");
          }
          if (!participant.isPinru) {
            throw new Error("Hanya Pinru yang dapat mengirim tugas atas nama regu.");
          }
          submissionKey = `${participant.teamId}:${competitionId}`;
          const { error } = await supabase.from("submissions").upsert(
            {
              competition_id: competitionId,
              team_id: participant.teamId,
              submission_url: url,
              answers: { submission: url },
            },
            { onConflict: "competition_id,team_id" },
          );
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          submissions: {
            ...current.submissions,
              [submissionKey]: { submitted: true, url },
          },
        }));
      },
      setAttendance: async (teamId, competitionId, present) => {
        if (supabase && session) {
          const { error } = await supabase.from("attendance").upsert(
            {
              team_id: teamId,
              competition_id: competitionId,
              present,
              recorded_by: session.user.id,
            },
            { onConflict: "competition_id,team_id" },
          );
          if (error) throw error;
        }
        setData((current) => ({
          ...current,
          attendance: {
            ...current.attendance,
            [`${teamId}:${competitionId}`]: present,
          },
        }));
      },
      setLeaderboardPublished: async (published) => {
        if (supabase) {
          const { error } = await supabase
            .from("event_settings")
            .update({ leaderboard_published: published })
            .eq("id", true);
          if (error) throw error;
        }
        setData((current) => ({ ...current, leaderboardPublished: published }));
      },
      setCertificatesPublished: async (published) => {
        let publishedAt = published ? new Date().toISOString() : null;
        if (supabase) {
          const { data: savedAt, error } = await supabase.rpc(
            "set_certificates_published",
            { should_publish: published },
          );
          if (error) throw error;
          publishedAt = savedAt;
        }
        setData((current) => ({
          ...current,
          certificatesPublished: published,
          certificatesPublishedAt: publishedAt,
        }));
      },
    }),
    [
      authReady,
      data,
      dataError,
      dataLoading,
      isConnected,
      profile,
      refreshRemoteData,
      session,
      supabase,
    ],
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
