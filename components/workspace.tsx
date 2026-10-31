"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Compass,
  Download,
  FileCheck2,
  FileText,
  Flag,
  GraduationCap,
  Home,
  Landmark,
  LockKeyhole,
  LogIn,
  Menu,
  Medal,
  MessageSquareText,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Signpost,
  Star,
  Trophy,
  Users,
  UserRound,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  CURRENT_PARTICIPANT_ID,
  CURRENT_TEAM_ID,
  CURRENT_USER_ID,
  type Competition,
  type Participant,
  type Role,
  type ScoreRecord,
  type ScoreStatus,
  type School,
  type Team,
  useWorkspace,
} from "@/components/workspace-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

type View =
  | "participant"
  | "leaderboard"
  | "scan"
  | "teamScores"
  | "profile"
  | "submit"
  | "operator"
  | "scores"
  | "schools"
  | "teams"
  | "competitions"
  | "publication"
  | "juri"
  | "panitia"
  | "verify"
  | "login"
  | "register";

type Notify = (message: string, isError?: boolean) => void;

const viewTitles: Record<View, string> = {
  participant: "Dashboard peserta",
  leaderboard: "Leaderboard",
  scan: "Scan tugas",
  teamScores: "Rekap nilai regu",
  profile: "Profil peserta",
  submit: "Pengumpulan tugas",
  operator: "Ringkasan operator",
  scores: "Peninjauan nilai",
  schools: "Data pangkalan",
  teams: "Manajemen regu",
  competitions: "Mata lomba",
  publication: "Papan skor & sertifikat",
  juri: "Input nilai juri",
  panitia: "Kegiatan & kehadiran",
  verify: "Verifikasi sertifikat",
  login: "Masuk",
  register: "Daftar peserta",
};

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand${light ? " brand-light" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <Compass />
      </span>
      <span>
        <span className="brand-name">Ruang LT-1</span>
        <span className="brand-caption">Pramuka Islamiyah</span>
      </span>
    </div>
  );
}

function IconForView({ view }: { view: View }) {
  const props = { "aria-hidden": true as const };
  switch (view) {
    case "participant":
      return <Home {...props} />;
    case "leaderboard":
      return <Trophy {...props} />;
    case "scan":
      return <QrCode {...props} />;
    case "teamScores":
      return <ClipboardCheck {...props} />;
    case "profile":
      return <UserRound {...props} />;
    case "submit":
      return <BookOpen {...props} />;
    case "operator":
      return <ClipboardList {...props} />;
    case "scores":
      return <ClipboardCheck {...props} />;
    case "schools":
      return <Landmark {...props} />;
    case "teams":
      return <Users {...props} />;
    case "competitions":
      return <Flag {...props} />;
    case "publication":
      return <Flag {...props} />;
    case "juri":
      return <FileCheck2 {...props} />;
    case "panitia":
      return <CalendarCheck {...props} />;
    case "verify":
      return <ShieldCheck {...props} />;
    case "login":
    case "register":
      return <LogIn {...props} />;
  }
}

function StatusPill({ status }: { status: ScoreStatus | "not_started" }) {
  const statusLabels: Record<ScoreStatus | "not_started", string> = {
    draft: "Draf juri",
    pending_review: "Menunggu penilaian",
    approved: "Selesai",
    revision_needed: "Perlu revisi",
    not_started: "Belum dikerjakan",
  };
  const statusClass =
    status === "approved"
      ? "is-approved"
      : status === "pending_review"
        ? "is-pending"
        : status === "revision_needed"
          ? "is-revision"
          : "";
  const Icon =
    status === "approved"
      ? CheckCircle2
      : status === "pending_review"
        ? Clock3
        : status === "revision_needed"
          ? MessageSquareText
          : status === "draft"
            ? FileText
            : null;
  return (
    <span className={`status-pill ${statusClass}`}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {statusLabels[status]}
    </span>
  );
}

function StateToast({
  message,
  isError,
}: {
  message: string;
  isError: boolean;
}) {
  return (
    <div className={`toast${isError ? " is-error" : ""}`} role="status">
      {isError ? <CircleHelp aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}

function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </header>
  );
}

function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

const participantNavigation: {
  view: View;
  label: string;
  href: string;
}[] = [
  { view: "participant", label: "Beranda", href: "/dashboard" },
  { view: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { view: "scan", label: "Scan tugas", href: "/scan-task" },
  { view: "teamScores", label: "Rekap nilai", href: "/score-recap" },
  { view: "profile", label: "Profil", href: "/profile" },
];

function WorkspaceFrame({
  view,
  children,
}: {
  view: View;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isConnected, profile, signOut } = useWorkspace();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const routeRole: Role =
    view === "operator" ||
    view === "scores" ||
    view === "schools" ||
    view === "teams" ||
    view === "competitions" ||
    view === "publication"
      ? "operator"
      : view === "juri"
        ? "juri"
        : view === "panitia"
          ? "panitia"
          : "peserta";
  const role: Role = isConnected ? profile?.role ?? "peserta" : routeRole;

  const roleOptions: { value: Role; label: string; path: string }[] = [
    { value: "peserta", label: "Peserta", path: "/dashboard" },
    { value: "juri", label: "Juri", path: "/juri" },
    { value: "panitia", label: "Panitia", path: "/panitia" },
    { value: "operator", label: "Operator pusat", path: "/operator" },
  ];

  const nav: { view: View; label: string; href: string; count?: number }[] =
    role === "operator"
      ? [
          { view: "operator", label: "Ringkasan", href: "/operator" },
          {
            view: "scores",
            label: "Peninjauan nilai",
            href: "/operator/scores",
            count: data.scores.filter((score) => score.status === "pending_review")
              .length,
          },
          { view: "teams", label: "Regu & peserta", href: "/operator/teams" },
          { view: "schools", label: "Pangkalan", href: "/operator/schools" },
          {
            view: "competitions",
            label: "Mata lomba",
            href: "/operator/competitions",
          },
          {
            view: "publication",
            label: "Publikasi",
            href: "/operator/publication",
          },
        ]
      : role === "juri"
        ? [{ view: "juri", label: "Input nilai", href: "/juri" }]
        : role === "panitia"
          ? [{ view: "panitia", label: "Pos kegiatan", href: "/panitia" }]
          : [];
  const isParticipant = role === "peserta";

  return (
    <div className={`workspace${isParticipant ? " participant-workspace" : ""}`}>
      {!isParticipant ? (
        <>
        {menuOpen ? (
          <button
            className="mobile-overlay"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <aside className={`sidebar${menuOpen ? " is-open" : ""}`}>
          <div className="mobile-sidebar-head">
            <Logo />
            <button
              className="icon-button mobile-close"
              aria-label="Tutup menu"
              onClick={() => setMenuOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="sidebar-brand">
            <Logo />
          </div>
          <div className="workspace-switcher">
            <span className="workspace-switcher-mark">
              <GraduationCap aria-hidden="true" />
            </span>
            <span className="workspace-switcher-copy">
              <strong>LT-1 Islamiyah</strong>
              <span>Periode kegiatan 2026</span>
            </span>
            <ChevronDown aria-hidden="true" size={15} />
          </div>
          <p className="sidebar-label">Ruang kerja</p>
          <nav className="sidebar-nav" aria-label="Navigasi utama">
            {nav.map((item) => {
              const active =
                item.view === "verify"
                  ? pathname.startsWith("/verify/")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  className="nav-link"
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <IconForView view={item.view} />
                  <span>{item.label}</span>
                  {item.count ? (
                    <span className="nav-count">{item.count}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-help">
              <CircleHelp aria-hidden="true" />
              <p>
                <strong>Perlu bantuan?</strong>
                Hubungi operator kegiatan untuk kendala akun atau penugasan.
              </p>
            </div>
            <div className="account-row">
              <span className="avatar">AF</span>
              <span className="account-copy">
                <strong>Ahmad Fauzan</strong>
                <span>{roleOptions.find((option) => option.value === role)?.label}</span>
              </span>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
          <button
            className="mobile-menu-button"
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
        </aside>
        </>
      ) : null}

      <main className={`main-shell${isParticipant ? " participant-main-shell" : ""}`}>
        <div className="topbar">
          <div className="breadcrumbs">
            <span>LT-1 Islamiyah</span>
            <ChevronRight aria-hidden="true" />
            <strong>{viewTitles[view]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-tag">
              <ShieldCheck aria-hidden="true" />
              Data contoh
            </span>
            <label className="sr-only" htmlFor="role-switcher">
              Tampilan peran
            </label>
            {isConnected ? (
              <span className="role-chip">
                {roleOptions.find((option) => option.value === role)?.label}
              </span>
            ) : (
              <select
                id="role-switcher"
                className="filter-select role-select"
                aria-label="Pilih tampilan peran"
                value={role}
                onChange={(event) => {
                  const next = roleOptions.find(
                    (option) => option.value === event.target.value,
                  );
                  if (next) router.push(next.path);
                }}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <button className="icon-button" aria-label="Notifikasi kegiatan">
              <Bell aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
      {isParticipant ? (
        <nav className="participant-tab-bar" aria-label="Menu peserta">
          {participantNavigation.map((item) => {
            const active =
              item.view === "participant"
                ? pathname === item.href
                : item.view === "scan"
                  ? pathname === item.href || pathname.startsWith("/dashboard/submit/")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                className="participant-tab"
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                <IconForView view={item.view} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function getTeam(data: ReturnType<typeof useWorkspace>["data"], teamId: string) {
  return data.teams.find((team) => team.id === teamId);
}

interface PublicCertificate {
  userId: string;
  participant: Pick<Participant, "id" | "name">;
  team: Team;
  school: School;
  scores: Array<{
    id: string;
    competitionId: string;
    title: string;
    score: number;
  }>;
  issuedAt: string;
}

function isJsonRecord(
  value: Json | undefined,
): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePublicCertificate(value: Json): PublicCertificate | null {
  if (!isJsonRecord(value)) return null;
  const participant = value.participant;
  const team = value.team;
  const school = value.school;
  const scoreValues = value.scores;
  if (
    typeof value.userId !== "string" ||
    !isJsonRecord(participant) ||
    typeof participant.id !== "string" ||
    typeof participant.name !== "string" ||
    !isJsonRecord(team) ||
    typeof team.id !== "string" ||
    typeof team.name !== "string" ||
    (team.category !== "putra" && team.category !== "putri") ||
    !isJsonRecord(school) ||
    typeof school.id !== "string" ||
    typeof school.name !== "string" ||
    (school.schoolType !== "MI" && school.schoolType !== "MTs") ||
    typeof school.headmasterName !== "string" ||
    typeof school.headmasterTitle !== "string" ||
    typeof school.pembinaName !== "string" ||
    typeof school.pembinaTitle !== "string" ||
    typeof value.issuedAt !== "string" ||
    !Array.isArray(scoreValues)
  ) {
    return null;
  }

  const scores: PublicCertificate["scores"] = [];
  for (const score of scoreValues) {
    if (
      !isJsonRecord(score) ||
      typeof score.id !== "string" ||
      typeof score.competitionId !== "string" ||
      typeof score.title !== "string" ||
      typeof score.score !== "number" ||
      score.status !== "approved"
    ) {
      return null;
    }
    scores.push({
      id: score.id,
      competitionId: score.competitionId,
      title: score.title,
      score: score.score,
    });
  }

  return {
    userId: value.userId,
    participant: { id: participant.id, name: participant.name },
    team: {
      id: team.id,
      name: team.name,
      category: team.category === "putra" ? "Putra" : "Putri",
      schoolId: school.id,
    },
    school: {
      id: school.id,
      name: school.name,
      schoolType: school.schoolType,
      headmasterName: school.headmasterName,
      headmasterTitle: school.headmasterTitle,
      pembinaName: school.pembinaName,
      pembinaTitle: school.pembinaTitle,
    },
    scores,
    issuedAt: value.issuedAt,
  };
}

function getCompetition(data: ReturnType<typeof useWorkspace>["data"], id: string) {
  return data.competitions.find((competition) => competition.id === id);
}

function getScore(
  records: ScoreRecord[],
  teamId: string,
  competitionId: string,
) {
  return records.find(
    (record) =>
      record.teamId === teamId && record.competitionId === competitionId,
  );
}

function approvedScoresForTeam(
  records: ScoreRecord[],
  teamId: string,
  competitionIds?: string[],
) {
  return records.filter(
    (record) =>
      record.teamId === teamId &&
      record.status === "approved" &&
      (!competitionIds || competitionIds.includes(record.competitionId)),
  );
}

function taskStatus(
  score: ScoreRecord | undefined,
  submitted: boolean,
): ScoreStatus | "not_started" {
  if (score) return score.status;
  return submitted ? "pending_review" : "not_started";
}

const badgeIcons = [Compass, Signpost, ShieldCheck, Star, BookOpen, Flag];
const competitionIcons = [Signpost, BookOpen, ShieldCheck, FileText, Star, Flag];

function ParticipantDashboard({ notify }: { notify: Notify }) {
  const { data, currentUserId, isConnected } = useWorkspace();
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const currentTeamId = participant?.teamId ?? (isConnected ? "" : CURRENT_TEAM_ID);
  const team = getTeam(data, currentTeamId);
  const school = data.schools.find((item) => item.id === team?.schoolId);
  const teamScores = approvedScoresForTeam(data.scores, currentTeamId);
  const badgeCount = teamScores.filter((score) => score.score >= 80).length;
  const approvedCount = data.competitions.filter(
    (competition) =>
      getScore(data.scores, currentTeamId, competition.id)?.status === "approved",
  ).length;
  const allApproved = approvedCount === data.competitions.length;
  const teamTotal = teamScores.reduce((total, score) => total + score.score, 0);
  const submittedCount = data.competitions.filter(
    (competition) => data.submissions[competition.id]?.submitted,
  ).length;
  const progress = Math.round((approvedCount / data.competitions.length) * 100);
  const certificateReady = allApproved && data.certificatesPublished;
  const sortedTeams = data.teams
    .map((teamItem) => ({
      ...teamItem,
      total: approvedScoresForTeam(data.scores, teamItem.id).reduce(
        (sum, score) => sum + score.score,
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeading
        title={`Selamat pagi, ${participant?.name?.split(" ")[0] ?? "Peserta"}`}
        description={`Ringkasan tugas, nilai, dan pencapaian Regu ${team?.name ?? "Anda"}.`}
      />
      <section className="scout-banner" aria-labelledby="team-greeting">
        <div className="banner-copy">
          <p className="banner-kicker">LOMBA TINGKAT 1 · 2026</p>
          <h2 id="team-greeting">Regu Elang, terus jaga kekompakan.</h2>
          <p>
            {school?.name} · {team?.category}
          </p>
          <Link className="banner-action" href="/dashboard/submit/islamiyah">
            Lanjutkan tugas <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="banner-progress" aria-label={`${progress}% nilai disahkan`}>
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(#dcebd6 0 ${progress}%, rgb(255 255 255 / 18%) ${progress}% 100%)`,
            }}
          >
            <div className="progress-ring-inner">
              <strong>{approvedCount}/{data.competitions.length}</strong>
              <span>nilai disahkan</span>
            </div>
          </div>
          <div className="banner-progress-copy">
            <strong>{submittedCount} tugas terkirim</strong>
            <span>{data.participants.filter((person) => person.teamId === currentTeamId).length} anggota regu</span>
            <span>{teamTotal} poin disahkan</span>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-column">
          <section className="panel panel-pad">
            <SectionHeading
              title="Lencana regu"
              detail="Lencana diberikan untuk nilai minimal 80."
              action={
                <span className="role-chip">
                  {badgeCount} dari {data.competitions.length} diraih
                </span>
              }
            />
            <div className="badge-grid">
              {data.competitions.map((competition, index) => {
                const Icon = badgeIcons[index % badgeIcons.length];
                const score = getScore(data.scores, currentTeamId, competition.id);
                const earned = score?.status === "approved" && score.score >= 80;
                return (
                  <div
                    className={`badge-item${earned ? "" : " is-locked"}`}
                    key={competition.id}
                    title={
                      earned
                        ? `${competition.title}: ${score.score} poin`
                        : `${competition.title}: belum diraih`
                    }
                  >
                    <span className="badge-seal">
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{competition.title}</strong>
                    <span>{earned ? `${score.score} poin` : "Belum diraih"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel panel-pad">
            <SectionHeading
              title="Mata lomba"
              detail="Status tugas dan hasil penilaian regumu."
              action={<span className="role-chip">{data.competitions.length} lomba</span>}
            />
            <div className="competition-list">
              {data.competitions.map((competition, index) => {
                const Icon = competitionIcons[index % competitionIcons.length];
                const score = getScore(data.scores, currentTeamId, competition.id);
                const submitted = data.submissions[competition.id]?.submitted ?? false;
                const status = taskStatus(score, submitted);
                const href = `/dashboard/submit/${competition.id}`;
                return (
                  <div className="competition-row" key={competition.id}>
                    <div className="competition-main">
                      <span className="competition-symbol">
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="competition-copy">
                        <strong>{competition.title}</strong>
                        <span>
                          {score?.status === "approved"
                            ? "Nilai disahkan operator"
                            : submitted
                              ? "Tugas sudah dikirim"
                              : "Jadwal tersedia di informasi panitia"}
                        </span>
                      </span>
                    </div>
                    <StatusPill status={status} />
                    <span className="score-value">
                      {score && score.status === "approved" ? score.score : "—"}
                      {score && score.status === "approved" ? <span> / 100</span> : null}
                    </span>
                    <Link
                      className="row-action-link"
                      href={href}
                      aria-label={`${submitted ? "Lihat" : "Kerjakan"} tugas ${competition.title}`}
                    >
                      {submitted ? "Lihat" : "Kerjakan"}
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="certificate-panel">
            <div className="certificate-copy">
              <span className="certificate-mark">
                {certificateReady ? (
                  <FileCheck2 aria-hidden="true" />
                ) : (
                  <LockKeyhole aria-hidden="true" />
                )}
              </span>
              <div>
                <h2>{certificateReady ? "Sertifikat siap diunduh" : "Sertifikat digital"}</h2>
                <p>
                  {certificateReady
                    ? "Nilai sudah disahkan dan akses sertifikat telah dibuka."
                    : !allApproved
                      ? `${data.competitions.length - approvedCount} mata lomba masih menunggu pengesahan.`
                      : "Menunggu operator membuka akses sertifikat."}
                </p>
              </div>
            </div>
            <button
              className="button button-small"
              disabled={!certificateReady}
              onClick={() =>
                void downloadCertificate(
                  data.participants.find(
                    (person) => person.id === CURRENT_PARTICIPANT_ID,
                  ),
                  team,
                  school,
                  data.competitions,
                  data.scores,
                  data.certificatesPublishedAt,
                  currentUserId,
                  notify,
                )
              }
            >
              <Download aria-hidden="true" />
              Unduh sertifikat
            </button>
          </section>
          <p className="inline-note">
            Papan skor {data.leaderboardPublished ? "dirilis" : "belum dirilis"} oleh operator.
          </p>
        </div>

        <div className="dashboard-column">
          <section className="panel panel-pad">
            <SectionHeading
              title="Papan skor sementara"
              detail="Total nilai yang telah disahkan."
              action={
                data.leaderboardPublished ? (
                  <span className="status-pill is-approved">Terbit</span>
                ) : (
                  <span className="status-pill">Belum terbit</span>
                )
              }
            />
            {data.leaderboardPublished ? (
              <div className="leaderboard-list">
                {sortedTeams.slice(0, 5).map((teamItem, index) => (
                  <div className="leaderboard-row" key={teamItem.id}>
                    <span className="leaderboard-rank">{index + 1}</span>
                    <div className="leaderboard-info">
                      <div>
                        <strong>
                          {teamItem.name}
                          {teamItem.id === currentTeamId ? " · Regumu" : ""}
                        </strong>
                        <span>{teamItem.total} poin</span>
                      </div>
                      <div className="leaderboard-track">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (teamItem.total /
                                  Math.max(sortedTeams[0]?.total ?? 1, 1)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Flag aria-hidden="true" />
                <strong>Papan skor belum dibuka</strong>
                <p>Operator akan merilis peringkat setelah peninjauan nilai.</p>
              </div>
            )}
          </section>

          <section className="panel panel-pad">
            <SectionHeading
              title="Data regu"
              action={
                <Link className="text-link" href="/dashboard/submit/pionering">
                  Lihat tugas <ChevronRight aria-hidden="true" />
                </Link>
              }
            />
            <div className="activity-list">
              <div className="activity-row">
                <span className="activity-copy">
                  <strong>Nama regu</strong>
                  <span>{team?.name ?? "Belum dipetakan"}</span>
                </span>
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div className="activity-row">
                <span className="activity-copy">
                  <strong>Pangkalan</strong>
                  <span>{school?.name ?? "Belum dipetakan"}</span>
                </span>
                <Landmark size={18} aria-hidden="true" />
              </div>
              <div className="activity-row">
                <span className="activity-copy">
                  <strong>Ketua regu</strong>
                  <span>
                    {data.participants.find(
                      (person) =>
                        person.teamId === currentTeamId && person.isPinru,
                    )?.name ?? "Belum ditentukan"}
                  </span>
                </span>
                <Users size={18} aria-hidden="true" />
              </div>
            </div>
          </section>
          <button
            className="button button-secondary wide-primary"
            onClick={() => notify("Kontak operator kegiatan: operator@lt1-islamiyah.id")}
          >
            <CircleHelp aria-hidden="true" />
            Hubungi operator
          </button>
        </div>
      </div>
    </>
  );
}

function ParticipantLeaderboard() {
  const { data, currentUserId, isConnected } = useWorkspace();
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const currentTeamId = participant?.teamId ?? (isConnected ? "" : CURRENT_TEAM_ID);
  const rankedTeams = data.teams
    .map((team) => {
      const school = data.schools.find((item) => item.id === team.schoolId);
      const scores = approvedScoresForTeam(data.scores, team.id);
      return {
        ...team,
        schoolName: school?.name ?? "Pangkalan belum dipetakan",
        approvedCount: scores.length,
        total: scores.reduce((sum, score) => sum + score.score, 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeading
        title="Leaderboard"
        description="Peringkat regu dari nilai yang sudah disahkan operator."
      />
      {!data.leaderboardPublished ? (
        <section className="panel panel-pad">
          <div className="empty-state">
            <Trophy aria-hidden="true" />
            <strong>Leaderboard belum dibuka</strong>
            <p>Operator akan merilis peringkat setelah peninjauan nilai.</p>
          </div>
        </section>
      ) : (
        <section className="panel panel-pad participant-ranking">
          <SectionHeading
            title="Peringkat regu"
            detail={`${rankedTeams.length} regu · nilai disahkan`}
            action={<span className="status-pill is-approved">Terbit</span>}
          />
          <ol className="participant-ranking-list">
            {rankedTeams.map((team, index) => (
              <li
                className={`participant-ranking-row${team.id === currentTeamId ? " is-current" : ""}`}
                key={team.id}
              >
                <span className="participant-ranking-position">
                  {index < 3 ? (
                    <Medal aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>
                <span className="participant-ranking-team">
                  <strong>
                    {team.name}
                    {team.id === currentTeamId ? " · Regumu" : ""}
                  </strong>
                  <span>
                    {team.schoolName} · {team.category} · {team.approvedCount}/
                    {data.competitions.length} nilai
                  </span>
                </span>
                <strong className="participant-ranking-score">
                  {team.total.toLocaleString("id-ID")}
                  <span> poin</span>
                </strong>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function ParticipantScoreRecap() {
  const { data, currentUserId, isConnected } = useWorkspace();
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const ownTeamId = participant?.teamId ?? (isConnected ? "" : CURRENT_TEAM_ID);
  const [selectedTeamId, setSelectedTeamId] = React.useState(ownTeamId);
  const canViewAllTeams = data.leaderboardPublished;
  const team = data.teams.find((item) => item.id === selectedTeamId);
  const school = data.schools.find((item) => item.id === team?.schoolId);
  const scores = data.competitions.map((competition) => ({
    competition,
    score: team ? getScore(data.scores, team.id, competition.id) : undefined,
  }));
  const approvedScores = scores.filter(
    (item) => item.score?.status === "approved",
  );
  const total = approvedScores.reduce(
    (sum, item) => sum + (item.score?.score ?? 0),
    0,
  );
  const pendingCount = scores.filter(
    (item) =>
      item.score?.status === "pending_review" ||
      item.score?.status === "draft",
  ).length;
  const revisionCount = scores.filter(
    (item) => item.score?.status === "revision_needed",
  ).length;

  return (
    <>
      <PageHeading
        title="Rekap nilai regu"
        description="Periksa nilai yang disahkan, menunggu tinjauan, atau perlu revisi."
      />
      <section className="participant-score-summary">
        <div>
          <span>Total disahkan</span>
          <strong>{total.toLocaleString("id-ID")}</strong>
          <small>poin</small>
        </div>
        <div>
          <span>Nilai disahkan</span>
          <strong>
            {approvedScores.length}/{data.competitions.length}
          </strong>
        </div>
        <div>
          <span>Menunggu</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>Perlu revisi</span>
          <strong>{revisionCount}</strong>
        </div>
      </section>
      <section className="panel panel-pad participant-score-panel">
        <div className="participant-team-picker">
          <div>
            <h2>{team?.name ?? "Regu belum dipetakan"}</h2>
            <p>
              {school?.name ?? "Pangkalan belum dipetakan"}
              {team ? ` · ${team.category}` : ""}
            </p>
          </div>
          <label>
            <span className="field-label">Pilih regu</span>
            <select
              className="filter-select"
              value={canViewAllTeams ? selectedTeamId : ownTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              disabled={!canViewAllTeams}
              aria-label="Pilih regu untuk melihat rekap nilai"
            >
              {(canViewAllTeams
                ? data.teams
                : data.teams.filter((item) => item.id === ownTeamId)
              ).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.category}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!canViewAllTeams ? (
          <p className="inline-note">
            Rekap regu lain akan tersedia setelah operator merilis leaderboard.
          </p>
        ) : null}
        <div className="participant-score-list">
          {scores.map(({ competition, score }) => (
            <div className="participant-score-row" key={competition.id}>
              <div>
                <strong>{competition.title}</strong>
                <span>{score?.feedback || "Belum ada catatan penilaian."}</span>
              </div>
              <StatusPill
                status={
                  score?.status ??
                  (data.submissions[competition.id]?.submitted
                    ? "pending_review"
                    : "not_started")
                }
              />
              <strong className="participant-score-value">
                {score?.status === "approved" ? score.score : "—"}
                <span>{score?.status === "approved" ? " / 100" : ""}</span>
              </strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ParticipantProfile({ notify }: { notify: Notify }) {
  const { data, currentUserId, isConnected, signOut } = useWorkspace();
  const router = useRouter();
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const team = participant
    ? getTeam(data, participant.teamId)
    : isConnected
      ? undefined
      : getTeam(data, CURRENT_TEAM_ID);
  const school = data.schools.find((item) => item.id === team?.schoolId);
  const initials = (participant?.name ?? "Peserta")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeading
        title="Profil peserta"
        description="Informasi akun dan regu yang terdaftar pada kegiatan LT-1."
      />
      <section className="panel panel-pad participant-profile-card">
        <div className="participant-profile-heading">
          <span className="participant-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2>{participant?.name ?? "Peserta belum dipetakan"}</h2>
            <p>{participant?.isPinru ? "Pemimpin regu" : "Anggota regu"}</p>
          </div>
        </div>
        <dl className="participant-profile-details">
          <div>
            <dt>Regu</dt>
            <dd>{team?.name ?? "Belum ditentukan"}</dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>{team?.category ?? "Belum ditentukan"}</dd>
          </div>
          <div>
            <dt>Pangkalan</dt>
            <dd>{school?.name ?? "Belum ditentukan"}</dd>
          </div>
          <div>
            <dt>Periode</dt>
            <dd>LT-1 · 2026</dd>
          </div>
        </dl>
        <div className="participant-profile-actions">
          <Link className="button button-secondary" href={`/verify/${currentUserId}`}>
            <ShieldCheck aria-hidden="true" />
            Verifikasi sertifikat
          </Link>
          {isConnected ? (
            <button
              className="text-link participant-signout"
              onClick={() => {
                void signOut()
                  .then(() => router.replace("/login"))
                  .catch((error: unknown) => {
                    console.error("Gagal keluar dari sesi Supabase.", error);
                    notify("Tidak dapat mengakhiri sesi. Coba lagi.", true);
                  });
              }}
            >
              Keluar <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <Link className="text-link" href="/login">
              Keluar dari pratinjau <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
        <p className="inline-note">
          Profil ini menggunakan data contoh. Pengaturan akun belum tersambung ke layanan autentikasi.
        </p>
      </section>
    </>
  );
}

type QRDetector = {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};

type QRDetectorConstructor = new (options: {
  formats: string[];
}) => QRDetector;

function competitionIdFromQr(
  value: string,
  competitions: Competition[],
): string | null {
  const trimmed = value.trim();
  const directMatch = competitions.find((competition) => competition.id === trimmed);
  if (directMatch) return directMatch.id;
  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const pathId = url.pathname.match(/^\/dashboard\/submit\/([^/]+)\/?$/)?.[1];
    const candidateId = pathId
      ? decodeURIComponent(pathId)
      : url.searchParams.get("competitionId");
    return competitions.find((competition) => competition.id === candidateId)?.id ?? null;
  } catch {
    return null;
  }
}

function ScanTaskPage() {
  const { data } = useWorkspace();
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<QRDetector | null>(null);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [cameraStarting, setCameraStarting] = React.useState(false);
  const [scanValue, setScanValue] = React.useState("");
  const [scanError, setScanError] = React.useState("");

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  React.useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const openTask = React.useCallback(
    (value: string) => {
      const competitionId = competitionIdFromQr(value, data.competitions);
      if (!competitionId) {
        setScanError(
          "QR tidak dikenali. Gunakan QR tugas LT-1 atau masukkan ID mata lomba.",
        );
        return;
      }
      stopCamera();
      router.push(`/dashboard/submit/${competitionId}`);
    },
    [data.competitions, router, stopCamera],
  );

  React.useEffect(() => {
    if (!cameraActive || !detectorRef.current) return;
    let active = true;
    let frameId = 0;
    const scanFrame = async () => {
      if (!active) return;
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (video && detector && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            active = false;
            const scannedValue = codes[0].rawValue;
            if (competitionIdFromQr(scannedValue, data.competitions)) {
              openTask(scannedValue);
            } else {
              setScanError(
                "QR tidak dikenali. Gunakan QR tugas LT-1 atau masukkan ID mata lomba.",
              );
              stopCamera();
            }
            return;
          }
        } catch (error) {
          active = false;
          console.error("Pemindaian QR tugas gagal.", error);
          setScanError("Kamera tidak dapat membaca QR. Coba masukkan kode tugas.");
          stopCamera();
          return;
        }
      }
      frameId = window.requestAnimationFrame(() => void scanFrame());
    };
    frameId = window.requestAnimationFrame(() => void scanFrame());
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [cameraActive, data.competitions, openTask, stopCamera]);

  const startCamera = async () => {
    setScanError("");
    const Detector = (
      window as Window & { BarcodeDetector?: QRDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setScanError(
        "Pemindaian kamera belum didukung di browser ini. Masukkan kode atau tautan QR di bawah.",
      );
      return;
    }
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      if (!videoRef.current) {
        throw new Error("Pratinjau kamera tidak tersedia.");
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
    } catch (error) {
      console.error("Tidak dapat memulai kamera pemindai tugas.", error);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      detectorRef.current = null;
      setScanError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera atau masukkan kode tugas."
          : "Kamera tidak dapat dibuka. Masukkan kode atau tautan QR tugas.",
      );
    } finally {
      setCameraStarting(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Scan tugas"
        description="Pindai QR dari panitia untuk langsung membuka mata lomba."
      />
      <section className="scan-task-layout">
        <div className="panel panel-pad scan-task-panel">
          <div className="scan-camera-frame">
            <video
              ref={videoRef}
              className={cameraActive ? "is-active" : ""}
              aria-label="Pratinjau kamera pemindai QR"
              muted
              playsInline
            />
            {!cameraActive ? (
              <div className="scan-camera-placeholder">
                <span>
                  <QrCode aria-hidden="true" />
                </span>
                <strong>Arahkan kamera ke QR tugas</strong>
                <p>Pastikan kode QR terlihat jelas di dalam bingkai.</p>
              </div>
            ) : null}
          </div>
          <div className="scan-camera-actions">
            {cameraActive ? (
              <button
                className="button button-secondary"
                onClick={stopCamera}
                type="button"
              >
                Hentikan kamera
              </button>
            ) : (
              <button
                className="button"
                onClick={() => void startCamera()}
                disabled={cameraStarting}
                type="button"
              >
                <QrCode aria-hidden="true" />
                {cameraStarting ? "Membuka kamera…" : "Buka pemindai"}
              </button>
            )}
          </div>
        </div>
        <aside className="scan-task-help">
          <h2>Atau masukkan kode</h2>
          <p>
            Gunakan ID mata lomba atau tautan QR tugas yang diberikan panitia.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              openTask(scanValue);
            }}
          >
            <label className="field-label" htmlFor="task-qr-value">
              Kode atau tautan tugas
            </label>
            <input
              id="task-qr-value"
              className="field"
              value={scanValue}
              onChange={(event) => {
                setScanValue(event.target.value);
                setScanError("");
              }}
              placeholder="Contoh: pionering"
            />
            <button className="button button-secondary" type="submit">
              Buka tugas
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
          {scanError ? (
            <p className="scan-task-error" role="alert">
              {scanError}
            </p>
          ) : null}
          <div className="scan-task-codes">
            <span>Contoh ID tugas</span>
            <div>
              {data.competitions.map((competition) => (
                <button
                  key={competition.id}
                  type="button"
                  onClick={() => {
                    setScanValue(competition.id);
                    setScanError("");
                  }}
                >
                  {competition.id}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

async function downloadCertificate(
  participant: Participant | undefined,
  team: Team | undefined,
  school: School | undefined,
  competitions: Competition[],
  scores: ScoreRecord[],
  issuedAt: string | null,
  userId: string,
  notify: Notify,
) {
  if (!participant || !team || !school) {
    notify("Data peserta, regu, atau pangkalan belum lengkap.", true);
    return;
  }
  const teamScores = competitions.map((competition) =>
    getScore(scores, team.id, competition.id),
  );
  if (teamScores.some((score) => score?.status !== "approved")) {
    notify("Sertifikat tersedia setelah semua nilai disahkan operator.", true);
    return;
  }
  try {
    const verifyUrl = `${window.location.origin}/verify/${userId}`;
    const qrSvg = await QRCode.toString(verifyUrl, {
      type: "svg",
      width: 144,
      margin: 1,
      color: { dark: "#203c2e", light: "#ffffff" },
    });
    const qrViewBox = qrSvg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 33 33";
    const qrContent = qrSvg
      .replace(/^[\s\S]*?<svg\b[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "");
    const total = teamScores.reduce((sum, score) => sum + (score?.score ?? 0), 0);
    const average = (total / teamScores.length).toFixed(1);
    const issuedDate = issuedAt
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(issuedAt))
      : "Belum tercatat";
    const escapeXml = (value: string) =>
      value.replace(/[<>&'"]/g, (character) => {
        const entities: Record<string, string> = {
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '"': "&quot;",
        };
        return entities[character] ?? character;
      });
    const scoreRows = competitions
      .map((competition, index) => {
        const score = teamScores[index]?.score ?? 0;
        const y = 835 + index * 75;
        return `<text x="140" y="${y}" class="row">${escapeXml(competition.title)}</text><text x="940" y="${y}" class="row number">${score}</text><line x1="140" y1="${y + 22}" x2="940" y2="${y + 22}" class="rule"/>`;
      })
      .join("");
    const qrMark = (x: number) =>
      `<svg x="${x}" y="1485" width="130" height="130" viewBox="${qrViewBox}" role="img" aria-label="QR verifikasi">${qrContent}</svg>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<rect width="1080" height="1920" fill="#f7f8f4"/>
<rect x="34" y="34" width="1012" height="1852" rx="4" fill="none" stroke="#315d43" stroke-width="3"/>
<rect x="50" y="50" width="980" height="1820" rx="2" fill="none" stroke="#c8d6c6" stroke-width="1"/>
<path d="M75 310H1005" stroke="#315d43" stroke-width="2"/>
<text x="540" y="135" text-anchor="middle" class="kicker">GERAKAN PRAMUKA ISLAMIYAH</text>
<text x="540" y="220" text-anchor="middle" class="title">SERTIFIKAT PENGHARGAAN</text>
<text x="540" y="275" text-anchor="middle" class="subtitle">LOMBA TINGKAT 1 · 2026</text>
<text x="540" y="390" text-anchor="middle" class="label">Diberikan kepada</text>
<text x="540" y="490" text-anchor="middle" class="name">${escapeXml(participant.name)}</text>
<text x="540" y="555" text-anchor="middle" class="body">${escapeXml(school.name)}</text>
<text x="540" y="600" text-anchor="middle" class="body">Regu ${escapeXml(team.name)} · ${team.category}</text>
<text x="140" y="720" class="tablehead">MATA LOMBA</text>
<text x="940" y="720" text-anchor="end" class="tablehead">NILAI</text>
${scoreRows}
<text x="140" y="1310" class="total-label">Total nilai</text>
<text x="940" y="1310" text-anchor="end" class="total">${total}</text>
<text x="140" y="1360" class="body">Rata-rata</text>
<text x="940" y="1360" text-anchor="end" class="body">${average}</text>
<line x1="140" y1="1400" x2="940" y2="1400" class="rule"/>
${qrMark(220)}${qrMark(730)}
<text x="285" y="1650" text-anchor="middle" class="label">Pembina Pramuka</text>
<text x="285" y="1690" text-anchor="middle" class="signer">${escapeXml(school.pembinaName)}</text>
<text x="795" y="1650" text-anchor="middle" class="label">Kepala Madrasah / Ka Mabigus</text>
<text x="795" y="1690" text-anchor="middle" class="signer">${escapeXml(school.headmasterName)}</text>
<text x="540" y="1780" text-anchor="middle" class="foot">Pindai QR untuk melihat halaman verifikasi sertifikat.</text>
<text x="540" y="1810" text-anchor="middle" class="foot">Diterbitkan ${escapeXml(issuedDate)}</text>
<text x="540" y="1845" text-anchor="middle" class="foot">LT1-2026-${escapeXml(participant.id.toUpperCase())}</text>
<style>
.kicker{font:600 19px Arial,sans-serif;letter-spacing:3px;fill:#315d43}
.title{font:700 43px Arial,sans-serif;letter-spacing:1px;fill:#19231d}
.subtitle{font:500 22px Arial,sans-serif;letter-spacing:2px;fill:#526057}
.label{font:400 18px Arial,sans-serif;fill:#526057}
.name{font:700 44px Arial,sans-serif;fill:#19231d}
.body{font:400 21px Arial,sans-serif;fill:#354139}
.tablehead{font:600 16px Arial,sans-serif;letter-spacing:1.5px;fill:#526057}
.row{font:400 21px Arial,sans-serif;fill:#19231d}
.number{font-weight:600;text-anchor:end}
.rule{stroke:#dfe5de;stroke-width:1}
.total-label{font:600 23px Arial,sans-serif;fill:#19231d}
.total{font:700 28px Arial,sans-serif;text-anchor:end;fill:#315d43}
.signer{font:600 20px Arial,sans-serif;fill:#19231d}
.foot{font:400 15px Arial,sans-serif;fill:#526057}
</style></svg>`;
    const file = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sertifikat-lt1-${participant.id}.svg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Sertifikat berhasil dibuat. QR mengarah ke halaman verifikasi.");
  } catch (error) {
    console.error("Gagal membuat sertifikat LT-1.", error);
    notify("Sertifikat gagal dibuat. Coba lagi atau hubungi operator.", true);
  }
}

function OperatorDashboard() {
  const { data } = useWorkspace();
  const pending = data.scores.filter((score) => score.status === "pending_review");
  const needsRevision = data.scores.filter(
    (score) => score.status === "revision_needed",
  ).length;
  const reviewQueue = pending.slice(0, 4);
  const schoolTotals = data.schools.map((school) => ({
    ...school,
    count: data.teams.filter((team) => team.schoolId === school.id).length,
  }));
  const stats = [
    { label: "Peserta terdaftar", value: data.participants.length, detail: "di 5 regu" },
    { label: "Regu terdaftar", value: data.teams.length, detail: "putra dan putri" },
    { label: "Mata lomba", value: data.competitions.length, detail: "semua pos aktif" },
    {
      label: "Menunggu tinjauan",
      value: pending.length,
      detail: needsRevision ? `${needsRevision} perlu revisi` : "butuh keputusan operator",
    },
  ];

  return (
    <>
      <PageHeading
        title="Ringkasan operator"
        description="Pantau kesiapan lomba dan tindak lanjuti nilai yang masuk."
        actions={
          <Link className="button" href="/operator/scores">
            <ClipboardCheck aria-hidden="true" />
            Tinjau nilai
          </Link>
        }
      />
      <div className="stats-grid" aria-label="Statistik kegiatan">
        {stats.map((stat) => (
          <div className="stat-cell" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </div>
      <div className="content-grid">
        <section className="panel panel-pad">
          <SectionHeading
            title="Nilai menunggu tinjauan"
            detail={`${pending.length} nilai menunggu keputusan operator.`}
            action={
              <Link className="text-link" href="/operator/scores">
                Buka antrean <ChevronRight aria-hidden="true" />
              </Link>
            }
          />
          {reviewQueue.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Regu & pangkalan</th>
                    <th>Mata lomba</th>
                    <th className="numeric">Nilai</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.map((score) => {
                    const team = getTeam(data, score.teamId);
                    const school = data.schools.find(
                      (item) => item.id === team?.schoolId,
                    );
                    const competition = getCompetition(data, score.competitionId);
                    return (
                      <tr key={score.id}>
                        <td>
                          <span className="table-primary">{team?.name ?? "Regu"}</span>
                          <span className="table-secondary">{school?.schoolType}</span>
                        </td>
                        <td>{competition?.title ?? "Mata lomba"}</td>
                        <td className="numeric">{score.score}</td>
                        <td>
                          <StatusPill status={score.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CheckCircle2 aria-hidden="true" />
              <strong>Antrean tinjauan kosong</strong>
              <p>Nilai baru dari juri akan muncul di sini.</p>
            </div>
          )}
        </section>

        <div className="dashboard-column">
          <section className="panel panel-pad">
            <SectionHeading
              title="Pangkalan"
              action={
                <Link className="text-link" href="/operator/schools">
                  Kelola <ChevronRight aria-hidden="true" />
                </Link>
              }
            />
            <div className="activity-list">
              {schoolTotals.map((school) => (
                <div className="activity-row" key={school.id}>
                  <span className="activity-copy">
                    <strong>{school.name}</strong>
                    <span>{school.count} regu terdaftar</span>
                  </span>
                  <Landmark size={18} aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>
          <section className="panel panel-pad">
            <SectionHeading title="Rilis kegiatan" />
            <div className="toggle-row">
              <span className="toggle-copy">
                <strong>Papan skor publik</strong>
                <span>
                  {data.leaderboardPublished
                    ? "Peringkat dapat dilihat peserta."
                    : "Peringkat masih disembunyikan."}
                </span>
              </span>
              <span
                className="status-pill"
                aria-label={data.leaderboardPublished ? "Sudah dirilis" : "Belum dirilis"}
              >
                {data.leaderboardPublished ? "Terbit" : "Draf"}
              </span>
            </div>
            <Link className="text-link" href="/operator/publication">
              Atur publikasi <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function OperatorScores({ notify }: { notify: Notify }) {
  const { data, setScoreStatus } = useWorkspace();
  const [filter, setFilter] = React.useState<ScoreStatus | "all">(
    "pending_review",
  );
  const [search, setSearch] = React.useState("");
  const [revisionTarget, setRevisionTarget] = React.useState<ScoreRecord | null>(
    null,
  );
  const [revisionNote, setRevisionNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const visibleScores = data.scores.filter((score) => {
    const team = getTeam(data, score.teamId);
    const competition = getCompetition(data, score.competitionId);
    const matchesFilter = filter === "all" || score.status === filter;
    const matchesSearch = `${team?.name ?? ""} ${competition?.title ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const approve = async (score: ScoreRecord) => {
    const team = getTeam(data, score.teamId);
    const competition = getCompetition(data, score.competitionId);
    try {
      await setScoreStatus(score.id, "approved");
      notify(`Nilai ${team?.name ?? ""} untuk ${competition?.title ?? ""} disahkan.`);
    } catch (error) {
      console.error("Gagal mengesahkan nilai.", error);
      notify("Nilai gagal disahkan. Periksa akses dan koneksi Supabase.", true);
    }
  };

  const requestRevision = async () => {
    if (!revisionTarget || !revisionNote.trim()) return;
    setBusy(true);
    try {
      await setScoreStatus(
        revisionTarget.id,
        "revision_needed",
        revisionNote.trim(),
      );
      const team = getTeam(data, revisionTarget.teamId);
      setRevisionTarget(null);
      setRevisionNote("");
      notify(`Revisi dikirim ke ${team?.name ?? "regu"} beserta catatan juri.`);
    } catch (error) {
      console.error("Gagal mengirim permintaan revisi nilai.", error);
      notify("Permintaan revisi gagal disimpan.", true);
    } finally {
      setBusy(false);
    }
  };

  const filterOptions: { value: ScoreStatus | "all"; label: string }[] = [
    { value: "pending_review", label: "Menunggu tinjauan" },
    { value: "approved", label: "Disetujui" },
    { value: "revision_needed", label: "Perlu revisi" },
    { value: "draft", label: "Draf juri" },
    { value: "all", label: "Semua status" },
  ];

  return (
    <>
      <PageHeading
        title="Peninjauan nilai"
        description="Pastikan nilai dan catatan juri sesuai sebelum hasil diterbitkan."
      />
      <section className="panel panel-pad">
        <SectionHeading
          title="Antrean penilaian"
          detail={`${visibleScores.length} nilai ditampilkan dari ${data.scores.length} catatan.`}
        />
        <div className="filter-row">
          <div className="search-control">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="score-search">
              Cari regu atau mata lomba
            </label>
            <input
              id="score-search"
              className="field"
              placeholder="Cari regu atau mata lomba"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="score-filter">
            Filter status nilai
          </label>
          <select
            id="score-filter"
            className="filter-select"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ScoreStatus | "all")
            }
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {visibleScores.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Regu</th>
                  <th>Mata lomba</th>
                  <th className="numeric">Nilai</th>
                  <th>Catatan juri</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleScores.map((score) => {
                  const team = getTeam(data, score.teamId);
                  const school = data.schools.find(
                    (item) => item.id === team?.schoolId,
                  );
                  const competition = getCompetition(data, score.competitionId);
                  return (
                    <tr key={score.id}>
                      <td>
                        <span className="table-primary">{team?.name}</span>
                        <span className="table-secondary">
                          {school?.schoolType} · {team?.category}
                        </span>
                      </td>
                      <td>{competition?.title}</td>
                      <td className="numeric">{score.score}</td>
                      <td>{score.feedback || "Belum ada catatan"}</td>
                      <td>
                        <StatusPill status={score.status} />
                      </td>
                      <td>
                        <div className="table-actions">
                          {score.status === "pending_review" ? (
                            <>
                              <button
                                className="button button-small"
                                onClick={() => approve(score)}
                              >
                                <Check aria-hidden="true" />
                                Setujui
                              </button>
                              <button
                                className="button button-secondary button-small"
                                onClick={() => {
                                  setRevisionTarget(score);
                                  setRevisionNote("");
                                }}
                              >
                                Revisi
                              </button>
                            </>
                          ) : (
                            <span className="table-secondary">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Search aria-hidden="true" />
            <strong>Tidak ada nilai yang cocok</strong>
            <p>Ubah pencarian atau pilih status lain.</p>
          </div>
        )}
      </section>
      {revisionTarget ? (
        <div
          className="revision-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setRevisionTarget(null);
          }}
        >
          <section
            aria-labelledby="revision-title"
            aria-modal="true"
            className="revision-dialog"
            role="dialog"
          >
            <h2 id="revision-title">Minta perbaikan nilai</h2>
            <p>
              Catatan ini akan dikirim kepada juri untuk{" "}
              <strong>
                {getTeam(data, revisionTarget.teamId)?.name} ·{" "}
                {getCompetition(data, revisionTarget.competitionId)?.title}
              </strong>
              .
            </p>
            <label className="field-label" htmlFor="revision-note">
              Catatan revisi
            </label>
            <textarea
              id="revision-note"
              className="text-area"
              autoFocus
              placeholder="Jelaskan bagian nilai yang perlu diperiksa kembali."
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
            />
            <div className="revision-dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setRevisionTarget(null)}
              >
                Batal
              </button>
              <button
                className="button"
                disabled={!revisionNote.trim() || busy}
                onClick={requestRevision}
              >
                <Send aria-hidden="true" />
                Kirim revisi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SchoolManagement({ notify }: { notify: Notify }) {
  const { data, updateSchool, createSchool, isConnected } = useWorkspace();
  const [schoolDrafts, setSchoolDrafts] = React.useState<
    Record<string, Partial<School>>
  >({});
  const [newSchoolName, setNewSchoolName] = React.useState("");
  const [newSchoolType, setNewSchoolType] = React.useState<School["schoolType"]>("MI");
  const [newHeadmaster, setNewHeadmaster] = React.useState("");
  const [newPembina, setNewPembina] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const fieldConfig: {
    field: keyof School;
    label: string;
  }[] = [
    { field: "headmasterName", label: "Nama kepala madrasah" },
    { field: "headmasterTitle", label: "Jabatan kepala madrasah" },
    { field: "pembinaName", label: "Nama pembina pramuka" },
    { field: "pembinaTitle", label: "Jabatan pembina" },
  ];

  return (
    <>
      <PageHeading
        title="Data pangkalan"
        description="Nama sekolah dan penandatangan yang tercantum pada sertifikat."
      />
      <div className="notice" role="note">
        <CircleHelp aria-hidden="true" />
        <p>
          {isConnected
            ? "Perubahan penandatangan disimpan ke basis data kegiatan."
            : "Perubahan tersimpan di peramban ini sebagai data demo."}
        </p>
      </div>
      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <SectionHeading
          title="Tambah pangkalan"
          detail="Daftarkan sekolah sebelum membuat regu."
        />
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            void createSchool({
              name: newSchoolName.trim(),
              schoolType: newSchoolType,
              headmasterName: newHeadmaster.trim(),
              headmasterTitle: "Kepala Madrasah / Ka Mabigus",
              pembinaName: newPembina.trim(),
              pembinaTitle: "Pembina Pramuka",
            })
              .then(() => {
                setNewSchoolName("");
                setNewHeadmaster("");
                setNewPembina("");
                notify("Pangkalan berhasil ditambahkan.");
              })
              .catch((error: unknown) => {
                console.error("Gagal menambahkan pangkalan.", error);
                notify("Pangkalan gagal ditambahkan.", true);
              })
              .finally(() => setCreating(false));
          }}
        >
          <div className="school-fields">
            <label>
              <span className="field-label">Nama pangkalan</span>
              <input
                className="field"
                value={newSchoolName}
                onChange={(event) => setNewSchoolName(event.target.value)}
                required
              />
            </label>
            <label>
              <span className="field-label">Jenjang</span>
              <select
                className="field"
                value={newSchoolType}
                onChange={(event) =>
                  setNewSchoolType(event.target.value as School["schoolType"])
                }
              >
                <option value="MI">MI</option>
                <option value="MTs">MTs</option>
              </select>
            </label>
            <label>
              <span className="field-label">Kepala madrasah / Ka Mabigus</span>
              <input
                className="field"
                value={newHeadmaster}
                onChange={(event) => setNewHeadmaster(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Pembina pramuka</span>
              <input
                className="field"
                value={newPembina}
                onChange={(event) => setNewPembina(event.target.value)}
              />
            </label>
          </div>
          <button className="button button-small" type="submit" disabled={creating}>
            {creating ? "Menyimpan…" : "Tambah pangkalan"}
          </button>
        </form>
      </section>
      {data.schools.length ? (
      <div className="school-stack" style={{ marginTop: 16 }}>
        {data.schools.map((school) => {
          const teamCount = data.teams.filter(
            (team) => team.schoolId === school.id,
          ).length;
          return (
            <section className="school-card" key={school.id}>
              <div className="school-card-head">
                <div className="school-card-title">
                  <Landmark aria-hidden="true" />
                  <div>
                    <h2>{school.name}</h2>
                    <p>
                      {school.schoolType} · {teamCount} regu terdaftar
                    </p>
                  </div>
                </div>
                <span className="status-pill is-approved">
                  <CheckCircle2 aria-hidden="true" />
                  Data tersedia
                </span>
              </div>
              <div className="school-fields">
                {fieldConfig.map(({ field, label }) => (
                  <label key={field}>
                    <span className="field-label">{label}</span>
                    <input
                      className="field"
                      value={schoolDrafts[school.id]?.[field] ?? school[field]}
                      onChange={(event) =>
                        setSchoolDrafts((drafts) => ({
                          ...drafts,
                          [school.id]: {
                            ...drafts[school.id],
                            [field]: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="field-hint">
                Perubahan data penandatangan akan digunakan pada sertifikat baru.
              </p>
              <button
                className="button button-secondary button-small"
                onClick={() => {
                  void updateSchool(school.id, schoolDrafts[school.id] ?? {})
                    .then(() => {
                      setSchoolDrafts((drafts) => {
                        const next = { ...drafts };
                        delete next[school.id];
                        return next;
                      });
                      notify(`Data ${school.name} berhasil disimpan.`);
                    })
                    .catch((error: unknown) => {
                      console.error("Gagal menyimpan data pangkalan.", error);
                      notify("Data pangkalan gagal disimpan.", true);
                    });
                }}
                disabled={!schoolDrafts[school.id]}
              >
                <Check aria-hidden="true" />
                Simpan pangkalan
              </button>
            </section>
          );
        })}
      </div>
      ) : (
        <div className="empty-state">
          <Landmark aria-hidden="true" />
          <strong>Belum ada pangkalan</strong>
          <p>Tambahkan pangkalan untuk mulai membentuk regu.</p>
        </div>
      )}
      <div className="form-footer">
        <p className="inline-note">
          {isConnected ? "Data disimpan di Supabase." : "Data tersimpan di peramban."}
        </p>
        <button
          className="button button-secondary"
          onClick={() =>
            notify(
              isConnected
                ? "Periksa status simpan pada setiap pangkalan."
                : "Perubahan data pangkalan tersimpan di peramban ini.",
            )
          }
        >
          <Check aria-hidden="true" />
          Selesai
        </button>
      </div>
    </>
  );
}

function JuryScoring({ notify }: { notify: Notify }) {
  const { data, currentUserId, isConnected, updateScore } = useWorkspace();
  const judgeCompetitions = isConnected
    ? data.competitions.filter((competition) =>
        data.judgeAssignments.some(
          (assignment) =>
            assignment.juriId === currentUserId &&
            assignment.competitionId === competition.id,
        ),
      )
    : data.competitions;
  const [competitionId, setCompetitionId] = React.useState(
    judgeCompetitions[0]?.id ?? "",
  );
  const [scoreDrafts, setScoreDrafts] = React.useState<
    Record<string, { score: string; feedback: string }>
  >({});
  React.useEffect(() => {
    if (!judgeCompetitions.some((item) => item.id === competitionId)) {
      setCompetitionId(judgeCompetitions[0]?.id ?? "");
      setScoreDrafts({});
    }
  }, [competitionId, judgeCompetitions]);
  const competition = judgeCompetitions.find((item) => item.id === competitionId);

  const draftFor = (teamId: string) => {
    const saved = getScore(data.scores, teamId, competitionId);
    return (
      scoreDrafts[teamId] ?? {
        score: saved ? String(saved.score) : "",
        feedback: saved?.feedback ?? "",
      }
    );
  };

  const updateDraft = (
    teamId: string,
    property: "score" | "feedback",
    value: string,
  ) => {
    setScoreDrafts((drafts) => ({
      ...drafts,
      [teamId]: {
        ...draftFor(teamId),
        [property]: value,
      },
    }));
  };

  const save = async (teamId: string, status: ScoreStatus) => {
    const draft = draftFor(teamId);
    const value = Number(draft.score);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      notify("Masukkan nilai antara 0 sampai 100.", true);
      return;
    }
    try {
      await updateScore(teamId, competitionId, value, draft.feedback.trim(), status);
      notify(
        status === "pending_review"
          ? "Nilai dikirim ke operator untuk ditinjau."
          : "Draf nilai berhasil disimpan.",
      );
    } catch (error) {
      console.error("Gagal menyimpan nilai juri.", error);
      notify("Nilai gagal disimpan. Pastikan Anda ditugaskan pada mata lomba ini.", true);
    }
  };

  const selectedScores = data.scores.filter(
    (score) => score.competitionId === competitionId,
  );
  const pendingCount = selectedScores.filter(
    (score) => score.status === "pending_review",
  ).length;

  if (!judgeCompetitions.length) {
    return (
      <>
        <PageHeading
          title="Input nilai"
          description="Simpan draf atau kirim hasil penilaian regu ke operator."
        />
        <div className="empty-state">
          <ClipboardCheck aria-hidden="true" />
          <strong>Belum ada mata lomba yang ditugaskan</strong>
          <p>Minta operator menetapkan mata lomba untuk akun juri ini.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Input nilai"
        description="Simpan draf atau kirim hasil penilaian regu ke operator."
      />
      <section className="panel panel-pad">
        <div className="filter-row">
          <label className="field-label" htmlFor="jury-competition">
            Pos / mata lomba
          </label>
          <select
            id="jury-competition"
            className="filter-select"
            value={competitionId}
            onChange={(event) => {
              setCompetitionId(event.target.value);
              setScoreDrafts({});
            }}
          >
            {judgeCompetitions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <span className="role-chip">{pendingCount} nilai menunggu</span>
        </div>
        <SectionHeading
          title={competition?.title ?? "Pilih mata lomba"}
          detail={competition?.description}
        />
        <div className="notice" role="note">
          <CircleHelp aria-hidden="true" />
          <p>
            Nilai yang dikirim akan dikunci sementara sampai operator menyetujui
            atau meminta revisi.
          </p>
        </div>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Regu peserta</th>
                <th>Nilai (0–100)</th>
                <th>Catatan evaluasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((team) => {
                const school = data.schools.find(
                  (item) => item.id === team.schoolId,
                );
                const saved = getScore(data.scores, team.id, competitionId);
                const draft = draftFor(team.id);
                const disabled =
                  saved?.status === "pending_review" ||
                  saved?.status === "approved";
                return (
                  <tr key={team.id}>
                    <td>
                      <span className="table-primary">{team.name}</span>
                      <span className="table-secondary">
                        {school?.schoolType} · {team.category}
                      </span>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`score-${team.id}`}>
                        Nilai regu {team.name}
                      </label>
                      <input
                        id={`score-${team.id}`}
                        className="score-input"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        inputMode="decimal"
                        value={draft.score}
                        disabled={disabled}
                        onChange={(event) =>
                          updateDraft(team.id, "score", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`feedback-${team.id}`}>
                        Catatan evaluasi {team.name}
                      </label>
                      <input
                        id={`feedback-${team.id}`}
                        className="field"
                        value={draft.feedback}
                        placeholder="Catatan untuk regu"
                        disabled={disabled}
                        onChange={(event) =>
                          updateDraft(team.id, "feedback", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      {saved ? (
                        <StatusPill status={saved.status} />
                      ) : (
                        <StatusPill status="draft" />
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button-secondary button-small"
                          disabled={disabled}
                          onClick={() => void save(team.id, "draft")}
                        >
                          Simpan
                        </button>
                        <button
                          className="button button-small"
                          disabled={disabled}
                          onClick={() => void save(team.id, "pending_review")}
                        >
                          <Send aria-hidden="true" />
                          Kirim
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SwitchControl({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="toggle"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    />
  );
}

function CompetitionManagement({ notify }: { notify: Notify }) {
  const { data, createCompetition, assignJudge, removeJudgeAssignment } =
    useWorkspace();
  const [competitionId, setCompetitionId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedJudges, setSelectedJudges] = React.useState<
    Record<string, string>
  >({});
  const [taskType, setTaskType] =
    React.useState<Competition["taskType"]>("live");
  const [creating, setCreating] = React.useState(false);
  const [assignmentBusy, setAssignmentBusy] = React.useState(false);

  const updateTitle = (value: string) => {
    setTitle(value);
    setCompetitionId(
      value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  return (
    <>
      <PageHeading
        title="Mata lomba"
        description="Siapkan pos dan tugas sebelum peserta mulai mengerjakan."
      />
      <section className="panel panel-pad">
        <SectionHeading
          title="Tambah mata lomba"
          detail="ID akan menjadi bagian dari tautan tugas dan kode QR."
        />
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            void createCompetition({
              id: competitionId,
              title: title.trim(),
              description: description.trim(),
              taskType,
              isActive: false,
            })
              .then(() => {
                setCompetitionId("");
                setTitle("");
                setDescription("");
                notify("Mata lomba berhasil ditambahkan dalam status belum dirilis.");
              })
              .catch((error: unknown) => {
                console.error("Gagal menambahkan mata lomba.", error);
                notify("Mata lomba gagal ditambahkan. Periksa ID yang digunakan.", true);
              })
              .finally(() => setCreating(false));
          }}
        >
          <div className="school-fields">
            <label>
              <span className="field-label">Nama mata lomba</span>
              <input
                className="field"
                value={title}
                onChange={(event) => updateTitle(event.target.value)}
                required
              />
            </label>
            <label>
              <span className="field-label">ID tautan / QR</span>
              <input
                className="field"
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Gunakan huruf kecil, angka, dan tanda hubung."
                required
              />
            </label>
            <label>
              <span className="field-label">Jenis tugas</span>
              <select
                className="field"
                value={taskType}
                onChange={(event) =>
                  setTaskType(event.target.value as Competition["taskType"])
                }
              >
                <option value="live">Penilaian langsung</option>
                <option value="cbt">Tes berbasis komputer</option>
                <option value="upload">Unggah berkas / tautan</option>
              </select>
            </label>
            <label>
              <span className="field-label">Petunjuk singkat</span>
              <input
                className="field"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
          <button className="button button-small" type="submit" disabled={creating}>
            {creating ? "Menyimpan…" : "Tambah mata lomba"}
          </button>
        </form>
      </section>
      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <SectionHeading
          title="Daftar mata lomba"
          detail={`${data.competitions.length} mata lomba`}
        />
        {data.competitions.length ? (
          <div className="activity-list">
            {data.competitions.map((competition) => (
              <div className="activity-row" key={competition.id}>
                <span className="activity-copy">
                  <strong>{competition.title}</strong>
                  <span>
                    {competition.id} ·{" "}
                    {competition.taskType === "live"
                      ? "Langsung"
                      : competition.taskType === "cbt"
                        ? "CBT"
                        : "Unggah"}
                  </span>
                </span>
                <span
                  className={`status-pill${competition.isActive ? " is-approved" : ""}`}
                >
                  {competition.isActive ? "Dirilis" : "Belum dirilis"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Flag aria-hidden="true" />
            <strong>Belum ada mata lomba</strong>
            <p>Tambahkan mata lomba untuk mulai menyiapkan kegiatan.</p>
          </div>
        )}
      </section>
      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <SectionHeading
          title="Penugasan juri"
          detail="Tentukan mata lomba yang dapat dinilai setiap juri."
        />
        {!data.judges.length ? (
          <div className="empty-state">
            <Users aria-hidden="true" />
            <strong>Belum ada akun juri</strong>
            <p>
              Daftarkan akun, lalu tetapkan rolenya sebagai juri melalui SQL
              Editor Supabase.
            </p>
          </div>
        ) : !data.competitions.length ? (
          <p className="inline-note">
            Tambahkan mata lomba sebelum menetapkan juri.
          </p>
        ) : (
          <div className="activity-list">
            {data.competitions.map((competition) => {
              const assigned = data.judgeAssignments.filter(
                (assignment) => assignment.competitionId === competition.id,
              );
              const assignedIds = new Set(assigned.map((item) => item.juriId));
              const availableJudges = data.judges.filter(
                (judge) => !assignedIds.has(judge.id),
              );
              const selectedJudge = availableJudges.some(
                (judge) => judge.id === selectedJudges[competition.id],
              )
                ? selectedJudges[competition.id]
                : (availableJudges[0]?.id ?? "");
              return (
                <div className="activity-row" key={competition.id}>
                  <span className="activity-copy">
                    <strong>{competition.title}</strong>
                    <span>
                      {assigned.length
                        ? assigned
                            .map(
                              (assignment) =>
                                data.judges.find(
                                  (judge) => judge.id === assignment.juriId,
                                )?.name,
                            )
                            .filter(Boolean)
                            .join(", ")
                        : "Belum ada juri yang ditugaskan"}
                    </span>
                    {assigned.map((assignment) => {
                      const judge = data.judges.find(
                        (item) => item.id === assignment.juriId,
                      );
                      return (
                        <button
                          className="text-link"
                          disabled={assignmentBusy}
                          key={assignment.id}
                          onClick={() => {
                            setAssignmentBusy(true);
                            void removeJudgeAssignment(assignment.id)
                              .then(() =>
                                notify(
                                  `Penugasan ${judge?.name ?? "juri"} dihapus.`,
                                ),
                              )
                              .catch((error: unknown) => {
                                console.error("Gagal menghapus penugasan juri.", error);
                                notify("Penugasan juri gagal dihapus.", true);
                              })
                              .finally(() => setAssignmentBusy(false));
                          }}
                        >
                          Hapus {judge?.name ?? "juri"}
                        </button>
                      );
                    })}
                  </span>
                  <div className="form-row">
                    <select
                      aria-label={`Pilih juri untuk ${competition.title}`}
                      className="field"
                      disabled={!availableJudges.length || assignmentBusy}
                      value={selectedJudge}
                      onChange={(event) =>
                        setSelectedJudges((current) => ({
                          ...current,
                          [competition.id]: event.target.value,
                        }))
                      }
                    >
                      {availableJudges.length ? (
                        availableJudges.map((judge) => (
                          <option key={judge.id} value={judge.id}>
                            {judge.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Semua juri sudah ditugaskan</option>
                      )}
                    </select>
                    <button
                      className="button button-small"
                      disabled={!selectedJudge || assignmentBusy}
                      onClick={() => {
                        setAssignmentBusy(true);
                        void assignJudge(selectedJudge, competition.id)
                          .then(() => notify("Juri berhasil ditugaskan."))
                          .catch((error: unknown) => {
                            console.error("Gagal menetapkan juri.", error);
                            notify("Juri gagal ditugaskan.", true);
                          })
                          .finally(() => setAssignmentBusy(false));
                      }}
                    >
                      Tugaskan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function PublicationSettings({ notify }: { notify: Notify }) {
  const {
    data,
    setLeaderboardPublished,
    setCertificatesPublished,
  } = useWorkspace();
  const allApproved =
    data.teams.length > 0 &&
    data.competitions.length > 0 &&
    data.teams.every((team) =>
      data.competitions.every(
        (competition) =>
          getScore(data.scores, team.id, competition.id)?.status === "approved",
      ),
    );
  return (
    <>
      <PageHeading
        title="Papan skor & sertifikat"
        description="Atur kapan peringkat dan sertifikat dapat diakses peserta."
      />
      <div className="content-grid">
        <section className="panel panel-pad">
          <SectionHeading
            title="Akses publik"
            detail="Perubahan berlaku untuk seluruh peserta dalam kegiatan."
          />
          <div className="toggle-row">
            <span className="toggle-copy">
              <strong>Papan skor publik</strong>
              <span>
                {data.leaderboardPublished
                  ? "Peserta dapat melihat total nilai yang sudah disahkan."
                  : "Peringkat hanya terlihat oleh operator."}
              </span>
            </span>
            <SwitchControl
              checked={data.leaderboardPublished}
              label="Rilis papan skor publik"
              onChange={() => {
                void setLeaderboardPublished(!data.leaderboardPublished)
                  .then(() => notify("Pengaturan leaderboard berhasil disimpan."))
                  .catch((error: unknown) => {
                    console.error("Gagal mengubah publikasi leaderboard.", error);
                    notify("Pengaturan leaderboard gagal disimpan.", true);
                  });
              }}
            />
          </div>
          <div className="toggle-row">
            <span className="toggle-copy">
              <strong>Akses unduh sertifikat</strong>
              <span>
                {allApproved
                  ? "Semua nilai regu sudah disahkan."
                  : "Sertifikat peserta terbuka setelah seluruh nilai regu disahkan."}
              </span>
            </span>
            <SwitchControl
              checked={data.certificatesPublished}
              label="Buka unduhan sertifikat"
              disabled={!allApproved && !data.certificatesPublished}
              onChange={() => {
                void setCertificatesPublished(!data.certificatesPublished)
                  .then(() => notify("Pengaturan sertifikat berhasil disimpan."))
                  .catch((error: unknown) => {
                    console.error("Gagal mengubah publikasi sertifikat.", error);
                    notify("Pengaturan sertifikat gagal disimpan.", true);
                  });
              }}
            />
          </div>
        </section>
        <section className="panel panel-pad">
          <SectionHeading title="Status verifikasi" />
          <div className="activity-list">
            <div className="activity-row">
              <span className="activity-copy">
                <strong>Nilai disahkan</strong>
                <span>
                  {data.scores.filter((score) => score.status === "approved").length}{" "}
                  dari {data.scores.length} catatan nilai
                </span>
              </span>
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="activity-row">
              <span className="activity-copy">
                <strong>Menunggu tinjauan</strong>
                <span>
                  {data.scores.filter((score) => score.status === "pending_review").length}{" "}
                  catatan dari juri
                </span>
              </span>
              <Clock3 size={18} aria-hidden="true" />
            </div>
            <div className="activity-row">
              <span className="activity-copy">
                <strong>Perlu revisi</strong>
                <span>
                  {data.scores.filter((score) => score.status === "revision_needed").length}{" "}
                  catatan dikembalikan
                </span>
              </span>
              <MessageSquareText size={18} aria-hidden="true" />
            </div>
          </div>
          <div style={{ marginTop: 17 }}>
            <Link className="text-link" href="/operator/scores">
              Buka antrean nilai <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
      <div className="notice" style={{ marginTop: 18 }} role="note">
        <CircleHelp aria-hidden="true" />
        <p>
          Penerbitan pada demo ini hanya mengubah status di peramban. Tautan
          verifikasi belum menggunakan Supabase atau tanda tangan elektronik.
        </p>
      </div>
    </>
  );
}

function TeamManagement({ notify }: { notify: Notify }) {
  const { data, assignParticipants, createTeam } = useWorkspace();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [targetTeam, setTargetTeam] = React.useState(data.teams[0]?.id ?? "");
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamCategory, setNewTeamCategory] =
    React.useState<Team["category"]>("Putra");
  const [newTeamSchool, setNewTeamSchool] = React.useState(
    data.schools[0]?.id ?? "",
  );
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const visibleParticipants = data.participants.filter((participant) => {
    const team = getTeam(data, participant.teamId);
    return `${participant.name} ${team?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const allVisibleSelected =
    visibleParticipants.length > 0 &&
    visibleParticipants.every((person) => selectedIds.includes(person.id));

  const togglePerson = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleParticipants.map((person) => person.id));
      setSelectedIds((ids) => ids.filter((id) => !visibleIds.has(id)));
    } else {
      setSelectedIds((ids) =>
        Array.from(
          new Set([...ids, ...visibleParticipants.map((person) => person.id)]),
        ),
      );
    }
  };

  const assign = async () => {
    if (!selectedIds.length) {
      notify("Pilih minimal satu peserta untuk dipetakan.", true);
      return;
    }
    try {
      await assignParticipants(selectedIds, targetTeam);
      notify(`${selectedIds.length} peserta dipetakan ke Regu ${getTeam(data, targetTeam)?.name}.`);
      setSelectedIds([]);
    } catch (error) {
      console.error("Gagal memetakan peserta ke regu.", error);
      notify("Pemetaan peserta gagal disimpan.", true);
    }
  };

  return (
    <>
      <PageHeading
        title="Regu & peserta"
        description="Petakan anggota terdaftar ke regu dan pangkalan yang sesuai."
        actions={
          <>
            <label className="sr-only" htmlFor="target-team">
              Regu tujuan
            </label>
            <select
              id="target-team"
              className="filter-select"
              value={targetTeam}
              disabled={!data.teams.length}
              onChange={(event) => setTargetTeam(event.target.value)}
            >
              {data.teams.map((team) => (
                <option value={team.id} key={team.id}>
                  Regu {team.name}
                </option>
              ))}
            </select>
            <button
              className="button button-small"
              disabled={!selectedIds.length}
              onClick={() => void assign()}
            >
              Petakan {selectedIds.length || ""}
            </button>
          </>
        }
      />
      <section className="panel panel-pad" style={{ marginBottom: 18 }}>
        <SectionHeading
          title="Tambah regu"
          detail="Pilih pangkalan dan kategori untuk regu baru."
        />
        {data.schools.length ? (
          <form
            className="form-row"
            onSubmit={(event) => {
              event.preventDefault();
              setCreating(true);
              void createTeam({
                name: newTeamName.trim(),
                category: newTeamCategory,
                schoolId: newTeamSchool,
              })
                .then(() => {
                  setNewTeamName("");
                  notify("Regu berhasil ditambahkan.");
                })
                .catch((error: unknown) => {
                  console.error("Gagal menambahkan regu.", error);
                  notify("Regu gagal ditambahkan.", true);
                })
                .finally(() => setCreating(false));
            }}
          >
            <label>
              <span className="field-label">Nama regu</span>
              <input
                className="field"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                required
              />
            </label>
            <label>
              <span className="field-label">Kategori</span>
              <select
                className="field"
                value={newTeamCategory}
                onChange={(event) =>
                  setNewTeamCategory(event.target.value as Team["category"])
                }
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </label>
            <label>
              <span className="field-label">Pangkalan</span>
              <select
                className="field"
                value={newTeamSchool}
                onChange={(event) => setNewTeamSchool(event.target.value)}
              >
                {data.schools.map((school) => (
                  <option value={school.id} key={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button-small" type="submit" disabled={creating}>
              {creating ? "Menyimpan…" : "Tambah regu"}
            </button>
          </form>
        ) : (
          <p className="inline-note">
            Tambahkan pangkalan terlebih dahulu pada menu Pangkalan.
          </p>
        )}
      </section>
      <div className="filter-row">
        <div className="search-control">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="participant-search">
            Cari nama peserta atau regu
          </label>
          <input
            id="participant-search"
            className="field"
            value={search}
            placeholder="Cari nama peserta atau regu"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="role-chip">{visibleParticipants.length} peserta</span>
      </div>
      <section className="panel panel-pad">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="check-cell">
                  <input
                    className="member-select"
                    type="checkbox"
                    aria-label="Pilih semua peserta yang terlihat"
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                  />
                </th>
                <th>Peserta</th>
                <th>Regu saat ini</th>
                <th>Pangkalan</th>
                <th>Peran</th>
              </tr>
            </thead>
            <tbody>
              {visibleParticipants.map((person) => {
                const team = getTeam(data, person.teamId);
                const school = data.schools.find(
                  (item) => item.id === team?.schoolId,
                );
                return (
                  <tr key={person.id}>
                    <td>
                      <input
                        className="member-select"
                        type="checkbox"
                        aria-label={`Pilih ${person.name}`}
                        checked={selectedIds.includes(person.id)}
                        onChange={() => togglePerson(person.id)}
                      />
                    </td>
                    <td>
                      <span className="table-primary">{person.name}</span>
                      <span className="table-secondary">{person.id}</span>
                    </td>
                    <td>{team?.name ?? "Belum dipetakan"}</td>
                    <td>{school?.schoolType ?? "—"}</td>
                    <td>
                      <span className="role-chip">
                        {person.isPinru ? "Pinru" : "Anggota"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function EventCoordination({ notify }: { notify: Notify }) {
      const { data, setAttendance, setCompetitionActive, isConnected } = useWorkspace();
      const [competitionId, setCompetitionId] = React.useState(
        data.competitions[0]?.id ?? "",
      );
      const competition = getCompetition(data, competitionId);
      const attendedCount = data.teams.filter(
        (team) => data.attendance[`${team.id}:${competitionId}`],
      ).length;
      const updateCompetitionState = async () => {
        if (!competition) return;
        try {
          await setCompetitionActive(competition.id, !competition.isActive);
          notify(
            competition.isActive
              ? `${competition.title} dihentikan.`
              : `${competition.title} dirilis untuk peserta.`,
          );
        } catch (error) {
          console.error("Gagal mengubah status mata lomba.", error);
          notify("Status mata lomba gagal disimpan.", true);
        }
      };
      const toggleAttendance = async (
        teamId: string,
        present: boolean,
        teamName: string,
      ) => {
        try {
          await setAttendance(teamId, competitionId, !present);
        } catch (error) {
          console.error("Gagal menyimpan kehadiran regu.", error);
          notify(`Kehadiran Regu ${teamName} gagal disimpan.`, true);
        }
      };

      return (
        <>
          <PageHeading
            title="Pos kegiatan"
            description="Atur tugas yang sedang berjalan dan catat kehadiran tiap regu."
          />
          <section className="panel panel-pad">
            <div className="filter-row">
              <label className="field-label" htmlFor="event-competition">
                Pos / mata lomba
              </label>
              <select
                id="event-competition"
                className="filter-select"
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
              >
                {data.competitions.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {competition ? (
                <button
                  className={`button button-small${competition.isActive ? " button-secondary" : ""}`}
                  onClick={() => void updateCompetitionState()}
                >
                  <Flag aria-hidden="true" />
                  {competition.isActive ? "Tugas dirilis" : "Rilis tugas"}
                </button>
              ) : null}
            </div>
            <SectionHeading
              title={competition?.title ?? "Pilih mata lomba"}
              detail={competition?.description}
              action={
                <span className="role-chip">
                  {attendedCount} dari {data.teams.length} regu hadir
                </span>
              }
            />
            {!isConnected ? (
              <div className="notice" role="note">
                <CircleHelp aria-hidden="true" />
                <p>
                  Status kehadiran disimpan pada perangkat ini selama pratinjau.
                  Data absensi belum dikirim ke basis data.
                </p>
              </div>
            ) : null}
            <div className="activity-list" style={{ marginTop: 10 }}>
              {data.teams.map((team) => {
                const present = Boolean(
                  data.attendance[`${team.id}:${competitionId}`],
                );
                const school = data.schools.find(
                  (item) => item.id === team.schoolId,
                );
                const score = getScore(data.scores, team.id, competitionId);
                return (
                  <div className="activity-row" key={team.id}>
                    <span className="activity-copy">
                      <strong>Regu {team.name}</strong>
                      <span>
                        {school?.schoolType} · {team.category} ·{" "}
                        {score ? "Tugas sudah dinilai" : "Menunggu tugas"}
                      </span>
                    </span>
                    <div className="team-members-inline">
                      {present ? (
                        <span className="status-pill is-approved">
                          <CheckCircle2 aria-hidden="true" />
                          Hadir
                        </span>
                      ) : (
                        <span className="attendance-count">Belum hadir</span>
                      )}
                      <button
                        className={`button button-small${present ? " button-secondary" : ""}`}
                        onClick={() =>
                          void toggleAttendance(team.id, present, team.name)
                        }
                        aria-label={`${present ? "Batalkan kehadiran" : "Catat kehadiran"} Regu ${team.name}`}
                      >
                        {present ? "Batalkan" : "Catat hadir"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      );
    }

    function SubmissionPage({
      competitionId,
      notify,
    }: {
      competitionId: string;
      notify: Notify;
    }) {
      const { data, submitWork, currentUserId, isConnected } = useWorkspace();
      const router = useRouter();
      const currentParticipant = data.participants.find(
        (person) => person.id === currentUserId,
      );
      const currentTeamId =
        currentParticipant?.teamId ?? (isConnected ? "" : CURRENT_TEAM_ID);
      const competition = getCompetition(data, competitionId);
      const [url, setUrl] = React.useState(
        data.submissions[competitionId]?.url ?? "",
      );
      const [answers, setAnswers] = React.useState<Record<number, string>>({});
      const [fileName, setFileName] = React.useState("");
      const submission = data.submissions[competitionId];
      const existingScore = getScore(data.scores, currentTeamId, competitionId);

      if (!competition) {
        return (
          <>
            <PageHeading
              title="Mata lomba tidak ditemukan"
              description="Tautan ini tidak mengarah ke tugas yang tersedia."
            />
            <Link className="button button-secondary" href="/dashboard">
              Kembali ke dashboard
            </Link>
          </>
        );
      }

      const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!competition.isActive) {
          notify("Tugas ini belum dirilis panitia.", true);
          return;
        }
        if (competition.taskType === "cbt" && Object.keys(answers).length < 3) {
          notify("Jawab semua pertanyaan sebelum mengirim tugas.", true);
          return;
        }
        if (competition.taskType === "upload" && !url.trim() && !fileName) {
          notify("Tambahkan tautan berkas atau pilih nama berkas.", true);
          return;
        }
        const savedValue =
          competition.taskType === "cbt"
            ? `cbt:${Object.keys(answers).length}-jawaban`
            : url.trim() || `demo-file:${fileName}`;
        try {
          await submitWork(competition.id, savedValue);
          notify(
            isConnected
              ? "Tugas berhasil dikirim ke basis data kegiatan."
              : "Tugas berhasil dikirim pada data demo.",
          );
        } catch (error) {
          console.error("Gagal mengirim tugas peserta.", error);
          notify(
            error instanceof Error ? error.message : "Tugas gagal dikirim.",
            true,
          );
        }
      };

      const taskTypeCopy: Record<Competition["taskType"], string> = {
        cbt: "Tes berbasis komputer",
        upload: "Unggah hasil atau tautan",
        live: "Penilaian langsung di pos",
      };

      return (
        <>
          <PageHeading
            title={competition.title}
            description="Kerjakan tugas regu dan kirim sebelum batas waktu."
            actions={
              <Link className="button button-secondary" href="/dashboard">
                Kembali
              </Link>
            }
          />
          <div className="submit-layout">
            <section className="panel panel-pad">
              <div className="submission-type">
                {competition.taskType === "cbt" ? (
                  <BookOpen aria-hidden="true" />
                ) : competition.taskType === "upload" ? (
                  <FileText aria-hidden="true" />
                ) : (
                  <Flag aria-hidden="true" />
                )}
                {taskTypeCopy[competition.taskType]}
              </div>
              <p className="submission-instructions">{competition.description}</p>
              {!competition.isActive ? (
                <div className="notice" role="status">
                  <Clock3 aria-hidden="true" />
                  <p>Panitia belum merilis tugas ini. Coba kembali setelah ada pengumuman.</p>
                </div>
              ) : (
                <form className="form-stack" onSubmit={submit}>
                  {competition.taskType === "cbt" ? (
                    <div className="form-stack">
                      {[
                        {
                          prompt: "Simpul untuk menyambung dua tali sama besar adalah …",
                          options: ["Simpul mati", "Simpul pangkal", "Simpul tiang"],
                        },
                        {
                          prompt: "Semboyan Gerakan Pramuka adalah …",
                          options: [
                            "Satyaku Kudarmakan",
                            "Ikhlas Bakti Bina Bangsa",
                            "Siap Sedia",
                          ],
                        },
                        {
                          prompt: "Arah mata angin di antara utara dan timur adalah …",
                          options: ["Barat laut", "Timur laut", "Tenggara"],
                        },
                      ].map((question, index) => (
                        <fieldset className="quiz-question" key={question.prompt}>
                          <legend>
                            <strong>{index + 1}.</strong> {question.prompt}
                          </legend>
                          <div className="quiz-options">
                            {question.options.map((option) => (
                              <label className="quiz-option" key={option}>
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value={option}
                                  checked={answers[index] === option}
                                  onChange={() =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [index]: option,
                                    }))
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  ) : competition.taskType === "upload" ? (
                    <>
                      <label>
                        <span className="field-label">Tautan hasil tugas</span>
                        <input
                          className="field"
                          type="url"
                          placeholder="https://drive.google.com/…"
                          value={url.startsWith("demo-file:") ? "" : url}
                          onChange={(event) => setUrl(event.target.value)}
                        />
                        <span className="field-hint">
                          Gunakan tautan Google Drive atau YouTube Unlisted yang
                          dapat dibuka panitia.
                        </span>
                      </label>
                      <label>
                        <span className="field-label">Atau pilih foto hasil</span>
                        <input
                          className="field"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              setFileName("");
                              notify("Ukuran foto maksimal 2 MB.", true);
                              event.target.value = "";
                              return;
                            }
                            setFileName(file.name);
                          }}
                        />
                        <span className="field-hint">
                          Maksimum 2 MB. Pratinjau ini mencatat nama berkas saja,
                          bukan mengunggah isi berkas.
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="submission-status">
                      <CalendarCheck aria-hidden="true" />
                      <span>
                        <strong>Penilaian dilakukan langsung di pos</strong>
                        <span>
                          Minta panitia mencatat kehadiran sebelum juri menilai.
                        </span>
                      </span>
                    </div>
                  )}
                  {competition.taskType === "live" ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        if (data.attendance[`${currentTeamId}:${competition.id}`]) {
                          void submitWork(competition.id, "pos:hadir")
                            .then(() =>
                              notify(
                                isConnected
                                  ? "Kehadiran regu berhasil dikonfirmasi."
                                  : "Kehadiran regu dikonfirmasi pada pratinjau.",
                              ),
                            )
                            .catch((error: unknown) => {
                              console.error("Gagal mengonfirmasi kehadiran regu.", error);
                              notify("Kehadiran regu gagal dikonfirmasi.", true);
                            });
                        } else {
                          notify("Panitia perlu mencatat kehadiran regumu terlebih dahulu.", true);
                        }
                      }}
                    >
                      <Check aria-hidden="true" />
                      Konfirmasi kehadiran
                    </button>
                  ) : (
                    <button className="button" type="submit">
                      <Send aria-hidden="true" />
                      Kirim tugas
                    </button>
                  )}
                </form>
              )}
            </section>
            <aside className="dashboard-column">
              <section className="panel panel-pad">
                <SectionHeading title="Status pengumpulan" />
                <div className="activity-list">
                  <div className="activity-row">
                    <span className="activity-copy">
                      <strong>Regu</strong>
                      <span>{getTeam(data, currentTeamId)?.name}</span>
                    </span>
                    <Users size={18} aria-hidden="true" />
                  </div>
                  <div className="activity-row">
                    <span className="activity-copy">
                      <strong>Status tugas</strong>
                      <span>{submission?.submitted ? "Sudah dikirim" : "Belum dikirim"}</span>
                    </span>
                    {submission?.submitted ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : (
                      <Clock3 size={18} aria-hidden="true" />
                    )}
                  </div>
                  <div className="activity-row">
                    <span className="activity-copy">
                      <strong>Penilaian juri</strong>
                      <span>
                        {existingScore
                          ? existingScore.status === "approved"
                            ? `${existingScore.score} poin disahkan`
                            : existingScore.status === "pending_review"
                              ? "Menunggu tinjauan operator"
                              : existingScore.status === "revision_needed"
                                ? "Juri diminta meninjau ulang"
                                : "Draf juri"
                          : "Belum dinilai"}
                      </span>
                    </span>
                    <ClipboardCheck size={18} aria-hidden="true" />
                  </div>
                </div>
              </section>
              <div className="notice" role="note">
                <CircleHelp aria-hidden="true" />
                <p>
                  Jawaban pada halaman ini adalah data pratinjau. Data tidak
                  terkirim ke panitia atau Supabase.
                </p>
              </div>
              <button
                className="button button-secondary"
                onClick={() => router.push("/dashboard")}
              >
                Kembali ke dashboard
              </button>
            </aside>
          </div>
        </>
      );
    }

    function VerificationPage({ userId }: { userId: string }) {
      const { data, isConnected } = useWorkspace();
      const [certificate, setCertificate] =
        React.useState<PublicCertificate | null>(null);
      const [verificationState, setVerificationState] = React.useState<
        "loading" | "ready" | "error"
      >(isConnected ? "loading" : "ready");
      const [retryCount, setRetryCount] = React.useState(0);
      const demoParticipant = data.participants.find(
        (person) => person.id === CURRENT_PARTICIPANT_ID,
      );
      const participant = isConnected
        ? certificate?.participant
        : demoParticipant;
      const team = isConnected
        ? certificate?.team
        : demoParticipant
          ? getTeam(data, demoParticipant.teamId)
          : getTeam(data, CURRENT_TEAM_ID);
      const school = isConnected
        ? certificate?.school
        : data.schools.find((item) => item.id === team?.schoolId);
      const teamScores = certificate
        ? certificate.scores.map((score) => ({
            id: score.id,
            teamId: certificate.team.id,
            competitionId: score.competitionId,
            score: score.score,
            status: "approved" as const,
            feedback: "",
          }))
        : data.competitions.map((competition) =>
            team ? getScore(data.scores, team.id, competition.id) : undefined,
          );
      const allApproved =
        teamScores.length > 0 &&
        teamScores.every((score) => score?.status === "approved");
      const isKnownUser = isConnected
        ? certificate?.userId === userId
        : userId === CURRENT_USER_ID && Boolean(demoParticipant);
      const [fingerprint, setFingerprint] = React.useState("Menghitung sidik data…");
      const scoreTotal = teamScores.reduce(
        (total, score) =>
          total + (score?.status === "approved" ? score.score : 0),
        0,
      );
      const average = allApproved
        ? (scoreTotal / teamScores.length).toFixed(1)
        : "—";

      React.useEffect(() => {
        if (!isConnected) {
          setVerificationState("ready");
          return;
        }
        let active = true;
        setVerificationState("loading");
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setVerificationState("error");
          return () => {
            active = false;
          };
        }
        void (async () => {
          try {
            const { data: result, error } = await supabase.rpc(
              "get_public_certificate",
              { target_user_id: userId },
            );
            if (!active) return;
            if (error) {
              console.error("Gagal memverifikasi sertifikat melalui Supabase.", error);
              setCertificate(null);
              setVerificationState("error");
              return;
            }
            if (result === null) {
              setCertificate(null);
              setVerificationState("ready");
              return;
            }
            const parsed = parsePublicCertificate(result);
            if (!parsed || parsed.userId !== userId) {
              console.error("Respons verifikasi sertifikat tidak valid.");
              setCertificate(null);
              setVerificationState("error");
              return;
            }
            setCertificate(parsed);
            setVerificationState("ready");
          } catch (error: unknown) {
            console.error("Permintaan verifikasi sertifikat gagal.", error);
            if (!active) return;
            setCertificate(null);
            setVerificationState("error");
          }
        })();
        return () => {
          active = false;
        };
      }, [isConnected, retryCount, userId]);

      const fingerprintSource = JSON.stringify({
        userId,
        name: participant?.name,
        team: team?.name,
        school: school?.name,
        scores: teamScores.map((score) => ({
          score: score?.score ?? null,
          status: score?.status ?? "missing",
        })),
      });

      React.useEffect(() => {
        let active = true;
        void window.crypto.subtle
          .digest("SHA-256", new TextEncoder().encode(fingerprintSource))
          .then((digest) => {
            if (!active) return;
            const hex = Array.from(new Uint8Array(digest))
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
            setFingerprint(`sha256:${hex}`);
          })
          .catch((error: unknown) => {
            console.error("Gagal menghitung sidik data sertifikat.", error);
            if (active) setFingerprint("Sidik data tidak dapat dihitung.");
          });
        return () => {
          active = false;
        };
      }, [fingerprintSource]);

      if (isConnected && verificationState === "loading") {
        return (
          <main className="verify-page">
            <div className="verify-wrap">
              <div className="verify-brand">
                <Logo />
              </div>
              <section className="verify-card" aria-live="polite">
                <div className="verify-head">
                  <span className="verify-status is-pending">
                    <Clock3 aria-hidden="true" />
                    Memeriksa sertifikat
                  </span>
                  <h1>Memeriksa data penerbit</h1>
                  <p>Data sertifikat sedang dicocokkan dengan catatan kegiatan.</p>
                </div>
              </section>
            </div>
          </main>
        );
      }

      if (isConnected && verificationState === "error") {
        return (
          <main className="verify-page">
            <div className="verify-wrap">
              <div className="verify-brand">
                <Logo />
              </div>
              <section className="verify-card" aria-live="polite">
                <div className="verify-head">
                  <span className="verify-status is-pending">
                    <CircleHelp aria-hidden="true" />
                    Pemeriksaan gagal
                  </span>
                  <h1>Sertifikat belum dapat diperiksa</h1>
                  <p>Periksa koneksi, lalu coba lagi.</p>
                </div>
                <div className="verify-body">
                  <button
                    className="button button-secondary"
                    onClick={() => setRetryCount((count) => count + 1)}
                  >
                    Coba lagi
                  </button>
                </div>
              </section>
            </div>
          </main>
        );
      }

      if (!isKnownUser || !participant || !team || !school) {
        return (
          <main className="verify-page">
            <div className="verify-wrap">
              <div className="verify-brand">
                <Logo />
              </div>
              <section className="verify-card">
                <div className="verify-head">
                  <span className="verify-status is-pending">
                    <CircleHelp aria-hidden="true" />
                    ID tidak ditemukan
                  </span>
                  <h1>Sertifikat tidak terdaftar</h1>
                  <p>
                    ID tidak ditemukan atau sertifikat belum diterbitkan. Periksa
                    kembali tautan atau hubungi operator kegiatan.
                  </p>
                </div>
                <div className="verify-body">
                  <Link className="button button-secondary" href="/dashboard">
                    Kembali ke ruang lomba
                  </Link>
                </div>
              </section>
            </div>
          </main>
        );
      }

      const verified = isConnected
        ? Boolean(certificate)
        : allApproved && data.certificatesPublished;
      const issuedAt = certificate?.issuedAt ?? data.certificatesPublishedAt;
      return (
        <main className="verify-page">
          <div className="verify-wrap">
            <div className="verify-brand">
              <Logo />
            </div>
            <section className="verify-card">
              <div className="verify-head">
                <span className={`verify-status${verified ? "" : " is-pending"}`}>
                  {verified ? (
                    <ShieldCheck aria-hidden="true" />
                  ) : (
                    <Clock3 aria-hidden="true" />
                  )}
                  {verified ? "VALID · TERVERIFIKASI" : "BELUM DITERBITKAN"}
                </span>
                <h1>Sertifikat Penghargaan LT-1</h1>
                <p>Gerakan Pramuka Islamiyah · Periode 2026</p>
              </div>
              <div className="verify-body">
                <div className="verify-person">
                  <div>
                    <h2>{participant.name}</h2>
                    <p>
                      Regu {team.name} · {team.category} · {school.name}
                    </p>
                  </div>
                  <div className="verify-score">
                    <strong>{verified ? scoreTotal : "—"}</strong>
                    <span>total poin disahkan</span>
                  </div>
                </div>
                <div className="verify-details">
                  <div className="verify-detail">
                    <span>Pangkalan</span>
                    <strong>{school.name}</strong>
                  </div>
                  <div className="verify-detail">
                    <span>Rata-rata nilai</span>
                    <strong>{average}</strong>
                  </div>
                  <div className="verify-detail">
                    <span>Pembina pramuka</span>
                    <strong>{school.pembinaName}</strong>
                  </div>
                  <div className="verify-detail">
                    <span>Kepala madrasah / Ka Mabigus</span>
                    <strong>{school.headmasterName}</strong>
                  </div>
                  <div className="verify-detail">
                    <span>Tanggal terbit</span>
                    <strong>
                      {verified && issuedAt
                        ? new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }).format(new Date(issuedAt))
                        : "Belum diterbitkan"}
                    </strong>
                  </div>
                  <div className="verify-detail">
                    <span>ID dokumen</span>
                    <strong>LT1-2026-{participant.id.toUpperCase()}</strong>
                  </div>
                </div>
                <div className="verify-fingerprint">
                  <span>
                    Fingerprint tampilan SHA-256 · bukan tanda tangan elektronik
                  </span>
                  <code>{fingerprint}</code>
                </div>
                <p className="verify-footnote">
                  {isConnected
                    ? "Status valid berasal dari catatan nilai yang disahkan dan tanggal penerbitan di Supabase. Fingerprint tampilan bukan tanda tangan elektronik."
                    : "Halaman ini adalah pratinjau lokal. Fingerprint hanya membantu membandingkan data demo dan bukan bukti keaslian untuk keperluan resmi."}
                </p>
                <div style={{ marginTop: 18 }}>
                  <Link className="text-link" href="/dashboard">
                    Kembali ke ruang lomba <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </main>
      );
    }

    function AuthPage({ register = false }: { register?: boolean }) {
      const router = useRouter();
      const { isConnected, signIn, signUp } = useWorkspace();
      const [name, setName] = React.useState("");
      const [email, setEmail] = React.useState("");
      const [password, setPassword] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [errorMessage, setErrorMessage] = React.useState("");
      const [confirmationRequired, setConfirmationRequired] = React.useState(false);
      const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setErrorMessage("");
        try {
          if (!isConnected) {
            router.push("/dashboard");
            return;
          }
          if (register) {
            const signedIn = await signUp(name, email, password);
            if (signedIn) router.push("/dashboard");
            else setConfirmationRequired(true);
          } else {
            await signIn(email, password);
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Autentikasi Supabase gagal.", error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Autentikasi gagal. Periksa kembali data akun Anda.",
          );
        } finally {
          setBusy(false);
        }
      };
      return (
        <main className="auth-page">
          <section className="auth-story">
            <Logo light />
            <div className="auth-story-content">
              <h1>Setiap regu punya cerita untuk dituntaskan.</h1>
              <p>
                Satu ruang untuk tugas, penilaian, lencana, dan sertifikat Lomba
                Tingkat 1 Pramuka Islamiyah.
              </p>
            </div>
            <p className="auth-story-foot">
              {isConnected
                ? "Akun dan data kegiatan terhubung ke Supabase."
                : "Mode pratinjau lokal · Supabase belum dikonfigurasi"}
            </p>
          </section>
          <section className="auth-main">
            <form className="auth-card" onSubmit={submit}>
              <h2>{register ? "Daftar peserta" : "Masuk ke Ruang LT-1"}</h2>
              <p>
                {register
                  ? "Buat akun peserta dengan email dan kata sandi."
                  : isConnected
                    ? "Masuk dengan akun peserta atau petugas yang terdaftar."
                    : "Buka pratinjau lokal untuk menjelajahi dashboard."}
              </p>
              <div className="form-stack">
                {register ? (
                  <label>
                    <span className="field-label">Nama lengkap</span>
                    <input
                      className="field"
                      placeholder="Nama peserta"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>
                ) : null}
                <label>
                  <span className="field-label">Email</span>
                  <input
                    className="field"
                    type="email"
                    placeholder="nama@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span className="field-label">Kata sandi</span>
                  <input
                    className="field"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    autoComplete={register ? "new-password" : "current-password"}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <button className="button" type="submit" disabled={busy}>
                  {busy
                    ? "Memproses…"
                    : register
                      ? isConnected
                        ? "Buat akun peserta"
                        : "Buat akun demo"
                      : isConnected
                        ? "Masuk"
                        : "Masuk ke dashboard"}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
              {errorMessage ? (
                <div className="notice auth-error" role="alert">
                  <CircleHelp aria-hidden="true" />
                  <p>{errorMessage}</p>
                </div>
              ) : null}
              {confirmationRequired ? (
                <div className="notice" role="status">
                  <CheckCircle2 aria-hidden="true" />
                  <p>
                    Akun berhasil dibuat. Periksa email untuk mengonfirmasi
                    pendaftaran sebelum masuk.
                  </p>
                </div>
              ) : null}
              <p className="field-hint">
                {isConnected
                  ? "Akun baru mendapat peran peserta. Operator akan memetakan regu dan pangkalan."
                  : "Mode pratinjau: formulir ini tidak membuat atau menyimpan akun."}
              </p>
              <div className="auth-switch">
                {register ? "Sudah punya akun? " : "Belum terdaftar? "}
                <Link href={register ? "/login" : "/register"}>
                  {register ? "Masuk" : "Daftar"}
                </Link>
              </div>
            </form>
          </section>
        </main>
      );
    }

    export function WorkspaceApp({
      view,
      competitionId = "",
      userId = "",
    }: {
      view: View;
      competitionId?: string;
      userId?: string;
    }) {
      const {
        data,
        isConnected,
        authReady,
        dataLoading,
        dataError,
        session,
        profile,
      } = useWorkspace();
      const router = useRouter();
      const [toast, setToast] = React.useState<{ message: string; error: boolean } | null>(
        null,
      );
      const notify: Notify = (message, isError = false) => {
        setToast({ message, error: isError });
        window.setTimeout(() => setToast(null), 3600);
      };

      const isAuthView = view === "login" || view === "register";
      const isPublicView = view === "verify";
      const requiredRole: Role | null =
        view === "operator" ||
        view === "scores" ||
        view === "schools" ||
        view === "teams" ||
        view === "competitions" ||
        view === "publication"
          ? "operator"
          : view === "juri"
            ? "juri"
            : view === "panitia"
              ? "panitia"
              : ["participant", "leaderboard", "scan", "teamScores", "profile", "submit"].includes(
                    view,
                  )
                ? "peserta"
                : null;
      const roleLanding: Record<Role, string> = {
        peserta: "/dashboard",
        juri: "/juri",
        panitia: "/panitia",
        operator: "/operator",
      };

      React.useEffect(() => {
        if (!isConnected || !authReady || isAuthView || isPublicView) return;
        if (!session) {
          router.replace("/login");
        } else if (profile && requiredRole && profile.role !== requiredRole) {
          router.replace(roleLanding[profile.role]);
        }
      }, [
        authReady,
        isAuthView,
        isConnected,
        isPublicView,
        profile,
        requiredRole,
        router,
        session,
      ]);

      if (isConnected && !isAuthView && !isPublicView) {
        if (!authReady || dataLoading || !session) {
          return (
            <main className="auth-main">
              <p role="status">Memeriksa sesi dan memuat data kegiatan…</p>
            </main>
          );
        }
        if (dataError) {
          return (
            <main className="auth-main">
              <section className="auth-card" role="alert">
                <h2>Data Supabase tidak dapat dimuat</h2>
                <p>{dataError}</p>
                <button className="button" onClick={() => window.location.reload()}>
                  Coba lagi
                </button>
              </section>
            </main>
          );
        }
        if (!profile) {
          return (
            <main className="auth-main">
              <section className="auth-card" role="alert">
                <h2>Profil akun belum tersedia</h2>
                <p>
                  Akun autentikasi ditemukan, tetapi profil aplikasi tidak ada.
                  Pastikan migration Supabase sudah dijalankan atau minta operator
                  memeriksa tabel profiles.
                </p>
              </section>
            </main>
          );
        }
        if (requiredRole && profile.role !== requiredRole) {
          return (
            <main className="auth-main">
              <p role="status">Membuka ruang kerja sesuai peran akun…</p>
            </main>
          );
        }
      }

      if (view === "login" || view === "register") {
        return <AuthPage register={view === "register"} />;
      }
      if (view === "verify") {
        return <VerificationPage userId={userId} />;
      }

      let content: React.ReactNode;
      switch (view) {
        case "participant":
          content = <ParticipantDashboard notify={notify} />;
          break;
        case "leaderboard":
          content = <ParticipantLeaderboard />;
          break;
        case "scan":
          content = <ScanTaskPage />;
          break;
        case "teamScores":
          content = <ParticipantScoreRecap />;
          break;
        case "profile":
          content = <ParticipantProfile notify={notify} />;
          break;
        case "submit":
          content = <SubmissionPage competitionId={competitionId} notify={notify} />;
          break;
        case "operator":
          content = <OperatorDashboard />;
          break;
        case "scores":
          content = <OperatorScores notify={notify} />;
          break;
        case "schools":
          content = <SchoolManagement notify={notify} />;
          break;
        case "teams":
          content = <TeamManagement notify={notify} />;
          break;
        case "competitions":
          content = <CompetitionManagement notify={notify} />;
          break;
        case "publication":
          content = <PublicationSettings notify={notify} />;
          break;
        case "juri":
          content = <JuryScoring notify={notify} />;
          break;
        case "panitia":
          content = <EventCoordination notify={notify} />;
          break;
      }

      return (
        <>
          <WorkspaceFrame view={view}>{content}</WorkspaceFrame>
          {toast ? <StateToast message={toast.message} isError={toast.error} /> : null}
        </>
      );
    }

export type { View };
