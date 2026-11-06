"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Activity,
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
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
  ExternalLink,
  FileCheck2,
  FileText,
  Flag,
  Home,
  Landmark,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Medal,
  MessageSquareText,
  Pencil,
  Plus,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Signpost,
  Star,
  Trash2,
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
  type EventScheduleItem,
  type TrainingLog,
  TRAINING_EVIDENCE_MAX_BYTES,
  TRAINING_EVIDENCE_MIME_TYPES,
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
  | "accounts"
  | "scores"
  | "schools"
  | "teams"
  | "competitions"
  | "judgeAssignments"
  | "panitiaAssignments"
  | "publication"
  | "schedule"
  | "operatorSchedule"
  | "panitiaSchedule"
  | "juriDashboard"
  | "panitiaDashboard"
  | "pendampingDashboard"
  | "training"
  | "trainingReports"
  | "juri"
  | "panitia"
  | "pendamping"
  | "verify"
  | "login";

type Notify = (message: string, isError?: boolean) => void;

const viewTitles: Record<View, string> = {
  participant: "Dashboard peserta",
  leaderboard: "Leaderboard",
  scan: "Scan tugas",
  teamScores: "Rekap nilai regu",
  profile: "Profil akun",
  submit: "Pengumpulan tugas",
  operator: "Ringkasan operator",
  accounts: "Manajemen akun",
  scores: "Peninjauan nilai",
  schools: "Data pangkalan",
  teams: "Manajemen regu",
  competitions: "Mata lomba",
  judgeAssignments: "Penugasan juri",
  panitiaAssignments: "Penugasan panitia",
  publication: "Papan skor & sertifikat",
  schedule: "Jadwal kegiatan",
  operatorSchedule: "Jadwal kegiatan",
  panitiaSchedule: "Jadwal kegiatan",
  juriDashboard: "Dasbor juri",
  panitiaDashboard: "Dasbor panitia",
  pendampingDashboard: "Dasbor pendamping",
  training: "Latihan regu",
  trainingReports: "Pengawasan latihan",
  juri: "Input nilai juri",
  panitia: "Kegiatan & kehadiran",
  pendamping: "Pendaftaran peserta",
  verify: "Verifikasi sertifikat",
  login: "Masuk",
};

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand${light ? " brand-light" : ""}`}>
      <Image
        className="brand-logo"
        src="/logo-lt1.png"
        alt="Logo Lomba Tingkat 1 Pramuka Islamiyah 2026"
        width={2000}
        height={569}
        priority
      />
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
    case "accounts":
      return <Users {...props} />;
    case "scores":
      return <ClipboardCheck {...props} />;
    case "schools":
      return <Landmark {...props} />;
    case "teams":
      return <Users {...props} />;
    case "competitions":
      return <Flag {...props} />;
    case "judgeAssignments":
      return <ClipboardCheck {...props} />;
    case "panitiaAssignments":
      return <CalendarCheck {...props} />;
    case "schedule":
    case "operatorSchedule":
    case "panitiaSchedule":
      return <CalendarDays {...props} />;
    case "publication":
      return <Flag {...props} />;
    case "juri":
      return <FileCheck2 {...props} />;
    case "panitia":
      return <CalendarCheck {...props} />;
    case "pendamping":
      return <UserRound {...props} />;
    case "training":
    case "trainingReports":
      return <Activity {...props} />;
    case "verify":
      return <ShieldCheck {...props} />;
    case "login":
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

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function DashboardGreeting({
  description,
  fallbackName = "Pengguna",
  actions,
}: {
  description: string;
  fallbackName?: string;
  actions?: React.ReactNode;
}) {
  const { profile } = useWorkspace();
  const [greeting, setGreeting] = React.useState("");
  const accountName = profile?.full_name?.trim() || fallbackName;
  const firstName = accountName.split(/\s+/)[0] || fallbackName;

  React.useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <PageHeading
      title={`${greeting ? `${greeting}, ` : ""}${firstName}`}
      description={description}
      actions={actions}
    />
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
  { view: "schedule", label: "Jadwal kegiatan", href: "/schedule" },
  { view: "training", label: "Latihan regu", href: "/training" },
  { view: "profile", label: "Profil", href: "/profile" },
];

type WorkspaceNavigationItem = {
  view: View;
  label: string;
  href: string;
  count?: number;
};

function dashboardViewForRole(role: Role): View {
  switch (role) {
    case "operator":
      return "operator";
    case "juri":
      return "juriDashboard";
    case "panitia":
      return "panitiaDashboard";
    case "pendamping_regu":
      return "pendampingDashboard";
    case "peserta":
      return "participant";
  }
}

function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "operator":
      return "/operator";
    case "juri":
      return "/juri/dashboard";
    case "panitia":
      return "/panitia/dashboard";
    case "pendamping_regu":
      return "/pendamping/dashboard";
    case "peserta":
      return "/dashboard";
  }
}

function bottomNavigation(role: Role) {
  const dashboardItem = {
    view: "participant" as const,
    label: "Dasbor",
    href: dashboardPathForRole(role),
  };
  const publicItems = participantNavigation.filter(
    (item) =>
      item.view === "leaderboard" ||
      item.view === "teamScores" ||
      item.view === "profile",
  );
  const scanItem = participantNavigation.find((item) => item.view === "scan");
  return [
    dashboardItem,
    ...publicItems.slice(0, 1),
    ...(role === "peserta" && scanItem ? [scanItem] : []),
    ...publicItems.slice(1),
  ];
}

function workspaceNavigation(
  role: Role,
  data: ReturnType<typeof useWorkspace>["data"],
): WorkspaceNavigationItem[] {
  if (role === "peserta") {
    return participantNavigation.map((item) => ({
      ...item,
      label: item.view === "participant" ? "Dasbor" : item.label,
    }));
  }

  if (role === "operator") {
    return [
      { view: "operator", label: "Dasbor", href: "/operator" },
      {
        view: "operatorSchedule",
        label: "Jadwal kegiatan",
        href: "/operator/schedule",
      },
      { view: "accounts", label: "Manajemen akun", href: "/operator/accounts" },
      {
        view: "scores",
        label: "Peninjauan nilai",
        href: "/operator/scores",
        count: data.scores.filter((score) => score.status === "pending_review")
          .length,
      },
      { view: "teams", label: "Regu & peserta", href: "/operator/teams" },
      { view: "schools", label: "Pangkalan", href: "/operator/schools" },
      { view: "competitions", label: "Mata lomba", href: "/operator/competitions" },
      {
        view: "judgeAssignments",
        label: "Penugasan juri",
        href: "/operator/judge-assignments",
      },
      {
        view: "panitiaAssignments",
        label: "Penugasan panitia",
        href: "/operator/panitia-assignments",
      },
      { view: "publication", label: "Publikasi", href: "/operator/publication" },
      {
        view: "trainingReports",
        label: "Pengawasan latihan",
        href: "/operator/training",
      },
    ];
  }

  const dashboardItem: WorkspaceNavigationItem = {
    view: dashboardViewForRole(role),
    label: "Dasbor",
    href: dashboardPathForRole(role),
  };

  if (role === "juri") {
    return [
      dashboardItem,
      { view: "juri", label: "Input nilai", href: "/juri" },
    ];
  }
  if (role === "panitia") {
    return [
      dashboardItem,
      {
        view: "panitiaSchedule",
        label: "Jadwal kegiatan",
        href: "/panitia/schedule",
      },
      { view: "panitia", label: "Pos kegiatan", href: "/panitia" },
    ];
  }
  return [
    dashboardItem,
    { view: "schedule", label: "Jadwal kegiatan", href: "/schedule" },
    {
      view: "pendamping",
      label: "Pendaftaran peserta",
      href: "/pendamping",
    },
    { view: "training", label: "Latihan regu", href: "/pendamping/training" },
  ];
}

const workspaceMenuDescriptions: Partial<Record<View, string>> = {
  leaderboard: "Lihat peringkat regu yang sudah dipublikasikan.",
  scan: "Pindai kode QR untuk membuka tugas kegiatan.",
  teamScores: "Pantau hasil penilaian dan progres regu.",
  profile: "Periksa informasi akun dan data peserta.",
  accounts: "Kelola akun peserta dan petugas kegiatan.",
  scores: "Tinjau dan tindak lanjuti nilai yang masuk.",
  teams: "Atur regu, peserta, dan pembagian anggota.",
  schools: "Kelola pangkalan yang mengikuti kegiatan.",
  competitions: "Atur mata lomba dan kriteria penilaian.",
  judgeAssignments: "Tentukan juri untuk setiap mata lomba.",
  panitiaAssignments: "Atur penugasan panitia di setiap pos.",
  publication: "Kelola publikasi papan skor dan sertifikat.",
  training: "Lihat kalender dan catatan latihan regu.",
  trainingReports: "Konfirmasi latihan dan unduh laporan terverifikasi.",
  operatorSchedule: "Susun rundown kegiatan dan penanggung jawabnya.",
  panitiaSchedule: "Susun rundown kegiatan dan penanggung jawabnya.",
  schedule: "Lihat urutan waktu kegiatan lomba.",
  juri: "Masukkan nilai untuk regu pada mata lomba yang ditugaskan.",
  panitia: "Pantau kegiatan dan catat kehadiran regu.",
  pendamping: "Daftarkan peserta dan kelola data regu dampingan.",
};

function WorkspaceMenu({ role }: { role: Role }) {
  const { data } = useWorkspace();
  const items = workspaceNavigation(role, data).filter(
    (item) => item.view !== dashboardViewForRole(role),
  );

  return (
    <section className="workspace-menu" aria-label="Menu ruang kerja">
      <SectionHeading
        title="Menu ruang kerja"
        detail="Pilih menu untuk melanjutkan pekerjaan."
      />
      <div className="workspace-menu-grid">
        {items.map((item) => (
          <Link className="workspace-menu-item" href={item.href} key={item.href}>
            <IconForView view={item.view} />
            <span className="workspace-menu-copy">
              <strong>{item.label}</strong>
              <span>{workspaceMenuDescriptions[item.view]}</span>
            </span>
            {item.count ? <span className="nav-count">{item.count}</span> : null}
            <ArrowRight className="workspace-menu-arrow" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function WorkspaceFrame({
  view,
  children,
  notify,
}: {
  view: View;
  children: React.ReactNode;
  notify: Notify;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isConnected, profile, session, signOut } = useWorkspace();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const [bottomNavigationFromDashboard, setBottomNavigationFromDashboard] =
    React.useState(false);
  React.useEffect(() => {
    if (!menuOpen && !accountMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountMenuOpen, menuOpen]);
  const routeRole: Role =
    view === "operator" ||
    view === "accounts" ||
    view === "scores" ||
    view === "schools" ||
    view === "teams" ||
    view === "competitions" ||
    view === "judgeAssignments" ||
    view === "panitiaAssignments" ||
    view === "publication" ||
    view === "operatorSchedule" ||
    view === "trainingReports"
      ? "operator"
      : view === "juri" || view === "juriDashboard"
        ? "juri"
        : view === "panitia" ||
            view === "panitiaDashboard" ||
            view === "panitiaSchedule"
          ? "panitia"
          : view === "pendamping" || view === "pendampingDashboard"
            ? "pendamping_regu"
            : "peserta";
  const role: Role = isConnected ? profile?.role ?? "peserta" : routeRole;
  const isDashboardPage = pathname === dashboardPathForRole(role);
  const isBottomNavigationDestination = bottomNavigation(role).some(
    (item) => item.href === pathname && item.href !== dashboardPathForRole(role),
  );
  const showBottomNavigation =
    isDashboardPage ||
    (isBottomNavigationDestination && bottomNavigationFromDashboard);

  React.useEffect(() => {
    if (isDashboardPage) {
      window.sessionStorage.removeItem("workspace-bottom-navigation");
      setBottomNavigationFromDashboard(false);
      return;
    }

    const enteredFromDashboard =
      isBottomNavigationDestination &&
      window.sessionStorage.getItem("workspace-bottom-navigation") === "visible";
    setBottomNavigationFromDashboard(enteredFromDashboard);
    if (!enteredFromDashboard) {
      window.sessionStorage.removeItem("workspace-bottom-navigation");
    }
  }, [isBottomNavigationDestination, isDashboardPage]);

  const roleOptions: { value: Role; label: string; path: string }[] = [
    { value: "peserta", label: "Peserta", path: "/dashboard" },
    { value: "juri", label: "Juri", path: "/juri/dashboard" },
    { value: "panitia", label: "Panitia", path: "/panitia/dashboard" },
    {
      value: "pendamping_regu",
      label: "Pendamping regu",
      path: "/pendamping/dashboard",
    },
    { value: "operator", label: "Operator pusat", path: "/operator" },
  ];

  const nav = workspaceNavigation(role, data);
  const isParticipant = role === "peserta";
  const accountName =
    profile?.full_name ||
    session?.user.email?.split("@")[0] ||
    "Akun pratinjau";
  const accountInitials = accountName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const roleLabel = roleOptions.find((option) => option.value === role)?.label;
  const handleSignOut = async () => {
    if (!isConnected) {
      router.replace("/login");
      return;
    }
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Gagal keluar dari sesi Supabase.", error);
      notify("Tidak dapat mengakhiri sesi. Coba lagi.", true);
    }
  };

  return (
    <div
      className={`workspace${isParticipant ? " participant-workspace" : ""}${showBottomNavigation ? " has-bottom-navigation" : ""}${menuOpen ? " has-open-sidebar" : ""}`}
    >
      {menuOpen ? (
        <button
          className="mobile-overlay"
          aria-label="Tutup menu"
          onClick={() => {
            setMenuOpen(false);
            setAccountMenuOpen(false);
          }}
        />
      ) : null}
      <aside
        className={`sidebar${menuOpen ? " is-open" : ""}`}
        id="workspace-sidebar"
        aria-label="Ruang kerja"
      >
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
              <button
                className="account-trigger"
                aria-expanded={accountMenuOpen}
                aria-controls="account-menu"
                onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
              >
                <span className="avatar">{accountInitials}</span>
                <span className="account-copy">
                  <strong>{accountName}</strong>
                  <span>{roleLabel}</span>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {accountMenuOpen ? (
                <div className="account-menu" id="account-menu">
                  <Link
                    href="/profile"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    <UserRound aria-hidden="true" />
                    Profil akun
                  </Link>
                  <button onClick={() => void handleSignOut()}>
                    <LogOut aria-hidden="true" />
                    Keluar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
      </aside>

      <main className="main-shell workspace-main-shell">
        <div className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button sidebar-toggle"
              aria-label="Buka menu navigasi"
              aria-expanded={menuOpen}
              aria-controls="workspace-sidebar"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <div className="breadcrumbs">
              <Image
                className="topbar-logo"
                src="/logo-lt1.png"
                alt="Logo Lomba Tingkat 1 Pramuka Islamiyah 2026"
                width={2000}
                height={569}
                priority
              />
            </div>
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
      {showBottomNavigation ? (
        <nav className="workspace-tab-bar" aria-label="Navigasi ruang kerja">
          {bottomNavigation(role).map((item) => {
            const active =
              item.view === "participant"
                ? pathname === item.href
                : item.view === "scan"
                  ? pathname === item.href ||
                    pathname.startsWith("/dashboard/submit/")
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                className="workspace-tab"
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                onClick={() =>
                  window.sessionStorage.setItem(
                    "workspace-bottom-navigation",
                    "visible",
                  )
                }
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
  value: unknown,
): value is Record<string, unknown> {
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
  const matching = records.filter(
    (record) =>
      record.teamId === teamId && record.competitionId === competitionId,
  );
  if (matching.length < 2) return matching[0];

  const approved = matching.filter((record) => record.status === "approved");
  const status: ScoreStatus = matching.some(
    (record) => record.status === "revision_needed",
  )
    ? "revision_needed"
    : matching.some((record) => record.status === "pending_review")
      ? "pending_review"
      : matching.every((record) => record.status === "approved")
        ? "approved"
        : "draft";
  return {
    ...matching[0],
    score: approved.length
      ? approved.reduce((total, record) => total + (record.score ?? 0), 0)
      : null,
    status,
    feedback: matching
      .map((record) => record.feedback)
      .filter(Boolean)
      .join(" · "),
  };
}

function getJudgeScore(
  records: ScoreRecord[],
  teamId: string,
  competitionId: string,
  judgeId: string,
  isConnected: boolean,
) {
  return records.find(
    (record) =>
      record.teamId === teamId &&
      record.competitionId === competitionId &&
      (record.judgeId === judgeId || (!isConnected && !record.judgeId)),
  );
}

function getSubmission(
  data: ReturnType<typeof useWorkspace>["data"],
  teamId: string,
  competitionId: string,
) {
  return (
    data.submissions[`${teamId}:${competitionId}`] ??
    data.submissions[competitionId]
  );
}

function approvedScoresForTeam(
  records: ScoreRecord[],
  teamId: string,
  competitionIds?: string[],
) {
  const relevantCompetitionIds = [
    ...new Set(
      records
        .filter(
          (record) =>
            record.teamId === teamId &&
            (!competitionIds || competitionIds.includes(record.competitionId)),
        )
        .map((record) => record.competitionId),
    ),
  ];
  return relevantCompetitionIds
    .map((competitionId) => getScore(records, teamId, competitionId))
    .filter(
      (score): score is ScoreRecord =>
        score?.status === "approved" && score.score !== null,
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
  const school = data.schools.find((item) => item.id === participant?.schoolId);
  const teamScores = approvedScoresForTeam(data.scores, currentTeamId);
  const badgeCount = teamScores.filter(
    (score) => score.score !== null && score.score >= 80,
  ).length;
  const approvedCount = data.competitions.filter(
    (competition) =>
      getScore(data.scores, currentTeamId, competition.id)?.status === "approved",
  ).length;
  const allApproved = approvedCount === data.competitions.length;
  const teamTotal = teamScores.reduce(
    (total, score) => total + (score.score ?? 0),
    0,
  );
  const submittedCount = data.competitions.filter(
    (competition) => getSubmission(data, currentTeamId, competition.id)?.submitted,
  ).length;
  const progress = Math.round((approvedCount / data.competitions.length) * 100);
  const certificateReady = allApproved && data.certificatesPublished;

  return (
    <>
      <DashboardGreeting
        fallbackName={participant?.name?.split(/\s+/)[0] ?? "Peserta"}
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

      <div className="dashboard-grid participant-dashboard-grid">
        <div className="dashboard-column">
          <section className="panel panel-pad">
            <SectionHeading
              title="Lencana regu"
              detail="Lencana diberikan untuk akumulasi minimal 80 poin."
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
                const earned =
                  score?.status === "approved" &&
                  score.score !== null &&
                  score.score >= 80;
                return (
                  <div
                    className={`badge-item${earned ? "" : " is-locked"}`}
                    key={competition.id}
                    title={
                      earned
                        ? `${competition.title}: ${score.score ?? 0} poin`
                        : `${competition.title}: belum diraih`
                    }
                  >
                    <span className="badge-seal">
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{competition.title}</strong>
                    <span>
                      {earned ? `${score.score ?? 0} poin` : "Belum diraih"}
                    </span>
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
                const submitted =
                  getSubmission(data, currentTeamId, competition.id)?.submitted ??
                  false;
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
                      {score && score.status === "approved" ? <span> poin</span> : null}
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
      const scores = approvedScoresForTeam(data.scores, team.id);
      return {
        ...team,
        approvedCount: scores.length,
        total: scores.reduce((sum, score) => sum + (score.score ?? 0), 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const teamsByCategory = (["Putra", "Putri"] as const).map((category) => ({
    category,
    teams: rankedTeams.filter((team) => team.category === category),
  }));

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
        <div className="championship-standings">
          {teamsByCategory.map(({ category, teams }) => (
            <section
              className="panel panel-pad participant-ranking championship-category"
              key={category}
            >
              <SectionHeading
                title={`Kategori ${category}`}
                detail={`${teams.length} regu · diurutkan dari nilai tertinggi`}
                action={
                  category === "Putra" ? (
                    <span className="status-pill is-approved">Terbit</span>
                  ) : undefined
                }
              />
              {teams.length ? (
                <div className="table-scroll">
                  <table className="championship-table">
                    <thead>
                      <tr>
                        <th scope="col">Peringkat</th>
                        <th scope="col">Regu</th>
                        <th scope="col">Nilai disahkan</th>
                        <th className="numeric" scope="col">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr
                          className={
                            team.id === currentTeamId ? "is-current" : undefined
                          }
                          key={team.id}
                          style={{
                            animationDelay: `${Math.min(index, 14) * 55}ms`,
                          }}
                        >
                          <td className="championship-place">
                            {index < 3 ? (
                              <Medal aria-hidden="true" />
                            ) : null}
                            <span>{index + 1}</span>
                          </td>
                          <td>
                            <span className="table-primary">
                              {team.name}
                              {team.id === currentTeamId ? " · Regumu" : ""}
                            </span>
                          </td>
                          <td>
                            {team.approvedCount}/{data.competitions.length}
                          </td>
                          <td className="numeric championship-points">
                            {team.total.toLocaleString("id-ID")}
                            <span> poin</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state championship-empty">
                  <Trophy aria-hidden="true" />
                  <strong>Belum ada regu kategori {category.toLowerCase()}</strong>
                  <p>Peringkat akan muncul setelah regu ditambahkan.</p>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ParticipantScoreRecap() {
  const { data, currentUserId, isConnected, profile } = useWorkspace();
  const isPublicViewer = profile
    ? profile.role !== "peserta"
    : isConnected;
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const ownTeamId = participant?.teamId ?? (isConnected ? "" : CURRENT_TEAM_ID);
  const [selectedTeamId, setSelectedTeamId] = React.useState(ownTeamId);
  const canViewAllTeams = data.leaderboardPublished;
  const visibleScores = isPublicViewer
    ? data.scores.filter((score) => score.status === "approved")
    : data.scores;
  const effectiveTeamId = canViewAllTeams
    ? selectedTeamId || ownTeamId || data.teams[0]?.id || ""
    : ownTeamId;
  const team = data.teams.find((item) => item.id === effectiveTeamId);
  const scores = data.competitions.map((competition) => ({
    competition,
    score: team ? getScore(visibleScores, team.id, competition.id) : undefined,
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

  if (isPublicViewer && !canViewAllTeams) {
    return (
      <>
        <PageHeading
          title="Rekap nilai regu"
          description="Periksa nilai yang sudah dipublikasikan untuk seluruh regu."
        />
        <section className="panel panel-pad">
          <div className="empty-state">
            <ClipboardCheck aria-hidden="true" />
            <strong>Rekap nilai belum dipublikasikan</strong>
            <p>Operator akan membuka rekap nilai setelah leaderboard dirilis.</p>
          </div>
        </section>
      </>
    );
  }

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
        {!isPublicViewer ? (
          <>
            <div>
              <span>Menunggu</span>
              <strong>{pendingCount}</strong>
            </div>
            <div>
              <span>Perlu revisi</span>
              <strong>{revisionCount}</strong>
            </div>
          </>
        ) : null}
      </section>
      <section className="panel panel-pad participant-score-panel">
        <div className="participant-team-picker">
          <div>
            <h2>{team?.name ?? "Regu belum dipetakan"}</h2>
            <p>
              {team ? team.category : "Belum dipetakan"}
            </p>
          </div>
          <label>
            <span className="field-label">Pilih regu</span>
            <select
              className="filter-select"
              value={effectiveTeamId}
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
                <span>
                  {isPublicViewer
                    ? score
                      ? "Nilai disahkan."
                      : "Nilai belum disahkan."
                    : score?.feedback || "Belum ada catatan penilaian."}
                </span>
              </div>
              {isPublicViewer ? (
                <span className="status-pill">
                  {score ? "Disahkan" : "Belum disahkan"}
                </span>
              ) : (
                <StatusPill
                  status={
                    score?.status ??
                    (getSubmission(data, ownTeamId, competition.id)?.submitted
                      ? "pending_review"
                      : "not_started")
                  }
                />
              )}
              <strong className="participant-score-value">
                {score?.status === "approved" ? score.score ?? "—" : "—"}
                <span>{score?.status === "approved" ? " poin" : ""}</span>
              </strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AccountProfile({ notify }: { notify: Notify }) {
  const {
    data,
    currentUserId,
    isConnected,
    profile,
    refreshWorkspace,
  } = useWorkspace();
  const participant = data.participants.find(
    (person) => person.id === currentUserId,
  );
  const team = participant
    ? getTeam(data, participant.teamId)
    : isConnected
      ? undefined
      : getTeam(data, CURRENT_TEAM_ID);
  const school = data.schools.find((item) => item.id === participant?.schoolId);
  const name = profile?.full_name ?? participant?.name ?? "";
  const [fullName, setFullName] = React.useState(name);
  const [loginId, setLoginId] = React.useState("");
  const [schoolId, setSchoolId] = React.useState(
    profile?.school_id ?? participant?.schoolId ?? "",
  );
  const [placeOfBirth, setPlaceOfBirth] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [motto, setMotto] = React.useState("");
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(isConnected);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");
  const [profileLoadError, setProfileLoadError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState("");
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const accountRoleNames: Record<Role, string> = {
    operator: "Operator pusat",
    panitia: "Panitia",
    juri: "Juri",
    peserta: "Peserta",
    pendamping_regu: "Pendamping regu",
  };

  React.useEffect(() => {
    if (!isConnected) return;
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", {
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (!response.ok || !isJsonRecord(result) || !isJsonRecord(result.profile)) {
          const message =
            isJsonRecord(result) && typeof result.error === "string"
              ? result.error
              : "Profil akun gagal dimuat.";
          throw new Error(message);
        }
        const account = result.profile;
        if (
          typeof account.full_name !== "string" ||
          (typeof account.login_id !== "string" && account.login_id !== null) ||
          (typeof account.phone_number !== "string" &&
            account.phone_number !== null) ||
          typeof account.place_of_birth !== "string" ||
          (typeof account.date_of_birth !== "string" &&
            account.date_of_birth !== null) ||
          typeof account.motto !== "string" ||
          (typeof account.school_id !== "string" &&
            account.school_id !== null)
        ) {
          throw new Error("Data profil akun tidak valid.");
        }
        setFullName(account.full_name);
        setLoginId(account.login_id ?? "");
        setSchoolId(account.school_id ?? "");
        setPlaceOfBirth(account.place_of_birth);
        setDateOfBirth(account.date_of_birth ?? "");
        setPhoneNumber(account.phone_number ?? "");
        setMotto(account.motto);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Gagal memuat profil akun.", error);
        setProfileLoadError(
          error instanceof Error ? error.message : "Profil akun gagal dimuat.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, [isConnected]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          loginId,
          placeOfBirth,
          dateOfBirth,
          phoneNumber,
          motto,
          ...(profile?.role === "peserta" ? { schoolId } : {}),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Profil gagal disimpan. Coba lagi.";
        throw new Error(message);
      }
      await refreshWorkspace();
      notify("Profil akun berhasil diperbarui.");
    } catch (error) {
      console.error("Gagal menyimpan perubahan profil.", error);
      setProfileError(
        error instanceof Error ? error.message : "Profil gagal disimpan.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword.length < 8) {
      setPasswordError("Kata sandi harus memiliki minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { error } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password: newPassword,
      });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Kata sandi berhasil diperbarui.");
      notify("Kata sandi berhasil diperbarui.");
    } catch (error) {
      console.error("Gagal memperbarui kata sandi.", error);
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Kata sandi gagal diperbarui. Coba lagi.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Profil akun"
        description="Perbarui informasi diri dan akses masuk akun Anda."
      />
      <div className="account-profile-layout">
        <section className="panel panel-pad account-profile-card">
          <div className="participant-profile-heading">
            <span className="participant-avatar" aria-hidden="true">
              {initials || <UserRound aria-hidden="true" />}
            </span>
            <div>
              <h2>{name || "Akun LT-1"}</h2>
              <p>
                {profile?.role
                  ? accountRoleNames[profile.role]
                  : "Akun pratinjau"}
              </p>
            </div>
          </div>
          {participant ? (
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
          ) : null}
          {profileLoadError ? (
            <p className="form-error" role="alert">
              {profileLoadError}
            </p>
          ) : null}
          <form className="form-stack account-profile-form" onSubmit={saveProfile}>
            {profile?.role === "peserta" ? (
              <label>
                <span className="field-label">Pangkalan</span>
                <select
                  className="field"
                  disabled={data.schools.length === 0}
                  required
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                >
                  <option value="">Pilih pangkalan</option>
                  {data.schools.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {data.schools.length === 0 ? (
                  <span className="field-hint">
                    Belum ada pangkalan yang tersedia. Hubungi Operator.
                  </span>
                ) : null}
              </label>
            ) : null}
            <div className="form-row">
              <label>
                <span className="field-label">Nama lengkap</span>
                <input
                  className="field"
                  autoComplete="name"
                  maxLength={150}
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <label>
                <span className="field-label">ID pengguna</span>
                <input
                  className="field"
                  autoComplete="username"
                  maxLength={64}
                  pattern="[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*"
                  required
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                <span className="field-label">Tempat lahir</span>
                <input
                  className="field"
                  autoComplete="address-level2"
                  maxLength={120}
                  value={placeOfBirth}
                  onChange={(event) => setPlaceOfBirth(event.target.value)}
                />
              </label>
              <label>
                <span className="field-label">Tanggal lahir</span>
                <input
                  className="field"
                  type="date"
                  autoComplete="bday"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                />
              </label>
            </div>
            <label>
              <span className="field-label">No. WhatsApp</span>
              <input
                className="field"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="+62 812-3456-7890"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Motto</span>
              <textarea
                className="text-area"
                maxLength={240}
                value={motto}
                onChange={(event) => setMotto(event.target.value)}
              />
            </label>
            {profileError ? (
              <p className="form-error" role="alert">
                {profileError}
              </p>
            ) : null}
            <div className="form-footer">
              <span className="field-hint">
                T/TL berarti tempat dan tanggal lahir.
              </span>
              <button
                className="button"
                type="submit"
                disabled={
                  !isConnected ||
                  isSavingProfile ||
                  isLoadingProfile ||
                  Boolean(profileLoadError)
                }
              >
                {isLoadingProfile
                  ? "Memuat profil…"
                  : isSavingProfile
                    ? "Menyimpan…"
                    : "Simpan profil"}
              </button>
            </div>
          </form>
        </section>
        <section className="panel panel-pad account-password-card">
          <SectionHeading
            title="Kata sandi"
            detail="Gunakan minimal 8 karakter dan jangan gunakan kata sandi dari akun lain."
          />
          <form className="form-stack" onSubmit={savePassword}>
            <label>
              <span className="field-label">Kata sandi saat ini</span>
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Kata sandi baru</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Ulangi kata sandi baru</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            {passwordError ? (
              <p className="form-error" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordSuccess ? (
              <p className="form-success" role="status">
                {passwordSuccess}
              </p>
            ) : null}
            <button
              className="button button-secondary"
              type="submit"
              disabled={!isConnected || isSavingPassword}
            >
              {isSavingPassword ? "Memperbarui…" : "Ubah kata sandi"}
            </button>
          </form>
          {!isConnected ? (
            <p className="inline-note">
              Masuk ke akun LT-1 untuk mengedit profil dan kata sandi.
            </p>
          ) : null}
        </section>
      </div>
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

type TrainingReportPeriod = "daily" | "weekly" | "monthly";

function jakartaDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDateDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function mondayOfWeek(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDateDays(date, -((day + 6) % 7));
}

function formatTrainingDate(date: string, dateStyle: "long" | "full" = "long") {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle,
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function formatTrainingTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function reportDateRange(period: TrainingReportPeriod, today: string) {
  if (period === "daily") {
    return {
      start: today,
      end: today,
      label: `Harian · ${formatTrainingDate(today)}`,
    };
  }
  if (period === "weekly") {
    const start = mondayOfWeek(today);
    const end = addDateDays(start, 6);
    return {
      start,
      end,
      label: `Mingguan · ${formatTrainingDate(start)} – ${formatTrainingDate(end)}`,
    };
  }
  const start = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const end = addDateDays(nextMonth.toISOString().slice(0, 10), -1);
  return {
    start,
    end,
    label: `Bulanan · ${new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(`${start}T12:00:00+07:00`))}`,
  };
}

function createTrainingReportWorkbook(
  logs: TrainingLog[],
  teams: Team[],
  periodLabel: string,
) {
  const rows = [
    ["Regu", "Tanggal", "Pukul", "Link bukti latihan", "Dikonfirmasi pada"],
    ...logs.map((log) => [
      `Regu ${teams.find((team) => team.id === log.teamId)?.name ?? "Tidak diketahui"}`,
      formatTrainingDate(log.trainingDate),
      formatTrainingTime(log.createdAt),
      log.evidencePath
        ? log.evidenceDeletedAt
          ? "Foto dihapus setelah konfirmasi"
          : "Foto menunggu penghapusan"
        : log.evidenceUrl ?? "",
      log.confirmedAt ? formatTrainingTime(log.confirmedAt) : "",
    ]),
  ];
  const tableRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map(
            (cell) =>
              `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${escapeXml(periodLabel.slice(0, 31))}"><Table>${tableRows}</Table></Worksheet></Workbook>`;
}

function TrainingWorkspace({ notify }: { notify: Notify }) {
  const {
    data,
    profile,
    currentUserId,
    createTrainingLog,
    isConnected,
  } = useWorkspace();
  const companionTeam = data.teams.find(
    (team) => team.pendampingId === currentUserId,
  );
  const participantTeamId = data.participants.find(
    (participant) => participant.id === currentUserId,
  )?.teamId;
  const team =
    profile?.role === "pendamping_regu"
      ? companionTeam
      : data.teams.find((item) => item.id === participantTeamId);
  const teamLogs = React.useMemo(
    () =>
      data.trainingLogs
        .filter((log) => log.teamId === team?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [data.trainingLogs, team?.id],
  );
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);
  const today = jakartaDate(now);
  const weekStart = mondayOfWeek(today);
  const weekDates = React.useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDateDays(weekStart, index)),
    [weekStart],
  );
  const weekLogs = React.useMemo(
    () => teamLogs.filter((log) => weekDates.includes(log.trainingDate)),
    [teamLogs, weekDates],
  );
  const datesWithLogs = React.useMemo(
    () => new Set(weekLogs.map((log) => log.trainingDate)),
    [weekLogs],
  );
  const dateLabels = React.useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      }),
    [],
  );
  const calendarMonthLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${today}T12:00:00+07:00`)),
    [today],
  );
  const [evidenceFile, setEvidenceFile] = React.useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const evidenceInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [showCalendarImage, setShowCalendarImage] = React.useState(false);
  const [calendarImage, setCalendarImage] = React.useState("");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const closeCalendarButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!evidenceFile) {
      setEvidencePreviewUrl("");
      return;
    }
    const previewUrl = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [evidenceFile]);

  React.useEffect(() => {
    if (!showCalendarImage) return;
    closeCalendarButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCalendarImage(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showCalendarImage]);

  React.useEffect(() => {
    if (!showCalendarImage || !team || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      notify("Kalender PNG tidak dapat dibuat di peramban ini.", true);
      setShowCalendarImage(false);
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const color = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const background = color("--surface", "#ffffff");
    const text = color("--text", "#0d1b13");
    const muted = color("--muted", "#4b5563");
    const border = color("--border", "#e2e9e5");
    const accent = color("--accent", "#1b7a3e");
    const positiveBackground = color("--positive-bg", "#dcfce7");
    const accentSoft = color("--accent-soft", "#e7f2eb");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = text;
    context.font = "600 34px Segoe UI, Arial, sans-serif";
    context.fillText(calendarMonthLabel, 44, 64);
    context.fillStyle = muted;
    context.font = "18px Segoe UI, Arial, sans-serif";
    context.fillText(`Regu ${team.name} · ${formatTrainingDate(weekDates[0])} – ${formatTrainingDate(weekDates[6])}`, 44, 96);
    context.fillStyle = text;
    context.font = "600 21px Segoe UI, Arial, sans-serif";
    context.fillText(`${datesWithLogs.size} hari latihan`, 44, 148);
    context.fillStyle = muted;
    context.font = "15px Segoe UI, Arial, sans-serif";
    context.fillText(`${weekLogs.length} catatan pekan ini`, 44, 174);

    const cellWidth = 118;
    const left = 44;
    const top = 220;
    weekDates.forEach((date, index) => {
      const x = left + index * cellWidth;
      const centerX = x + cellWidth / 2;
      context.fillStyle = muted;
      context.font = "16px Segoe UI, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(dateLabels.format(new Date(`${date}T12:00:00+07:00`)), centerX, top);
      context.fillStyle = datesWithLogs.has(date)
        ? positiveBackground
        : date === today
          ? accentSoft
          : background;
      context.strokeStyle = datesWithLogs.has(date) ? positiveBackground : border;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(centerX, top + 56, 27, 0, Math.PI * 2);
      context.fill();
      if (!datesWithLogs.has(date)) context.stroke();
      if (datesWithLogs.has(date)) {
        context.fillStyle = accent;
        context.font = "600 22px Segoe UI, Arial, sans-serif";
        context.fillText("✓", centerX, top + 64);
      } else {
        context.fillStyle = date === today ? accent : text;
        context.font = "600 20px Segoe UI, Arial, sans-serif";
        context.fillText(String(Number(date.slice(8))), centerX, top + 63);
      }
    });
    context.textAlign = "left";
    context.fillStyle = muted;
    context.font = "14px Segoe UI, Arial, sans-serif";
    context.fillText("Kalender latihan LT-1 · Asia/Jakarta", 44, 370);
    setCalendarImage(canvas.toDataURL("image/png"));
  }, [
    calendarMonthLabel,
    dateLabels,
    datesWithLogs,
    notify,
    showCalendarImage,
    team,
    today,
    weekDates,
    weekLogs.length,
  ]);

  const submitTrainingLog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team) return;
    if (!evidenceFile) {
      notify("Pilih foto bukti latihan terlebih dahulu.", true);
      return;
    }
    if (
      !TRAINING_EVIDENCE_MIME_TYPES.some((type) => type === evidenceFile.type)
    ) {
      notify("Pilih foto berformat JPG, PNG, atau WebP.", true);
      return;
    }
    if (evidenceFile.size > TRAINING_EVIDENCE_MAX_BYTES) {
      notify("Ukuran foto maksimal 10 MB.", true);
      return;
    }
    setSaving(true);
    try {
      await createTrainingLog(team.id, evidenceFile);
      setEvidenceFile(null);
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
      notify("Catatan latihan berhasil disimpan.");
    } catch (error) {
      console.error("Gagal menyimpan catatan latihan.", error);
      notify(
        error instanceof Error ? error.message : "Catatan latihan gagal disimpan.",
        true,
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadCalendar = () => {
    if (!calendarImage || !team) return;
    const anchor = document.createElement("a");
    anchor.href = calendarImage;
    anchor.download = `kalender-latihan-${team.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${weekStart}.png`;
    anchor.click();
  };

  return (
    <>
      <PageHeading
        title={team ? `Latihan Regu ${team.name}` : "Latihan regu"}
        description="Kalender latihan pekan ini dan catatan bukti kegiatan regu."
      />
      {!team ? (
        <div className="empty-state panel">
          <CalendarDays aria-hidden="true" />
          <strong>Regu belum ditetapkan</strong>
          <p>
            {profile?.role === "pendamping_regu"
              ? "Minta operator menugaskan akun pendamping ke regu."
              : "Akun peserta belum dipetakan ke regu oleh operator."}
          </p>
        </div>
      ) : (
        <>
          <section className="panel panel-pad training-calendar-section">
            <div className="training-calendar-heading">
              <div>
                <h2>{calendarMonthLabel}</h2>
                <p>
                  Regu {team.name} · {formatTrainingDate(weekDates[0])} –{" "}
                  {formatTrainingDate(weekDates[6])}
                </p>
              </div>
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={() => {
                  setSelectedDate(today);
                  setCalendarImage("");
                  setShowCalendarImage(true);
                }}
              >
                <Download aria-hidden="true" />
                Unduh
              </button>
            </div>
            <div className="training-calendar-summary">
              <div>
                <span>Hari latihan</span>
                <strong>{datesWithLogs.size}</strong>
              </div>
              <div>
                <span>Catatan pekan ini</span>
                <strong>{weekLogs.length}</strong>
              </div>
            </div>
            <div
              className="training-calendar"
              role="group"
              aria-label="Kalender latihan pekan ini"
            >
              {weekDates.map((date) => {
                const hasLog = datesWithLogs.has(date);
                const isToday = date === today;
                return (
                  <button
                    className={`training-day${isToday ? " is-today" : ""}${hasLog ? " has-log" : ""}${selectedDate === date ? " is-selected" : ""}`}
                    key={date}
                    type="button"
                    aria-label={`${dateLabels.format(new Date(`${date}T12:00:00+07:00`))}, ${formatTrainingDate(date)}${hasLog ? ", ada catatan latihan" : ", belum ada catatan latihan"}. Buka kalender PNG.`}
                    onClick={() => {
                      setSelectedDate(date);
                      setCalendarImage("");
                      setShowCalendarImage(true);
                    }}
                  >
                    <span className="training-day-weekday">
                      {dateLabels.format(new Date(`${date}T12:00:00+07:00`))}
                    </span>
                    <strong className="training-day-date">
                      {Number(date.slice(8))}
                    </strong>
                    <span
                      className={`training-day-status${hasLog ? " has-log" : ""}`}
                      aria-hidden="true"
                    >
                      {hasLog ? <Check /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="training-calendar-hint">
              Pilih tanggal untuk melihat kalender satu pekan dan mengunduhnya sebagai PNG.
            </p>
          </section>

          {profile?.role === "pendamping_regu" ? (
            <section className="panel panel-pad training-entry">
              <SectionHeading
                title="Catat latihan"
                detail="Tanggal mengikuti hari pengisian. Unggah satu foto bukti latihan."
              />
              <form className="form-row training-entry-form" onSubmit={(event) => void submitTrainingLog(event)}>
                <label>
                  <span className="field-label">Tanggal pengisian</span>
                  <input
                    className="field"
                    readOnly
                    value={formatTrainingDate(today, "full")}
                    aria-label="Tanggal pengisian latihan"
                  />
                </label>
                <label>
                  <span className="field-label">Foto bukti latihan</span>
                  <input
                    className="field"
                    ref={evidenceInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setEvidenceFile(event.target.files?.[0] ?? null)
                    }
                    required
                  />
                </label>
                <button className="button" type="submit" disabled={saving || !isConnected}>
                  {saving ? "Menyimpan…" : "Simpan catatan"}
                </button>
              </form>
              <p className="field-hint">
                JPG, PNG, atau WebP · maksimal 10 MB. Foto hanya dapat dibuka oleh regu terkait dan operator.
              </p>
              {evidencePreviewUrl ? (
                <div className="training-evidence-preview">
                  <Image
                    src={evidencePreviewUrl}
                    alt="Pratinjau foto bukti latihan"
                    width={640}
                    height={480}
                    unoptimized
                  />
                </div>
              ) : null}
            </section>
          ) : (
            <div className="notice training-read-only" role="note">
              <LockKeyhole aria-hidden="true" />
              <p>Anda dapat melihat catatan latihan regu ini. Pengisian hanya tersedia bagi pendamping regu.</p>
            </div>
          )}

          <section className="panel panel-pad training-log-list">
            <SectionHeading
              title="Catatan latihan"
              detail={`${teamLogs.length} catatan · tanda centang pada kalender menunjukkan hari latihan tercatat.`}
            />
            {teamLogs.length ? (
              <div className="activity-list">
                {teamLogs.map((log) => (
                  <div className="activity-row training-log-row" key={log.id}>
                    <span className="activity-copy">
                      <strong>{formatTrainingDate(log.trainingDate, "full")}</strong>
                      <span>Diisi pukul {formatTrainingTime(log.createdAt)} WIB</span>
                    </span>
                    <div className="training-log-actions">
                      {log.evidencePath && log.evidenceUrl ? (
                        <a
                          className="training-evidence-link"
                          href={log.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src={log.evidenceUrl}
                            alt={`Foto bukti latihan ${formatTrainingDate(log.trainingDate)}`}
                            width={640}
                            height={480}
                            unoptimized
                          />
                        </a>
                      ) : log.evidenceUrl ? (
                        <a
                          className="button button-secondary button-small"
                          href={log.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink aria-hidden="true" />
                          Buka tautan bukti
                        </a>
                      ) : log.evidenceDeletedAt ? (
                        <span className="field-hint">Foto dihapus setelah konfirmasi.</span>
                      ) : log.evidencePath ? (
                        <span className="field-hint">{log.evidenceUrlError ?? "Foto belum dapat ditampilkan."}</span>
                      ) : null}
                      {log.confirmedAt ? (
                        <span className="status-pill is-approved">
                          <CheckCircle2 aria-hidden="true" />
                          Terkonfirmasi
                        </span>
                      ) : (
                        <span className="status-pill is-pending">Menunggu konfirmasi</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Activity aria-hidden="true" />
                <strong>Belum ada catatan latihan</strong>
                <p>Catatan yang dikirim pendamping akan tampil di sini.</p>
              </div>
            )}
          </section>
        </>
      )}

      <canvas
        className="training-calendar-canvas"
        ref={canvasRef}
        width={920}
        height={420}
        aria-hidden="true"
      />
      {showCalendarImage ? (
        <div
          className="training-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCalendarImage(false);
          }}
        >
          <section
            className="training-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="training-calendar-dialog-title"
          >
            <div className="training-dialog-grip" aria-hidden="true" />
            <div className="training-dialog-heading">
              <div>
                <h2 id="training-calendar-dialog-title">{calendarMonthLabel}</h2>
                <p>
                  Regu {team?.name} · {formatTrainingDate(weekStart)} –{" "}
                  {formatTrainingDate(weekDates[6])}
                </p>
              </div>
              <button
                className="button button-secondary button-small training-calendar-download"
                type="button"
                disabled={!calendarImage}
                onClick={downloadCalendar}
              >
                <Download aria-hidden="true" />
                Unduh PNG
              </button>
            </div>
            <div className="training-calendar-summary training-dialog-summary">
              <div>
                <span>Hari latihan</span>
                <strong>{datesWithLogs.size}</strong>
              </div>
              <div>
                <span>Catatan pekan ini</span>
                <strong>{weekLogs.length}</strong>
              </div>
            </div>
            <div
              className="training-calendar training-dialog-calendar"
              role="group"
              aria-label="Kalender latihan satu pekan"
            >
              {weekDates.map((date) => {
                const hasLog = datesWithLogs.has(date);
                const isToday = date === today;
                return (
                  <button
                    className={`training-day${isToday ? " is-today" : ""}${hasLog ? " has-log" : ""}${selectedDate === date ? " is-selected" : ""}`}
                    key={date}
                    type="button"
                    aria-label={`${dateLabels.format(new Date(`${date}T12:00:00+07:00`))}, ${formatTrainingDate(date)}${hasLog ? ", ada catatan latihan" : ", belum ada catatan latihan"}`}
                    aria-pressed={selectedDate === date}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="training-day-weekday">
                      {dateLabels.format(new Date(`${date}T12:00:00+07:00`))}
                    </span>
                    <strong className="training-day-date">
                      {Number(date.slice(8))}
                    </strong>
                    <span
                      className={`training-day-status${hasLog ? " has-log" : ""}`}
                      aria-hidden="true"
                    >
                      {hasLog ? <Check /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="training-calendar-selected-day">
              {formatTrainingDate(selectedDate, "full")}
              {datesWithLogs.has(selectedDate)
                ? " · Latihan tercatat"
                : " · Belum ada latihan"}
            </p>
            {!calendarImage ? (
              <p className="inline-note" role="status">Menyiapkan kalender PNG…</p>
            ) : null}
            <div className="training-dialog-actions">
              <button
                className="button button-secondary"
                type="button"
                ref={closeCalendarButtonRef}
                onClick={() => setShowCalendarImage(false)}
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function TrainingReports({ notify }: { notify: Notify }) {
  const {
    data,
    confirmTrainingLog,
    deleteTrainingLogEvidence,
    dataRefreshError,
  } = useWorkspace();
  const [today, setToday] = React.useState(() => jakartaDate());
  const [period, setPeriod] = React.useState<TrainingReportPeriod>("daily");
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const intervalId = window.setInterval(() => setToday(jakartaDate()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const todayLogs = data.trainingLogs
    .filter((log) => log.trainingDate === today)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const range = reportDateRange(period, today);
  const exportLogs = data.trainingLogs
    .filter(
      (log) =>
        log.confirmedAt !== null &&
        log.trainingDate >= range.start &&
        log.trainingDate <= range.end,
    )
    .sort((left, right) => {
      const dateOrder = left.trainingDate.localeCompare(right.trainingDate);
      return dateOrder || left.createdAt.localeCompare(right.createdAt);
    });

  const downloadReport = () => {
    const workbook = createTrainingReportWorkbook(exportLogs, data.teams, range.label);
    const file = new Blob([`\uFEFF${workbook}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-latihan-${period}-${range.start}.xls`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Laporan ${period} berisi ${exportLogs.length} catatan terkonfirmasi.`);
  };

  const confirmLog = async (log: TrainingLog) => {
    setConfirmingId(log.id);
    try {
      const cleanupError = await confirmTrainingLog(log.id);
      if (cleanupError) {
        console.error("Foto latihan belum berhasil dihapus setelah konfirmasi.", cleanupError);
        notify("Latihan terkonfirmasi, tetapi fotonya belum terhapus. Coba hapus ulang.", true);
        return;
      }
      notify(`Latihan Regu ${data.teams.find((team) => team.id === log.teamId)?.name ?? ""} terkonfirmasi.`);
    } catch (error) {
      console.error("Gagal mengonfirmasi laporan latihan.", error);
      notify("Konfirmasi gagal disimpan. Muat ulang data dan coba lagi.", true);
    } finally {
      setConfirmingId(null);
    }
  };

  const retryEvidenceDeletion = async (log: TrainingLog) => {
    setConfirmingId(log.id);
    try {
      await deleteTrainingLogEvidence(log.id);
      notify("Foto bukti latihan berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus ulang foto latihan.", error);
      notify("Foto belum dapat dihapus. Periksa koneksi lalu coba lagi.", true);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <>
      <PageHeading
        title="Pengawasan latihan"
        description="Tinjau laporan harian secara langsung dan unduh rekap yang telah dikonfirmasi."
      />
      {dataRefreshError ? (
        <div className="notice" role="alert">
          <CircleHelp aria-hidden="true" />
          <p>{dataRefreshError}</p>
        </div>
      ) : null}
      <section className="panel panel-pad training-reports">
        <SectionHeading
          title="Laporan hari ini"
          detail={`${formatTrainingDate(today, "full")} · pembaruan otomatis`}
          action={<span className="role-chip">{todayLogs.length} laporan</span>}
        />
        {todayLogs.length ? (
          <div className="table-scroll">
            <table className="data-table training-report-table">
              <thead>
                <tr>
                  <th>Regu</th>
                  <th>Tanggal</th>
                  <th>Pukul</th>
                  <th>Bukti latihan</th>
                  <th>Konfirmasi</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log) => {
                  const logTeam = data.teams.find((team) => team.id === log.teamId);
                  return (
                    <tr key={log.id}>
                      <td><span className="table-primary">Regu {logTeam?.name ?? "Tidak diketahui"}</span></td>
                      <td>{formatTrainingDate(log.trainingDate)}</td>
                      <td>{formatTrainingTime(log.createdAt)} WIB</td>
                      <td>
                        {log.evidencePath && log.evidenceUrl ? (
                          <a
                            className="training-evidence-link"
                            href={log.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Image
                              src={log.evidenceUrl}
                              alt={`Foto bukti latihan Regu ${logTeam?.name ?? ""}`}
                              width={640}
                              height={480}
                              unoptimized
                            />
                          </a>
                        ) : log.evidenceUrl ? (
                          <a className="text-link" href={log.evidenceUrl} target="_blank" rel="noopener noreferrer">
                            Buka tautan <ExternalLink aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="field-hint">
                            {log.evidenceDeletedAt
                              ? "Foto sudah dihapus"
                              : log.evidenceUrlError ?? "Foto belum dapat ditampilkan"}
                          </span>
                        )}
                      </td>
                      <td>
                        {log.confirmedAt ? (
                          <div className="training-confirmation-status">
                            <span className="status-pill is-approved">
                              <CheckCircle2 aria-hidden="true" />
                              Terkonfirmasi
                            </span>
                            {log.evidencePath && !log.evidenceDeletedAt ? (
                              <button
                                className="button button-secondary button-small"
                                type="button"
                                disabled={confirmingId !== null}
                                onClick={() => void retryEvidenceDeletion(log)}
                              >
                                {confirmingId === log.id ? "Menghapus…" : "Coba hapus foto"}
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            className="button button-small"
                            type="button"
                            disabled={confirmingId !== null}
                            onClick={() => void confirmLog(log)}
                          >
                            {confirmingId === log.id ? "Menyimpan…" : "Konfirmasi"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Activity aria-hidden="true" />
            <strong>Belum ada laporan hari ini</strong>
            <p>Laporan baru akan muncul otomatis setelah pendamping mencatat latihan.</p>
          </div>
        )}
      </section>

      <section className="panel panel-pad training-report-download">
        <SectionHeading
          title="Unduh laporan terkonfirmasi"
          detail="Berkas XLS hanya berisi latihan yang sudah dikonfirmasi operator."
        />
        <div className="training-export-controls">
          <label>
            <span className="field-label">Periode laporan</span>
            <select
              className="field"
              value={period}
              onChange={(event) => setPeriod(event.target.value as TrainingReportPeriod)}
            >
              <option value="daily">Harian · hari ini</option>
              <option value="weekly">Mingguan · Senin–Minggu</option>
              <option value="monthly">Bulanan · bulan ini</option>
            </select>
          </label>
          <p className="training-export-summary">
            {range.label} · {exportLogs.length} catatan terkonfirmasi
          </p>
          <button className="button" type="button" onClick={downloadReport}>
            <Download aria-hidden="true" />
            Unduh XLS
          </button>
        </div>
        {!exportLogs.length ? (
          <p className="field-hint">Belum ada catatan terkonfirmasi pada periode ini. Berkas hanya akan memuat judul kolom.</p>
        ) : null}
      </section>
    </>
  );
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
    count: data.participants.filter((person) => person.schoolId === school.id).length,
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
      <DashboardGreeting
        fallbackName="Operator"
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
      <WorkspaceMenu role="operator" />
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
                    <th>Juri</th>
                    <th className="numeric">Akumulasi juri</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.map((score) => {
                    const team = getTeam(data, score.teamId);
                    const competition = getCompetition(data, score.competitionId);
                    return (
                      <tr key={score.id}>
                        <td>
                          <span className="table-primary">{team?.name ?? "Regu"}</span>
                          <span className="table-secondary">{team?.category}</span>
                        </td>
                        <td>{competition?.title ?? "Mata lomba"}</td>
                        <td>{score.judgeName || "Juri"}</td>
                        <td className="numeric">{score.score ?? "—"}</td>
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

function RoleWorkspaceDashboard({
  role,
}: {
  role: "juri" | "panitia" | "pendamping_regu";
}) {
  const dashboardCopy = {
    juri: {
      description: "Buka penugasan dan lanjutkan penilaian mata lomba.",
      fallbackName: "Juri",
    },
    panitia: {
      description: "Akses pos kegiatan dan pencatatan kehadiran regu.",
      fallbackName: "Panitia",
    },
    pendamping_regu: {
      description: "Kelola pendaftaran peserta dan data regu dampingan.",
      fallbackName: "Pendamping",
    },
  }[role];

  return (
    <>
      <DashboardGreeting
        fallbackName={dashboardCopy.fallbackName}
        description={dashboardCopy.description}
      />
      <WorkspaceMenu role={role} />
    </>
  );
}

function CompanionRegistration({ notify }: { notify: Notify }) {
  const { data, isConnected, profile, refreshWorkspace } = useWorkspace();
  const [fullName, setFullName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [credentials, setCredentials] = React.useState<
    Array<{ fullName: string; loginId: string; password: string }>
  >([]);
  const team = data.teams.find(
    (item) => item.pendampingId === profile?.id,
  );
  const participants = data.participants.filter(
    (participant) => participant.teamId === team?.id,
  );
  const school = data.schools.find((item) => item.id === profile?.school_id);

  const registerParticipant = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch("/api/pendamping/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const payload: unknown = await response.json();
      if (!isJsonRecord(payload)) {
        throw new Error("Respons pendaftaran peserta tidak valid.");
      }
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Akun peserta gagal dibuat.",
        );
      }
      if (
        typeof payload.fullName !== "string" ||
        typeof payload.loginId !== "string" ||
        typeof payload.temporaryPassword !== "string"
      ) {
        throw new Error("Server tidak mengembalikan kredensial akun yang valid.");
      }
      const { fullName: registeredName, loginId, temporaryPassword } = payload;
      setCredentials((current) => [
        {
          fullName: registeredName,
          loginId,
          password: temporaryPassword,
        },
        ...current,
      ]);
      setFullName("");
      try {
        await refreshWorkspace();
      } catch (error) {
        console.error("Akun dibuat, tetapi data regu gagal disegarkan.", error);
        notify("Akun dibuat, tetapi daftar peserta gagal disegarkan.", true);
        return;
      }
      notify("Akun peserta dibuat. Bagikan kredensial secara privat.");
    } catch (error) {
      console.error("Gagal mendaftarkan peserta pendamping.", error);
      notify(
        error instanceof Error ? error.message : "Akun peserta gagal dibuat.",
        true,
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Pendaftaran peserta"
        description="Daftarkan peserta ke regu yang ditugaskan kepada Anda. Akun dibuat khusus untuk regu tersebut."
      />
      {!isConnected ? (
        <div className="notice" role="note">
          <CircleHelp aria-hidden="true" />
          <p>Pendaftaran tersedia setelah aplikasi terhubung ke Supabase.</p>
        </div>
      ) : !team ? (
        <div className="notice" role="status">
          <CircleHelp aria-hidden="true" />
          <p>
            Belum ada regu yang ditugaskan. Hubungi Operator untuk menetapkan
            satu regu dan pangkalan pada akun Anda.
          </p>
        </div>
      ) : (
        <>
          <section className="panel panel-pad">
            <SectionHeading
              title={`${team.name} · ${team.category}`}
              detail={`Pangkalan: ${school?.name ?? "Belum ditetapkan"}. ${participants.length} peserta terdaftar.`}
            />
            <form className="school-fields" onSubmit={registerParticipant}>
              <label>
                <span className="field-label">Nama lengkap peserta</span>
                <input
                  className="field"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={1}
                  maxLength={150}
                  required
                />
              </label>
              <button
                className="button button-small"
                type="submit"
                disabled={
                  creating ||
                  !fullName.trim() ||
                  !profile?.school_id
                }
              >
                {creating ? "Membuat akun…" : "Daftarkan peserta"}
              </button>
            </form>
            {!profile?.school_id ? (
              <p className="field-hint" role="alert">
                Akun pendamping belum memiliki pangkalan. Minta Operator
                memperbarui data akun sebelum mendaftarkan peserta.
              </p>
            ) : null}
          </section>

          {credentials.length ? (
            <section className="panel panel-pad" style={{ marginTop: 18 }}>
              <SectionHeading
                title="Kredensial peserta baru"
                detail="Simpan dan bagikan secara privat. Kata sandi sementara tidak dapat dilihat kembali setelah meninggalkan halaman."
              />
              <div className="activity-list companion-credentials">
                {credentials.map((credential) => (
                  <div className="activity-row" key={credential.loginId}>
                    <span className="activity-copy">
                      <strong>{credential.fullName}</strong>
                      <span>
                        ID pengguna: <code>{credential.loginId}</code>
                      </span>
                      <span>
                        Kata sandi sementara: <code>{credential.password}</code>
                      </span>
                    </span>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          <section className="panel panel-pad" style={{ marginTop: 18 }}>
            <SectionHeading title="Peserta regu" />
            {participants.length ? (
              <div className="activity-list">
                {participants.map((participant) => (
                  <div className="activity-row" key={participant.id}>
                    <span className="activity-copy">
                      <strong>{participant.name}</strong>
                      <span>{participant.isPinru ? "Pinru" : "Peserta"}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Users aria-hidden="true" />
                <strong>Belum ada peserta</strong>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

type ManagedAccount = {
  id: string;
  loginId: string;
  fullName: string;
  role: Role;
  schoolId: string | null;
  teamId: string | null;
  isPinru: boolean;
  isActive: boolean;
};

const accountRoleLabels: Record<Role, string> = {
  operator: "Operator",
  panitia: "Panitia",
  juri: "Juri",
  peserta: "Peserta",
  pendamping_regu: "Pendamping regu",
};

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[<>&'"]/g, (character) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      };
      return entities[character] ?? character;
    });
}

function createAccountsWorkbook(
  accounts: Array<ManagedAccount & { password: string }>,
  teams: Team[],
) {
  const roles: Role[] = [
    "peserta",
    "pendamping_regu",
    "panitia",
    "juri",
    "operator",
  ];
  const worksheets = roles
    .map((role) => {
      const rows = accounts
        .filter((account) => account.role === role)
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((account) => {
          const team = teams.find((item) => item.id === account.teamId);
          return [
            account.fullName,
            account.loginId,
            account.password,
            team?.name ?? "",
            account.role === "peserta" ? (account.isPinru ? "Ya" : "Tidak") : "",
          ];
        });
      const tableRows = [
        ["Nama lengkap", "ID pengguna", "Password", "Regu", "Pinru"],
        ...rows,
      ]
        .map(
          (row) =>
            `<Row>${row
              .map(
                (cell) =>
                  `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`,
              )
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${accountRoleLabels[role]}"><Table>${tableRows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheets}</Workbook>`;
}

function isManagedAccount(value: unknown): value is ManagedAccount {
  if (!isJsonRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.loginId === "string" &&
    typeof value.fullName === "string" &&
    (value.role === "operator" ||
      value.role === "panitia" ||
      value.role === "juri" ||
      value.role === "peserta" ||
      value.role === "pendamping_regu") &&
    (typeof value.schoolId === "string" || value.schoolId === null) &&
    (typeof value.teamId === "string" || value.teamId === null) &&
    typeof value.isPinru === "boolean" &&
    typeof value.isActive === "boolean"
  );
}

function isExportedAccount(
  value: unknown,
): value is ManagedAccount & { password: string } {
  return (
    isJsonRecord(value) &&
    typeof value.password === "string" &&
    isManagedAccount(value)
  );
}

function isAccountRole(value: unknown): value is Role {
  return (
    value === "operator" ||
    value === "panitia" ||
    value === "juri" ||
    value === "peserta" ||
    value === "pendamping_regu"
  );
}

function AccountManagement({ notify }: { notify: Notify }) {
  const {
    data,
    isConnected,
    currentUserId,
    refreshWorkspace,
    setTeamPinru,
  } = useWorkspace();
  const [accounts, setAccounts] = React.useState<ManagedAccount[]>([]);
  const [selectedRoles, setSelectedRoles] = React.useState<Record<string, Role>>(
    {},
  );
  const [selectedTeams, setSelectedTeams] = React.useState<
    Record<string, string>
  >({});
  const [loginId, setLoginId] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<Role>("peserta");
  const [teamId, setTeamId] = React.useState("");
  const [schoolId, setSchoolId] = React.useState(data.schools[0]?.id ?? "");
  const [isPinru, setIsPinru] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [busyAccountId, setBusyAccountId] = React.useState("");
  const [apiError, setApiError] = React.useState("");
  const [temporaryPassword, setTemporaryPassword] = React.useState("");
  const [exportingAccounts, setExportingAccounts] = React.useState(false);
  const [accountRoleFilter, setAccountRoleFilter] = React.useState<Role | "all">(
    "all",
  );
  const [draftRestored, setDraftRestored] = React.useState(false);
  const accountDraftKey = `lt1:account-create-draft:${currentUserId}`;
  const visibleAccounts =
    accountRoleFilter === "all"
      ? accounts
      : accounts.filter((account) => account.role === accountRoleFilter);

  React.useEffect(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(accountDraftKey);
      if (savedDraft) {
        const draft: unknown = JSON.parse(savedDraft);
        if (isJsonRecord(draft)) {
          if (typeof draft.loginId === "string") setLoginId(draft.loginId);
          if (typeof draft.fullName === "string") setFullName(draft.fullName);
          if (isAccountRole(draft.role)) setRole(draft.role);
          if (typeof draft.teamId === "string") setTeamId(draft.teamId);
          if (typeof draft.schoolId === "string") setSchoolId(draft.schoolId);
          if (typeof draft.isPinru === "boolean") setIsPinru(draft.isPinru);
        }
      }
    } catch (error) {
      console.error("Draf pembuatan akun gagal dipulihkan.", error);
    } finally {
      setDraftRestored(true);
    }
  }, [accountDraftKey]);

  React.useEffect(() => {
    if (!draftRestored) return;
    try {
      if (
        !loginId &&
        !fullName &&
        role === "peserta" &&
        !teamId &&
        !schoolId &&
        !isPinru
      ) {
        window.sessionStorage.removeItem(accountDraftKey);
        return;
      }
      window.sessionStorage.setItem(
        accountDraftKey,
        JSON.stringify({ loginId, fullName, role, teamId, schoolId, isPinru }),
      );
    } catch (error) {
      console.error("Draf pembuatan akun gagal disimpan.", error);
    }
  }, [
    accountDraftKey,
    draftRestored,
    fullName,
    isPinru,
    loginId,
    role,
    schoolId,
    teamId,
  ]);

  const request = async (method: string, body?: Record<string, unknown>) => {
    const response = await fetch("/api/operator/accounts", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload: unknown = await response.json();
    if (!isJsonRecord(payload)) {
      throw new Error("Respons pengelolaan akun tidak valid.");
    }
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "Permintaan pengelolaan akun gagal.",
      );
    }
    return payload;
  };

  const refreshAccounts = React.useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const payload = await request("GET");
      if (!Array.isArray(payload.accounts) || !payload.accounts.every(isManagedAccount)) {
        throw new Error("Data akun dari server tidak sesuai format.");
      }
      setAccounts(payload.accounts);
      setSelectedRoles(
        Object.fromEntries(
          payload.accounts.map((account) => [account.id, account.role]),
        ),
      );
      setSelectedTeams(
        Object.fromEntries(
          payload.accounts.map((account) => [account.id, account.teamId ?? ""]),
        ),
      );
    } catch (error) {
      console.error("Gagal memuat daftar akun.", error);
      setApiError(
        error instanceof Error ? error.message : "Daftar akun gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isConnected) void refreshAccounts();
  }, [isConnected, refreshAccounts]);

  React.useEffect(() => {
    if (!schoolId && data.schools.length) setSchoolId(data.schools[0].id);
  }, [data.schools, schoolId]);

  const downloadAccounts = async () => {
    if (
      !window.confirm(
        "Untuk mengunduh XLS, password semua akun terdaftar akan direset dan diganti. Password lama tidak dapat dipulihkan. Pastikan file dapat disimpan dengan aman setelah diunduh. Lanjutkan?",
      )
    ) {
      return;
    }

    setExportingAccounts(true);
    try {
      const payload = await request("POST", {
        action: "export-passwords",
        confirmation: "reset-all-passwords",
      });
      if (
        !Array.isArray(payload.accounts) ||
        !payload.accounts.every(isExportedAccount) ||
        !Array.isArray(payload.failedUserIds) ||
        !payload.failedUserIds.every(
          (userId): userId is string => typeof userId === "string",
        )
      ) {
        throw new Error("Respons ekspor akun tidak valid.");
      }

      const exportedAccounts = payload.accounts;
      if (!exportedAccounts.length) {
        throw new Error(
          "Tidak ada password akun yang berhasil direset. File XLS tidak dibuat.",
        );
      }

      const workbook = createAccountsWorkbook(exportedAccounts, data.teams);
      const file = new Blob([workbook], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `akun-terdaftar-${new Date().toISOString().slice(0, 10)}.xls`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      const failedCount = payload.failedUserIds.length;
      if (failedCount) {
        notify(
          `XLS berisi ${exportedAccounts.length} akun. ${failedCount} akun gagal direset dan tidak disertakan.`,
          true,
        );
      } else {
        notify(
          `XLS ${exportedAccounts.length} akun berhasil diunduh. Simpan file dengan aman dan bagikan password secara privat.`,
        );
      }
    } catch (error) {
      console.error("Gagal mengekspor akun dan mereset password.", error);
      notify(
        error instanceof Error ? error.message : "XLS akun gagal dibuat.",
        true,
      );
    } finally {
      setExportingAccounts(false);
    }
  };

  const deleteAccount = async (account: ManagedAccount) => {
    if (account.id === currentUserId) {
      notify("Operator tidak dapat menghapus akunnya sendiri.", true);
      return;
    }
    if (
      !window.confirm(
        `Hapus akun ${account.fullName} (@${account.loginId}) secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setBusyAccountId(account.id);
    setTemporaryPassword("");
    try {
      await request("DELETE", { userId: account.id });
      setAccounts((current) =>
        current.filter((item) => item.id !== account.id),
      );
      setSelectedRoles((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      setSelectedTeams((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      try {
        await refreshWorkspace();
      } catch (error) {
        console.error("Akun dihapus, tetapi workspace gagal disegarkan.", error);
        notify("Akun dihapus, tetapi data workspace gagal disegarkan.", true);
        return;
      }
      notify(`Akun ${account.fullName} berhasil dihapus.`);
    } catch (error) {
      console.error("Gagal menghapus akun.", error);
      notify(error instanceof Error ? error.message : "Akun gagal dihapus.", true);
    } finally {
      setBusyAccountId("");
    }
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemporaryPassword("");
    const shouldBePinru = role === "peserta" && isPinru && Boolean(teamId);
    try {
      const payload = await request("POST", {
        action: "create",
        loginId,
        fullName,
        role,
        teamId: role === "peserta" ? teamId || null : null,
        schoolId:
          role === "peserta" || role === "pendamping_regu"
            ? schoolId || null
            : null,
        isPinru: false,
      });
      const createdAccount = payload.account;
      if (!isManagedAccount(createdAccount) || typeof payload.temporaryPassword !== "string") {
        throw new Error("Server tidak mengembalikan informasi akun yang valid.");
      }
      setTemporaryPassword(payload.temporaryPassword);
      setLoginId("");
      setFullName("");
      setRole("peserta");
      setTeamId("");
      setSchoolId(data.schools[0]?.id ?? "");
      setIsPinru(false);

      let account = createdAccount;
      if (shouldBePinru && createdAccount.teamId) {
        try {
          await setTeamPinru(createdAccount.id, createdAccount.teamId);
          account = { ...createdAccount, isPinru: true };
        } catch (error) {
          console.error("Akun dibuat, tetapi penetapan Pinru gagal.", error);
          setAccounts((current) => [...current, createdAccount]);
          setSelectedRoles((current) => ({
            ...current,
            [createdAccount.id]: createdAccount.role,
          }));
          setSelectedTeams((current) => ({
            ...current,
            [createdAccount.id]: createdAccount.teamId ?? "",
          }));
          await refreshAccounts();
          notify(
            `Akun berhasil dibuat, tetapi penetapan Pinru gagal: ${
              error instanceof Error ? error.message : "kesalahan tidak diketahui"
            }`,
            true,
          );
          return;
        }
      }

      setAccounts((current) => [...current, account]);
      setSelectedRoles((current) => ({
        ...current,
        [account.id]: account.role,
      }));
      setSelectedTeams((current) => ({
        ...current,
        [account.id]: account.teamId ?? "",
      }));
      try {
        await refreshWorkspace();
      } catch (error) {
        console.error("Akun dibuat, tetapi data workspace gagal disegarkan.", error);
        notify("Akun dibuat, tetapi data workspace gagal disegarkan.", true);
        return;
      }
      notify("Akun dibuat. Simpan kata sandi sementara dan bagikan secara privat.");
    } catch (error) {
      console.error("Gagal membuat akun.", error);
      notify(error instanceof Error ? error.message : "Akun gagal dibuat.", true);
    }
  };

  const updateAccount = async (
    account: ManagedAccount,
    action: "toggle-active" | "reset-password" | "update-role" | "map-team",
  ) => {
    setBusyAccountId(account.id);
    setTemporaryPassword("");
    try {
      const payload = await request("PATCH", {
        action,
        userId: account.id,
        ...(action === "toggle-active"
          ? { isActive: !account.isActive }
          : action === "update-role"
            ? { role: selectedRoles[account.id] }
            : action === "map-team"
              ? { teamId: selectedTeams[account.id] || null }
              : {}),
      });
      if (action === "toggle-active") {
        if (typeof payload.isActive !== "boolean") {
          throw new Error("Server tidak mengembalikan status akun yang valid.");
        }
        setAccounts((current) =>
          current.map((item) =>
            item.id === account.id
              ? { ...item, isActive: payload.isActive as boolean }
              : item,
          ),
        );
        await refreshWorkspace();
        notify(
          payload.isActive ? "Akun berhasil diaktifkan." : "Akun dinonaktifkan.",
        );
      } else {
        if (action === "reset-password") {
          if (typeof payload.temporaryPassword !== "string") {
            throw new Error("Server tidak mengembalikan kata sandi sementara.");
          }
          setTemporaryPassword(payload.temporaryPassword);
          notify("Kata sandi sementara berhasil dibuat. Bagikan secara privat.");
        } else if (action === "update-role") {
          const updatedRole = payload.role;
          if (
            updatedRole !== "operator" &&
            updatedRole !== "panitia" &&
            updatedRole !== "juri" &&
            updatedRole !== "peserta" &&
            updatedRole !== "pendamping_regu"
          ) {
            throw new Error("Server tidak mengembalikan peran yang valid.");
          }
          setAccounts((current) =>
            current.map((item) =>
              item.id === account.id
                ? {
                    ...item,
                    role: updatedRole,
                    ...(updatedRole === "peserta"
                      ? {}
                      : { teamId: null, isPinru: false }),
                  }
                : item,
            ),
          );
          await refreshWorkspace();
          notify("Peran akun berhasil diperbarui.");
        } else {
          if (
            (typeof payload.teamId !== "string" && payload.teamId !== null) ||
            typeof payload.isPinru !== "boolean"
          ) {
            throw new Error("Server tidak mengembalikan pemetaan regu yang valid.");
          }
          setAccounts((current) =>
            current.map((item) =>
              item.id === account.id
                ? {
                    ...item,
                    teamId: payload.teamId as string | null,
                    isPinru: payload.isPinru as boolean,
                  }
                : item,
            ),
          );
          await refreshWorkspace();
          notify("Pemetaan regu berhasil diperbarui.");
        }
      }
    } catch (error) {
      console.error("Gagal memperbarui akun.", error);
      notify(error instanceof Error ? error.message : "Akun gagal diperbarui.", true);
    } finally {
      setBusyAccountId("");
    }
  };

  return (
    <>
      <PageHeading
        title="Manajemen akun"
        description="Buat akun, tetapkan peran dan regu, nonaktifkan akses, atau mulai reset kata sandi."
      />
      {!isConnected ? (
        <div className="notice" role="note">
          <CircleHelp aria-hidden="true" />
          <p>Pengelolaan akun tersedia setelah aplikasi terhubung ke Supabase.</p>
        </div>
      ) : (
        <>
          <section className="panel panel-pad">
            <SectionHeading
              title="Buat akun"
              detail="Draf otomatis tersimpan di tab ini tanpa kata sandi sampai tab ditutup. Kata sandi sementara hanya ditampilkan setelah akun berhasil dibuat."
            />
            <form className="school-fields" onSubmit={createAccount}>
              <label>
                <span className="field-label">Nama lengkap</span>
                <input
                  className="field"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={1}
                  maxLength={150}
                  required
                />
              </label>
              <label>
                <span className="field-label">ID pengguna</span>
                <input
                  className="field"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  pattern="[a-z0-9]+([.-][a-z0-9]+)*"
                  title="Gunakan huruf kecil, angka, titik, atau tanda hubung."
                  required
                />
              </label>
              <label>
                <span className="field-label">Peran</span>
                <select
                  className="field"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value as Role);
                    setIsPinru(false);
                  }}
                >
                  <option value="peserta">Peserta</option>
                  <option value="panitia">Panitia</option>
                  <option value="juri">Juri</option>
                  <option value="pendamping_regu">Pendamping regu</option>
                  <option value="operator">Operator pusat</option>
                </select>
              </label>
              {role === "peserta" || role === "pendamping_regu" ? (
                <>
                  {role === "peserta" ? (
                    <label>
                      <span className="field-label">Regu</span>
                      <select
                        className="field"
                        value={teamId}
                        onChange={(event) => setTeamId(event.target.value)}
                      >
                        <option value="">Belum dipetakan</option>
                        {data.teams.map((team) => (
                          <option value={team.id} key={team.id}>
                            {team.name} · {team.category}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label>
                    <span className="field-label">Pangkalan</span>
                    <select
                      className="field"
                      value={schoolId}
                      onChange={(event) => setSchoolId(event.target.value)}
                      required
                    >
                      <option value="">Pilih pangkalan</option>
                      {data.schools.map((school) => (
                        <option value={school.id} key={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {role === "peserta" ? (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={isPinru}
                        disabled={!teamId}
                        onChange={(event) => setIsPinru(event.target.checked)}
                      />
                      Tetapkan sebagai Pinru
                    </label>
                  ) : (
                    <p className="field-hint">
                      Operator dapat menetapkan satu regu untuk pendamping setelah akun dibuat.
                    </p>
                  )}
                </>
              ) : null}
              <button
                className="button button-small"
                type="submit"
                disabled={
                  loading ||
                  !fullName.trim() ||
                  !loginId.trim() ||
                  ((role === "peserta" || role === "pendamping_regu") &&
                    !schoolId)
                }
              >
                Buat akun
              </button>
            </form>
          </section>

          {temporaryPassword ? (
            <div className="notice" role="status" style={{ marginTop: 16 }}>
              <LockKeyhole aria-hidden="true" />
              <p>
                Kata sandi sementara (tampilkan sekali dan bagikan secara privat):
                <code>{temporaryPassword}</code>
              </p>
            </div>
          ) : null}

          <section className="panel panel-pad" style={{ marginTop: 18 }}>
            <SectionHeading
              title="Akun terdaftar"
              detail={
                loading
                  ? "Memuat akun…"
                  : accountRoleFilter === "all"
                    ? `${accounts.length} akun`
                    : `${visibleAccounts.length} dari ${accounts.length} akun`
              }
              action={
                <div className="account-list-actions">
                  <label className="sr-only" htmlFor="account-role-filter">
                    Tampilkan akun berdasarkan peran
                  </label>
                  <select
                    id="account-role-filter"
                    className="filter-select"
                    value={accountRoleFilter}
                    onChange={(event) =>
                      setAccountRoleFilter(event.target.value as Role | "all")
                    }
                  >
                    <option value="all">Semua peran</option>
                    <option value="peserta">Peserta</option>
                    <option value="panitia">Panitia</option>
                    <option value="juri">Juri</option>
                    <option value="pendamping_regu">Pendamping regu</option>
                    <option value="operator">Operator</option>
                  </select>
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    disabled={loading || exportingAccounts || !accounts.length}
                    onClick={() => void downloadAccounts()}
                  >
                    <Download aria-hidden="true" />
                    {exportingAccounts ? "Menyiapkan XLS…" : "Unduh XLS"}
                  </button>
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    disabled={loading}
                    onClick={() => void refreshAccounts()}
                  >
                    Muat ulang
                  </button>
                </div>
              }
            />
            {apiError ? (
              <p className="field-hint" role="alert">
                {apiError}. Pastikan migration hak akses sudah diterapkan dan
                secret Supabase tersedia di server.
              </p>
            ) : loading ? (
              <p className="inline-note">Memuat daftar akun…</p>
            ) : visibleAccounts.length ? (
              <div className="activity-list">
                {visibleAccounts.map((account) => {
                  const team = data.teams.find((item) => item.id === account.teamId);
                  const school = data.schools.find(
                    (item) => item.id === account.schoolId,
                  );
                  return (
                    <div
                      className="activity-row account-list-item"
                      key={account.id}
                    >
                      <span className="activity-copy">
                        <strong>{account.fullName}</strong>
                        <span>
                          @{account.loginId} · {accountRoleLabels[account.role]}
                          {team ? ` · Regu ${team.name}` : ""}
                          {school ? ` · ${school.name}` : ""}
                          {account.isPinru ? " · Pinru" : ""}
                        </span>
                      </span>
                      <div className="account-row-actions">
                        <label className="sr-only" htmlFor={`account-role-${account.id}`}>
                          Peran untuk {account.fullName}
                        </label>
                        <select
                          id={`account-role-${account.id}`}
                          className="filter-select"
                          value={selectedRoles[account.id] ?? account.role}
                          disabled={busyAccountId === account.id}
                          onChange={(event) =>
                            setSelectedRoles((current) => ({
                              ...current,
                              [account.id]: event.target.value as Role,
                            }))
                          }
                        >
                          <option value="peserta">Peserta</option>
                          <option value="panitia">Panitia</option>
                          <option value="juri">Juri</option>
                          <option value="operator">Operator</option>
                        </select>
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          disabled={
                            busyAccountId === account.id ||
                            account.id === currentUserId ||
                            (selectedRoles[account.id] ?? account.role) === account.role
                          }
                          onClick={() =>
                            void updateAccount(account, "update-role")
                          }
                        >
                          Simpan peran
                        </button>
                        {account.role === "peserta" ||
                        account.role === "pendamping_regu" ? (
                          <>
                            <label
                              className="sr-only"
                              htmlFor={`account-team-${account.id}`}
                            >
                              Regu untuk {account.fullName}
                            </label>
                            <select
                              id={`account-team-${account.id}`}
                              className="filter-select"
                              value={selectedTeams[account.id] ?? ""}
                              disabled={busyAccountId === account.id}
                              onChange={(event) =>
                                setSelectedTeams((current) => ({
                                  ...current,
                                  [account.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="">
                                {account.role === "peserta"
                                  ? "Belum dipetakan"
                                  : "Belum ditugaskan"}
                              </option>
                              {data.teams.map((team) => (
                                <option
                                  key={team.id}
                                  value={team.id}
                                  disabled={
                                    account.role === "pendamping_regu" &&
                                    Boolean(
                                      team.pendampingId &&
                                        team.pendampingId !== account.id,
                                    )
                                  }
                                >
                                  {team.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="button button-secondary button-small"
                              type="button"
                              disabled={
                                busyAccountId === account.id ||
                                (selectedTeams[account.id] ?? "") ===
                                  (account.teamId ?? "")
                              }
                              onClick={() => void updateAccount(account, "map-team")}
                            >
                              {account.role === "peserta"
                                ? "Simpan regu"
                                : "Tugaskan regu"}
                            </button>
                          </>
                        ) : null}
                        <span
                          className={`status-pill${account.isActive ? " is-approved" : ""}`}
                        >
                          {account.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          disabled={busyAccountId === account.id}
                          onClick={() =>
                            void updateAccount(account, "reset-password")
                          }
                        >
                          Reset kata sandi
                        </button>
                        <button
                          className="button button-small"
                          type="button"
                          disabled={busyAccountId === account.id}
                          onClick={() =>
                            void updateAccount(account, "toggle-active")
                          }
                        >
                          {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          className="button button-danger button-small"
                          type="button"
                          disabled={
                            busyAccountId === account.id ||
                            account.id === currentUserId
                          }
                          onClick={() => void deleteAccount(account)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Users aria-hidden="true" />
                <strong>
                  {accounts.length
                    ? "Tidak ada akun dengan peran ini"
                    : "Belum ada akun yang dapat ditampilkan"}
                </strong>
              </div>
            )}
          </section>
        </>
      )}
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
    const matchesSearch = `${team?.name ?? ""} ${competition?.title ?? ""} ${score.judgeName ?? ""}`
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
          detail={`${visibleScores.length} nilai juri ditampilkan. Akumulasi lomba menjumlahkan nilai juri yang sudah disetujui.`}
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
                  <th>Juri</th>
                  <th className="numeric">Akumulasi juri</th>
                  <th className="numeric">Akumulasi lomba</th>
                  <th>Catatan juri</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleScores.map((score) => {
                  const team = getTeam(data, score.teamId);
                  const competition = getCompetition(data, score.competitionId);
                  const approvedScores = data.scores.filter(
                    (record) =>
                      record.teamId === score.teamId &&
                      record.competitionId === score.competitionId &&
                      record.status === "approved",
                  );
                  const approvedScoreTotal = approvedScores.reduce(
                    (total, record) => total + (record.score ?? 0),
                    0,
                  );
                  return (
                    <tr key={score.id}>
                      <td>
                        <span className="table-primary">{team?.name}</span>
                        <span className="table-secondary">
                          {team?.category}
                        </span>
                      </td>
                      <td>{competition?.title}</td>
                      <td>{score.judgeName || "Juri"}</td>
                      <td className="numeric">
                        <strong>{score.score ?? "—"}</strong>
                        {competition?.criteria.length ? (
                          <span className="table-secondary score-breakdown">
                            {competition.criteria
                              .map((criterion) => {
                                const value =
                                  score.criterionScores?.[criterion.id];
                                return value === undefined
                                  ? null
                                  : `${criterion.name}: ${value}`;
                              })
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="numeric">
                        {approvedScores.length ? (
                          <>
                            <strong>{approvedScoreTotal}</strong>
                            <span className="table-secondary">
                              {approvedScores.length} juri disetujui
                            </span>
                          </>
                        ) : (
                          "Menunggu"
                        )}
                      </td>
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
          const participantCount = data.participants.filter(
            (person) => person.schoolId === school.id,
          ).length;
          return (
            <section className="school-card" key={school.id}>
              <div className="school-card-head">
                <div className="school-card-title">
                  <Landmark aria-hidden="true" />
                  <div>
                    <h2>{school.name}</h2>
                    <p>
                      {school.schoolType} · {participantCount} peserta terdaftar
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
          <p>Tambahkan pangkalan agar dapat dipilih saat membuat akun peserta.</p>
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
    Record<
      string,
      {
        criterionScores: Record<string, string>;
        score: string;
        feedback: string;
      }
    >
  >({});
  React.useEffect(() => {
    if (!judgeCompetitions.some((item) => item.id === competitionId)) {
      setCompetitionId(judgeCompetitions[0]?.id ?? "");
      setScoreDrafts({});
    }
  }, [competitionId, judgeCompetitions]);
  const competition = judgeCompetitions.find((item) => item.id === competitionId);

  const draftFor = (teamId: string) => {
    const saved = getJudgeScore(
      data.scores,
      teamId,
      competitionId,
      currentUserId,
      isConnected,
    );
    return (
      scoreDrafts[teamId] ?? {
        criterionScores: Object.fromEntries(
          (competition?.criteria ?? []).map((criterion) => [
            criterion.id,
            saved?.criterionScores?.[criterion.id] === undefined
              ? ""
              : String(saved.criterionScores[criterion.id]),
          ]),
        ),
        score:
          saved?.score === null || !saved || competition?.criteria.length
            ? ""
            : String(saved.score),
        feedback: saved?.feedback ?? "",
      }
    );
  };

  const updateDraft = (
    teamId: string,
    property: "score" | "feedback" | "criterionScore",
    value: string,
    criterionId?: string,
  ) => {
    setScoreDrafts((drafts) => ({
      ...drafts,
      [teamId]: {
        ...draftFor(teamId),
        ...(property === "criterionScore" && criterionId
          ? {
              criterionScores: {
                ...draftFor(teamId).criterionScores,
                [criterionId]: value,
              },
            }
          : property === "feedback"
            ? { feedback: value }
            : { score: value }),
      },
    }));
  };

  const save = async (teamId: string, status: ScoreStatus) => {
    const draft = draftFor(teamId);
    const criterionScores: Record<string, number> = {};
    let value = 0;
    if (competition?.criteria.length) {
      for (const criterion of competition.criteria) {
        const score = Number(draft.criterionScores[criterion.id]);
        if (
          draft.criterionScores[criterion.id] === "" ||
          !Number.isFinite(score) ||
          score < 0 ||
          score > 100
        ) {
          notify(`Masukkan nilai 0–100 untuk kriteria “${criterion.name}”.`, true);
          return;
        }
        criterionScores[criterion.id] = score;
        value += score;
      }
      value = Math.round(value * 100) / 100;
    } else {
      value = Number(draft.score);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        notify("Masukkan nilai antara 0 sampai 100.", true);
        return;
      }
    }
    const saved = getJudgeScore(
      data.scores,
      teamId,
      competitionId,
      currentUserId,
      isConnected,
    );
    const nextStatus =
      saved?.status === "pending_review" && status === "draft"
        ? "pending_review"
        : status;
    try {
      await updateScore(
        teamId,
        competitionId,
        value,
        criterionScores,
        draft.feedback.trim(),
        nextStatus,
      );
      notify(
        nextStatus === "pending_review"
          ? saved?.status === "pending_review"
            ? "Perubahan nilai tersimpan dan tetap menunggu tinjauan operator."
            : "Nilai dikirim ke operator untuk ditinjau."
          : "Draf nilai berhasil disimpan.",
      );
    } catch (error) {
      console.error("Gagal menyimpan nilai juri.", error);
      notify("Nilai gagal disimpan. Pastikan Anda ditugaskan pada mata lomba ini.", true);
    }
  };

  const selectedScores = data.scores.filter(
    (score) =>
      score.competitionId === competitionId &&
      (!isConnected || score.judgeId === currentUserId),
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
            Nilai tiap kriteria dijumlahkan menjadi akumulasi nilai juri.
            Setelah disetujui operator, nilai terkunci untuk juri.
          </p>
        </div>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Regu peserta</th>
                {competition?.criteria.length ? (
                  competition.criteria.map((criterion) => (
                    <th key={criterion.id}>{criterion.name} (0–100)</th>
                  ))
                ) : (
                  <th>Nilai (0–100)</th>
                )}
                <th className="numeric">Akumulasi</th>
                <th>Catatan evaluasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((team) => {
                const saved = getJudgeScore(
                  data.scores,
                  team.id,
                  competitionId,
                  currentUserId,
                  isConnected,
                );
                const draft = draftFor(team.id);
                const disabled = saved?.status === "approved";
                const enteredScores = competition?.criteria.map(
                  (criterion) => draft.criterionScores[criterion.id],
                );
                const total = enteredScores?.every((score) => score !== "")
                  ? Math.round(
                      enteredScores.reduce(
                        (sum, score) => sum + Number(score),
                        0,
                      ) * 100,
                    ) / 100
                  : null;
                return (
                  <tr key={team.id}>
                    <td>
                      <span className="table-primary">{team.name}</span>
                      <span className="table-secondary">{team.category}</span>
                    </td>
                    {competition?.criteria.length ? (
                      competition.criteria.map((criterion) => (
                        <td key={criterion.id}>
                          <label
                            className="sr-only"
                            htmlFor={`score-${team.id}-${criterion.id}`}
                          >
                            Nilai {criterion.name} untuk regu {team.name}
                          </label>
                          <input
                            id={`score-${team.id}-${criterion.id}`}
                            className="score-input"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            inputMode="decimal"
                            value={draft.criterionScores[criterion.id] ?? ""}
                            disabled={disabled}
                            onChange={(event) =>
                              updateDraft(
                                team.id,
                                "criterionScore",
                                event.target.value,
                                criterion.id,
                              )
                            }
                          />
                        </td>
                      ))
                    ) : (
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
                    )}
                    <td className="numeric">
                      <strong>
                        {competition?.criteria.length
                          ? (total ?? "—")
                          : draft.score || "—"}
                      </strong>
                      {competition?.criteria.length ? (
                        <span className="table-secondary">poin</span>
                      ) : null}
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

type CompetitionWorkspaceMode = "competitions" | "judges" | "panitia";

function CompetitionWorkspace({
  notify,
  mode,
}: {
  notify: Notify;
  mode: CompetitionWorkspaceMode;
}) {
  const {
    data,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    assignJudge,
    removeJudgeAssignment,
    assignPanitia,
    removePanitiaAssignment,
  } = useWorkspace();
  const [competitionId, setCompetitionId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [criteria, setCriteria] = React.useState([""]);
  const [selectedJudges, setSelectedJudges] = React.useState<
    Record<string, string>
  >({});
  const [selectedPanitia, setSelectedPanitia] = React.useState<
    Record<string, string>
  >({});
  const [editingCompetition, setEditingCompetition] = React.useState<{
    id: string;
    title: string;
    description: string;
    taskType: Competition["taskType"];
    criteria: string[];
  } | null>(null);
  const [taskType, setTaskType] =
    React.useState<Competition["taskType"]>("live");
  const [creating, setCreating] = React.useState(false);
  const [assignmentBusy, setAssignmentBusy] = React.useState(false);
  const [savingCompetition, setSavingCompetition] = React.useState(false);
  const [deletingCompetition, setDeletingCompetition] = React.useState("");

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
      {mode === "competitions" ? (
        <>
          <PageHeading
            title="Mata lomba"
            description="Siapkan pos dan tugas sebelum peserta mulai mengerjakan."
          />
      <section className="panel panel-pad">
        <SectionHeading
          title="Tambah mata lomba"
          detail="Tentukan kriteria yang akan dinilai juri untuk mata lomba ini."
        />
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            const names = criteria.map((name) => name.trim());
            if (names.some((name) => !name)) {
              notify("Lengkapi semua kriteria penilaian.", true);
              return;
            }
            if (names.some((name) => name.length > 120)) {
              notify("Nama kriteria maksimal 120 karakter.", true);
              return;
            }
            if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
              notify("Nama kriteria penilaian tidak boleh duplikat.", true);
              return;
            }
            setCreating(true);
            void createCompetition({
              id: competitionId,
              title: title.trim(),
              description: description.trim(),
              taskType,
              criteria: names.map((name) => ({
                id: crypto.randomUUID(),
                name,
              })),
              isActive: false,
            })
              .then(() => {
                setCompetitionId("");
                setTitle("");
                setDescription("");
                setCriteria([""]);
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
          <fieldset className="form-stack criteria-editor">
            <legend className="field-label">Kriteria penilaian</legend>
            <p className="field-hint">
              Juri memberi nilai 0–100 untuk setiap kriteria. Nilai akhir juri
              adalah jumlah semua kriteria.
            </p>
            {criteria.map((criterion, index) => (
              <div className="criteria-editor-row" key={index}>
                <label>
                  <span className="field-label">Kriteria {index + 1}</span>
                  <input
                    className="field"
                    value={criterion}
                    maxLength={120}
                    onChange={(event) =>
                      setCriteria((current) =>
                        current.map((name, currentIndex) =>
                          currentIndex === index ? event.target.value : name,
                        ),
                      )
                    }
                    placeholder="Contoh: Kerapian"
                    required
                  />
                </label>
                <button
                  className="button button-secondary button-small"
                  type="button"
                  aria-label={`Hapus kriteria ${index + 1}`}
                  disabled={criteria.length === 1}
                  onClick={() =>
                    setCriteria((current) =>
                      current.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Hapus
                </button>
              </div>
            ))}
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => setCriteria((current) => [...current, ""])}
            >
              <Plus aria-hidden="true" />
              Tambah kriteria
            </button>
          </fieldset>
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
          <div className="competition-list">
            {data.competitions.map((competition) => {
              const criteriaLocked = data.scores.some(
                (score) => score.competitionId === competition.id,
              );
              const isEditing = editingCompetition?.id === competition.id;
              return (
                <article className="competition-item" key={competition.id}>
                  <div className="competition-item-summary">
                    <div className="activity-copy">
                      <strong>{competition.title}</strong>
                      <span>
                        {competition.id} ·{" "}
                        {competition.taskType === "live"
                          ? "Langsung"
                          : competition.taskType === "cbt"
                            ? "CBT"
                            : "Unggah"}
                      </span>
                      <span>
                        Kriteria:{" "}
                        {competition.criteria.length
                          ? competition.criteria
                              .map((criterion) => criterion.name)
                              .join(", ")
                          : "Belum diatur"}
                      </span>
                      {competition.description ? (
                        <span>{competition.description}</span>
                      ) : null}
                    </div>
                    <span
                      className={`status-pill${competition.isActive ? " is-approved" : ""}`}
                    >
                      {competition.isActive ? "Dirilis" : "Belum dirilis"}
                    </span>
                  </div>
                  <div className="competition-item-actions">
                    <button
                      className="button button-secondary button-small"
                      type="button"
                      aria-label={`Edit mata lomba ${competition.title}`}
                      aria-expanded={isEditing}
                      aria-controls={`competition-editor-${competition.id}`}
                      disabled={Boolean(deletingCompetition) || savingCompetition}
                      onClick={() =>
                        setEditingCompetition(
                          isEditing
                            ? null
                            : {
                                id: competition.id,
                                title: competition.title,
                                description: competition.description,
                                taskType: competition.taskType,
                                criteria: competition.criteria.map(
                                  (criterion) => criterion.name,
                                ),
                              },
                        )
                      }
                    >
                      <Pencil aria-hidden="true" />
                      {isEditing ? "Tutup edit" : "Edit"}
                    </button>
                    <button
                      className="button button-danger button-small"
                      type="button"
                      aria-label={`Hapus mata lomba ${competition.title}`}
                      disabled={Boolean(deletingCompetition) || savingCompetition}
                      onClick={() => {
                        const related = [
                          `${data.judgeAssignments.filter((item) => item.competitionId === competition.id).length} penugasan juri`,
                          `${data.panitiaAssignments.filter((item) => item.competitionId === competition.id).length} penugasan panitia`,
                          `${data.scores.filter((item) => item.competitionId === competition.id).length} nilai`,
                          `${data.submissions[competition.id] ? 1 : 0} kiriman tugas`,
                          `${Object.keys(data.attendance).filter((key) => key.endsWith(`:${competition.id}`)).length} catatan kehadiran`,
                        ];
                        if (
                          !window.confirm(
                            `Hapus mata lomba "${competition.title}" secara permanen?\n\nData terkait yang ikut terhapus: ${related.join(", ")}.\nTindakan ini tidak dapat dibatalkan.`,
                          )
                        ) {
                          return;
                        }
                        setDeletingCompetition(competition.id);
                        void deleteCompetition(competition.id)
                          .then(() => {
                            if (isEditing) setEditingCompetition(null);
                            notify("Mata lomba dan data terkait berhasil dihapus.");
                          })
                          .catch((error: unknown) => {
                            console.error("Gagal menghapus mata lomba.", error);
                            notify("Mata lomba gagal dihapus.", true);
                          })
                          .finally(() => setDeletingCompetition(""));
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      {deletingCompetition === competition.id
                        ? "Menghapus…"
                        : "Hapus"}
                    </button>
                  </div>
                  {isEditing && editingCompetition ? (
                    <form
                      id={`competition-editor-${competition.id}`}
                      className="competition-editor"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const names = editingCompetition.criteria.map((name) =>
                          name.trim(),
                        );
                        if (
                          !editingCompetition.title.trim() ||
                          editingCompetition.title.trim().length > 150
                        ) {
                          notify("Nama mata lomba harus berisi 1–150 karakter.", true);
                          return;
                        }
                        if (
                          !criteriaLocked &&
                          names.some((name) => !name)
                        ) {
                          notify("Lengkapi semua kriteria penilaian.", true);
                          return;
                        }
                        if (
                          !criteriaLocked &&
                          names.some((name) => name.length > 120)
                        ) {
                          notify("Nama kriteria maksimal 120 karakter.", true);
                          return;
                        }
                        if (
                          !criteriaLocked &&
                          new Set(names.map((name) => name.toLowerCase())).size !==
                            names.length
                        ) {
                          notify(
                            "Nama kriteria penilaian tidak boleh duplikat.",
                            true,
                          );
                          return;
                        }

                        setSavingCompetition(true);
                        void updateCompetition(competition.id, {
                          title: editingCompetition.title.trim(),
                          description: editingCompetition.description.trim(),
                          taskType: editingCompetition.taskType,
                          criteria: criteriaLocked
                            ? competition.criteria
                            : names.map((name) => ({
                                id: crypto.randomUUID(),
                                name,
                              })),
                        })
                          .then(() => {
                            setEditingCompetition(null);
                            notify("Mata lomba berhasil diperbarui.");
                          })
                          .catch((error: unknown) => {
                            console.error("Gagal memperbarui mata lomba.", error);
                            notify("Mata lomba gagal diperbarui.", true);
                          })
                          .finally(() => setSavingCompetition(false));
                      }}
                    >
                      <div className="school-fields">
                        <label>
                          <span className="field-label">Nama mata lomba</span>
                          <input
                            className="field"
                            maxLength={150}
                            required
                            value={editingCompetition.title}
                            onChange={(event) =>
                              setEditingCompetition((current) =>
                                current
                                  ? { ...current, title: event.target.value }
                                  : current,
                              )
                            }
                          />
                        </label>
                        <label>
                          <span className="field-label">Jenis tugas</span>
                          <select
                            className="field"
                            value={editingCompetition.taskType}
                            onChange={(event) =>
                              setEditingCompetition((current) =>
                                current
                                  ? {
                                      ...current,
                                      taskType: event.target
                                        .value as Competition["taskType"],
                                    }
                                  : current,
                              )
                            }
                          >
                            <option value="live">Penilaian langsung</option>
                            <option value="cbt">Tes berbasis komputer</option>
                            <option value="upload">Unggah berkas / tautan</option>
                          </select>
                        </label>
                        <label>
                          <span className="field-label">Petunjuk singkat</span>
                          <textarea
                            className="field text-area"
                            value={editingCompetition.description}
                            onChange={(event) =>
                              setEditingCompetition((current) =>
                                current
                                  ? {
                                      ...current,
                                      description: event.target.value,
                                    }
                                  : current,
                              )
                            }
                          />
                        </label>
                      </div>
                      <fieldset
                        className="form-stack criteria-editor"
                        disabled={criteriaLocked}
                      >
                        <legend className="field-label">Kriteria penilaian</legend>
                        {criteriaLocked ? (
                          <p className="field-hint">
                            Kriteria dikunci karena lomba ini sudah memiliki
                            nilai. Nama, petunjuk, dan jenis tugas tetap dapat
                            diedit.
                          </p>
                        ) : (
                          <p className="field-hint">
                            Juri memberi nilai 0–100 untuk setiap kriteria.
                          </p>
                        )}
                        {editingCompetition.criteria.map((criterion, index) => (
                          <div className="criteria-editor-row" key={index}>
                            <label>
                              <span className="field-label">
                                Kriteria {index + 1}
                              </span>
                              <input
                                className="field"
                                maxLength={120}
                                required={!criteriaLocked}
                                value={criterion}
                                onChange={(event) =>
                                  setEditingCompetition((current) =>
                                    current
                                      ? {
                                          ...current,
                                          criteria: current.criteria.map(
                                            (name, currentIndex) =>
                                              currentIndex === index
                                                ? event.target.value
                                                : name,
                                          ),
                                        }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <button
                              className="button button-secondary button-small"
                              type="button"
                              aria-label={`Hapus kriteria ${index + 1}`}
                              onClick={() =>
                                setEditingCompetition((current) =>
                                  current
                                    ? {
                                        ...current,
                                        criteria: current.criteria.filter(
                                          (_, currentIndex) =>
                                            currentIndex !== index,
                                        ),
                                      }
                                    : current,
                                )
                              }
                            >
                              <Trash2 aria-hidden="true" />
                              Hapus
                            </button>
                          </div>
                        ))}
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          onClick={() =>
                            setEditingCompetition((current) =>
                              current
                                ? {
                                    ...current,
                                    criteria: [...current.criteria, ""],
                                  }
                                : current,
                            )
                          }
                        >
                          <Plus aria-hidden="true" />
                          Tambah kriteria
                        </button>
                      </fieldset>
                      <div className="competition-editor-actions">
                        <button
                          className="button button-small"
                          type="submit"
                          disabled={savingCompetition}
                        >
                          {savingCompetition ? "Menyimpan…" : "Simpan perubahan"}
                        </button>
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          disabled={savingCompetition}
                          onClick={() => setEditingCompetition(null)}
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Flag aria-hidden="true" />
            <strong>Belum ada mata lomba</strong>
            <p>Tambahkan mata lomba untuk mulai menyiapkan kegiatan.</p>
          </div>
        )}
          </section>
        </>
      ) : null}
      {mode === "judges" ? (
        <>
          <PageHeading
            title="Penugasan juri"
            description="Tentukan mata lomba yang dapat dinilai setiap juri."
          />
          <section className="panel panel-pad">
        <SectionHeading
          title="Penugasan per mata lomba"
          detail="Tetapkan juri yang bertanggung jawab menilai setiap pos."
        />
        {!data.judges.length ? (
          <div className="empty-state">
            <Users aria-hidden="true" />
            <strong>Belum ada akun juri</strong>
            <p>
              Buat akun dengan peran Juri pada menu Manajemen akun.
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
      ) : null}
      {mode === "panitia" ? (
        <>
          <PageHeading
            title="Penugasan panitia"
            description="Tentukan pos yang dapat dikelola setiap panitia."
          />
          <section className="panel panel-pad">
        <SectionHeading
          title="Penugasan per mata lomba"
          detail="Panitia hanya dapat merilis instruksi dan mencatat kehadiran pada pos yang ditugaskan."
        />
        {!data.eventStaff.length ? (
          <div className="empty-state">
            <Users aria-hidden="true" />
            <strong>Belum ada akun Panitia</strong>
            <p>Buat akun dengan role Panitia pada menu Manajemen akun.</p>
          </div>
        ) : !data.competitions.length ? (
          <p className="inline-note">
            Tambahkan mata lomba sebelum menetapkan Panitia.
          </p>
        ) : (
          <div className="activity-list">
            {data.competitions.map((competition) => {
              const assigned = data.panitiaAssignments.filter(
                (assignment) => assignment.competitionId === competition.id,
              );
              const assignedIds = new Set(
                assigned.map((assignment) => assignment.panitiaId),
              );
              const availableStaff = data.eventStaff.filter(
                (member) => !assignedIds.has(member.id),
              );
              const selectedStaff = availableStaff.some(
                (member) => member.id === selectedPanitia[competition.id],
              )
                ? selectedPanitia[competition.id]
                : (availableStaff[0]?.id ?? "");
              return (
                <div className="activity-row" key={competition.id}>
                  <span className="activity-copy">
                    <strong>{competition.title}</strong>
                    <span>
                      {assigned.length
                        ? assigned
                            .map(
                              (assignment) =>
                                data.eventStaff.find(
                                  (member) =>
                                    member.id === assignment.panitiaId,
                                )?.name,
                            )
                            .filter(Boolean)
                            .join(", ")
                        : "Belum ada Panitia yang ditugaskan"}
                    </span>
                    {assigned.map((assignment) => {
                      const member = data.eventStaff.find(
                        (item) => item.id === assignment.panitiaId,
                      );
                      return (
                        <button
                          className="text-link"
                          disabled={assignmentBusy}
                          key={assignment.id}
                          onClick={() => {
                            setAssignmentBusy(true);
                            void removePanitiaAssignment(assignment.id)
                              .then(() =>
                                notify(
                                  `Penugasan ${member?.name ?? "Panitia"} dihapus.`,
                                ),
                              )
                              .catch((error: unknown) => {
                                console.error(
                                  "Gagal menghapus penugasan Panitia.",
                                  error,
                                );
                                notify("Penugasan Panitia gagal dihapus.", true);
                              })
                              .finally(() => setAssignmentBusy(false));
                          }}
                        >
                          Hapus {member?.name ?? "Panitia"}
                        </button>
                      );
                    })}
                  </span>
                  <div className="form-row">
                    <select
                      aria-label={`Pilih Panitia untuk ${competition.title}`}
                      className="field"
                      disabled={!availableStaff.length || assignmentBusy}
                      value={selectedStaff}
                      onChange={(event) =>
                        setSelectedPanitia((current) => ({
                          ...current,
                          [competition.id]: event.target.value,
                        }))
                      }
                    >
                      {availableStaff.length ? (
                        availableStaff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Semua Panitia sudah ditugaskan</option>
                      )}
                    </select>
                    <button
                      className="button button-small"
                      disabled={!selectedStaff || assignmentBusy}
                      onClick={() => {
                        setAssignmentBusy(true);
                        void assignPanitia(selectedStaff, competition.id)
                          .then(() => notify("Panitia berhasil ditugaskan."))
                          .catch((error: unknown) => {
                            console.error("Gagal menetapkan Panitia.", error);
                            notify("Panitia gagal ditugaskan.", true);
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
      ) : null}
    </>
  );
}

function CompetitionManagement({ notify }: { notify: Notify }) {
  return <CompetitionWorkspace notify={notify} mode="competitions" />;
}

function JudgeAssignmentManagement({ notify }: { notify: Notify }) {
  return <CompetitionWorkspace notify={notify} mode="judges" />;
}

function PanitiaAssignmentManagement({ notify }: { notify: Notify }) {
  return <CompetitionWorkspace notify={notify} mode="panitia" />;
}

function PublicationSettings({ notify }: { notify: Notify }) {
  const {
    data,
    isConnected,
    setLeaderboardPublished,
    setCertificatesPublished,
  } = useWorkspace();
  const expectedScoreCount = data.teams.length * data.competitions.length;
  const approvedScoreCount = data.teams.reduce(
    (total, team) =>
      total +
      data.competitions.filter(
        (competition) =>
          getScore(data.scores, team.id, competition.id)?.status === "approved",
      ).length,
    0,
  );
  const allApproved =
    expectedScoreCount > 0 && approvedScoreCount === expectedScoreCount;
  const [savingPublication, setSavingPublication] = React.useState<
    "leaderboard" | "certificates" | null
  >(null);

  const saveLeaderboard = async () => {
    setSavingPublication("leaderboard");
    try {
      await setLeaderboardPublished(!data.leaderboardPublished);
      notify("Pengaturan leaderboard berhasil disimpan.");
    } catch (error) {
      console.error("Gagal mengubah publikasi leaderboard.", error);
      notify("Pengaturan leaderboard gagal disimpan. Coba lagi.", true);
    } finally {
      setSavingPublication(null);
    }
  };

  const saveCertificates = async () => {
    setSavingPublication("certificates");
    try {
      await setCertificatesPublished(!data.certificatesPublished);
      notify("Pengaturan sertifikat berhasil disimpan.");
    } catch (error) {
      console.error("Gagal mengubah publikasi sertifikat.", error);
      notify(
        error instanceof Error &&
          error.message.includes("All team scores must be approved")
          ? "Sertifikat belum dapat dibuka. Sahkan nilai seluruh regu dan mata lomba terlebih dahulu."
          : "Pengaturan sertifikat gagal disimpan. Coba lagi.",
        true,
      );
    } finally {
      setSavingPublication(null);
    }
  };

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
              disabled={savingPublication !== null}
              onChange={() => void saveLeaderboard()}
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
              disabled={
                savingPublication !== null ||
                (!allApproved && !data.certificatesPublished)
              }
              onChange={() => void saveCertificates()}
            />
          </div>
          {!data.certificatesPublished ? (
            <p className="field-hint" role="status">
              {expectedScoreCount === 0
                ? "Tambahkan minimal satu regu dan satu mata lomba sebelum menerbitkan sertifikat."
                : `Nilai disahkan ${approvedScoreCount} dari ${expectedScoreCount}. Sertifikat aktif setelah semua kombinasi regu dan mata lomba disahkan.`}
            </p>
          ) : null}
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
          {isConnected
            ? "Perubahan tersimpan di Supabase. Tanda tangan digital dan verifikasi kriptografis belum diaktifkan."
            : "Mode data contoh: perubahan hanya berlaku di peramban ini dan tidak dipublikasikan ke peserta."}
        </p>
      </div>
    </>
  );
}

function TeamManagement({ notify }: { notify: Notify }) {
  const {
    data,
    assignParticipants,
    createTeam,
    deleteTeam,
    isConnected,
    refreshWorkspace,
    setTeamPinru,
    updateTeam,
  } = useWorkspace();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [targetTeam, setTargetTeam] = React.useState(data.teams[0]?.id ?? "");
  const [addMode, setAddMode] = React.useState<"team" | "participant">("team");
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamCategory, setNewTeamCategory] =
    React.useState<Team["category"]>("Putra");
  const [creating, setCreating] = React.useState(false);
  const [newParticipantName, setNewParticipantName] = React.useState("");
  const [newParticipantLoginId, setNewParticipantLoginId] = React.useState("");
  const [newParticipantSchool, setNewParticipantSchool] = React.useState(
    data.schools[0]?.id ?? "",
  );
  const [creatingParticipant, setCreatingParticipant] = React.useState(false);
  const [temporaryPassword, setTemporaryPassword] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [listView, setListView] = React.useState<"teams" | "participants">(
    "teams",
  );
  const [participantTeamFilter, setParticipantTeamFilter] =
    React.useState("all");
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = React.useState("");
  const [teamActionId, setTeamActionId] = React.useState<string | null>(null);
  const [participantTeamSelections, setParticipantTeamSelections] =
    React.useState<Record<string, string>>({});
  const [movingParticipantId, setMovingParticipantId] = React.useState<
    string | null
  >(null);
  React.useEffect(() => {
    if (!data.teams.some((team) => team.id === targetTeam)) {
      setTargetTeam(data.teams[0]?.id ?? "");
    }
  }, [data.teams, targetTeam]);
  React.useEffect(() => {
    if (
      participantTeamFilter !== "all" &&
      participantTeamFilter !== "unassigned" &&
      !data.teams.some((team) => team.id === participantTeamFilter)
    ) {
      setParticipantTeamFilter("all");
    }
  }, [data.teams, participantTeamFilter]);
  React.useEffect(() => {
    if (
      !data.schools.some((school) => school.id === newParticipantSchool) &&
      data.schools.length
    ) {
      setNewParticipantSchool(data.schools[0].id);
    }
  }, [data.schools, newParticipantSchool]);
  const visibleParticipants = data.participants.filter((participant) => {
    const team = getTeam(data, participant.teamId);
    const school = data.schools.find((item) => item.id === participant.schoolId);
    const matchesTeam =
      participantTeamFilter === "all" ||
      (participantTeamFilter === "unassigned" && !participant.teamId) ||
      participant.teamId === participantTeamFilter;
    return `${participant.name} ${team?.name ?? ""} ${school?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()) && matchesTeam;
  });
  const allVisibleSelected =
    visibleParticipants.length > 0 &&
    visibleParticipants.every((person) => selectedIds.includes(person.id));

  const saveTeamName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTeamId || !editingTeamName.trim()) return;
    setTeamActionId(editingTeamId);
    try {
      await updateTeam(editingTeamId, editingTeamName.trim());
      notify("Nama regu berhasil diperbarui.");
      setEditingTeamId(null);
      setEditingTeamName("");
    } catch (error) {
      console.error("Gagal memperbarui nama regu.", error);
      notify("Nama regu gagal diperbarui. Periksa apakah nama sudah digunakan.", true);
    } finally {
      setTeamActionId(null);
    }
  };

  const removeTeam = async (team: Team) => {
    if (data.certificatesPublished) {
      notify(
        "Tutup akses sertifikat terlebih dahulu sebelum menghapus regu yang sudah masuk rekap.",
        true,
      );
      return;
    }
    const memberIds = data.participants
      .filter((person) => person.teamId === team.id)
      .map((person) => person.id);
    const scoreCount = data.scores.filter((score) => score.teamId === team.id).length;
    const submissionCount = Object.keys(data.submissions).filter((key) =>
      key.startsWith(`${team.id}:`),
    ).length;
    const attendanceCount = Object.keys(data.attendance).filter((key) =>
      key.startsWith(`${team.id}:`),
    ).length;
    const hasRelatedData =
      memberIds.length + scoreCount + submissionCount + attendanceCount > 0;
    const confirmation = hasRelatedData
      ? `Hapus Regu ${team.name}? ${memberIds.length} peserta akan menjadi belum dipetakan. ${scoreCount} nilai, ${submissionCount} kiriman tugas, dan ${attendanceCount} catatan kehadiran terkait juga akan dihapus permanen.`
      : `Hapus Regu ${team.name}? Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmation)) return;

    setTeamActionId(team.id);
    try {
      await deleteTeam(team.id);
      setSelectedIds((ids) => ids.filter((id) => !memberIds.includes(id)));
      setParticipantTeamSelections((selections) => {
        const next = { ...selections };
        memberIds.forEach((id) => delete next[id]);
        return next;
      });
      if (editingTeamId === team.id) {
        setEditingTeamId(null);
        setEditingTeamName("");
      }
      notify(`Regu ${team.name} berhasil dihapus.`);
    } catch (error) {
      console.error("Gagal menghapus regu.", error);
      notify("Regu gagal dihapus. Muat ulang data dan coba lagi.", true);
    } finally {
      setTeamActionId(null);
    }
  };

  const moveParticipant = async (participant: Participant) => {
    const teamId = participantTeamSelections[participant.id] ?? "";
    if (!teamId || teamId === participant.teamId) return;
    setMovingParticipantId(participant.id);
    try {
      await assignParticipants([participant.id], teamId);
      const team = getTeam(data, teamId);
      notify(`${participant.name} dipindahkan ke Regu ${team?.name ?? ""}.`);
      setParticipantTeamSelections((selections) => {
        const next = { ...selections };
        delete next[participant.id];
        return next;
      });
    } catch (error) {
      console.error("Gagal memindahkan peserta ke regu.", error);
      notify("Pemindahan peserta gagal disimpan.", true);
    } finally {
      setMovingParticipantId(null);
    }
  };

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
    if (!targetTeam) {
      notify("Tambahkan regu terlebih dahulu sebelum memetakan peserta.", true);
      return;
    }
    try {
      await assignParticipants(selectedIds, targetTeam);
      notify(`${selectedIds.length} peserta dipetakan ke Regu ${getTeam(data, targetTeam)?.name}.`);
      setParticipantTeamSelections((selections) => {
        const next = { ...selections };
        selectedIds.forEach((id) => delete next[id]);
        return next;
      });
      setSelectedIds([]);
    } catch (error) {
      console.error("Gagal memetakan peserta ke regu.", error);
      notify("Pemetaan peserta gagal disimpan.", true);
    }
  };

  const createParticipant = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setTemporaryPassword("");
    setCreatingParticipant(true);
    try {
      const response = await fetch("/api/operator/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          loginId: newParticipantLoginId,
          fullName: newParticipantName,
          role: "peserta",
          teamId: null,
          schoolId: newParticipantSchool,
          isPinru: false,
        }),
      });
      const payload: unknown = await response.json();
      if (!isJsonRecord(payload)) {
        throw new Error("Respons pembuatan akun peserta tidak valid.");
      }
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Akun peserta gagal dibuat.",
        );
      }
      if (
        !isManagedAccount(payload.account) ||
        typeof payload.temporaryPassword !== "string"
      ) {
        throw new Error("Server tidak mengembalikan informasi akun yang valid.");
      }
      setTemporaryPassword(payload.temporaryPassword);
      setNewParticipantName("");
      setNewParticipantLoginId("");
      await refreshWorkspace();
      notify("Peserta berhasil ditambahkan. Bagikan kata sandi secara privat.");
    } catch (error) {
      console.error("Gagal menambahkan peserta.", error);
      notify(
        error instanceof Error ? error.message : "Peserta gagal ditambahkan.",
        true,
      );
    } finally {
      setCreatingParticipant(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Regu & peserta"
        description="Kelola regu dan peserta. Pangkalan dicatat pada profil peserta."
      />
      <section className="panel panel-pad" style={{ marginBottom: 18 }}>
        <SectionHeading
          title={addMode === "team" ? "Tambah regu" : "Tambah peserta"}
          detail={
            addMode === "team"
              ? "Buat regu berdasarkan nama dan kategori."
              : "Buat akun peserta dan pilih pangkalannya."
          }
          action={
            <div role="group" aria-label="Pilih jenis data">
              <button
                className={`button button-small${addMode === "team" ? "" : " button-secondary"}`}
                type="button"
                aria-pressed={addMode === "team"}
                onClick={() => setAddMode("team")}
              >
                Tambah regu
              </button>{" "}
              <button
                className={`button button-small${addMode === "participant" ? "" : " button-secondary"}`}
                type="button"
                aria-pressed={addMode === "participant"}
                onClick={() => setAddMode("participant")}
              >
                Tambah peserta
              </button>
            </div>
          }
        />
        {addMode === "team" ? (
          <form
            className="form-row"
            onSubmit={(event) => {
              event.preventDefault();
              setCreating(true);
              void createTeam({
                name: newTeamName.trim(),
                category: newTeamCategory,
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
                maxLength={100}
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
            <button className="button button-small" type="submit" disabled={creating}>
              {creating ? "Menyimpan…" : "Tambah regu"}
            </button>
          </form>
        ) : data.schools.length ? (
          <>
            <form className="form-row" onSubmit={createParticipant}>
              <label>
                <span className="field-label">Nama lengkap</span>
                <input
                  className="field"
                  value={newParticipantName}
                  onChange={(event) => setNewParticipantName(event.target.value)}
                  minLength={1}
                  maxLength={150}
                  required
                />
              </label>
              <label>
                <span className="field-label">ID pengguna</span>
                <input
                  className="field"
                  value={newParticipantLoginId}
                  onChange={(event) =>
                    setNewParticipantLoginId(event.target.value)
                  }
                  pattern="[a-z0-9]+([.-][a-z0-9]+)*"
                  title="Gunakan huruf kecil, angka, titik, atau tanda hubung."
                  required
                />
              </label>
              <label>
                <span className="field-label">Pangkalan peserta</span>
                <select
                  className="field"
                  value={newParticipantSchool}
                  onChange={(event) =>
                    setNewParticipantSchool(event.target.value)
                  }
                  required
                >
                  {data.schools.map((school) => (
                    <option value={school.id} key={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-small"
                type="submit"
                disabled={
                  !isConnected ||
                  creatingParticipant ||
                  !newParticipantSchool ||
                  !newParticipantName.trim() ||
                  !newParticipantLoginId.trim()
                }
              >
                {creatingParticipant ? "Menyimpan…" : "Tambah peserta"}
              </button>
            </form>
            {!isConnected ? (
              <p className="inline-note" role="note" style={{ marginTop: 12 }}>
                Hubungkan Supabase untuk membuat akun peserta.
              </p>
            ) : null}
            {temporaryPassword ? (
              <div className="notice" role="status" style={{ marginTop: 14 }}>
                <LockKeyhole aria-hidden="true" />
                <p>
                  Kata sandi sementara (bagikan secara privat):{" "}
                  <code>{temporaryPassword}</code>
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="inline-note">
            Tambahkan pangkalan terlebih dahulu pada menu Pangkalan.
          </p>
        )}
      </section>
      <section className="panel panel-pad" style={{ marginBottom: 18 }}>
        <div className="filter-row">
          <label className="field-label" htmlFor="team-management-view">
            Tampilkan daftar
          </label>
          <select
            id="team-management-view"
            className="filter-select"
            value={listView}
            onChange={(event) =>
              setListView(event.target.value as "teams" | "participants")
            }
          >
            <option value="teams">Daftar regu</option>
            <option value="participants">Daftar peserta</option>
          </select>
        </div>
        {listView === "teams" ? (
          <>
            <SectionHeading
              title="Daftar regu"
              detail={`${data.teams.length} regu terdaftar`}
            />
            {!data.teams.length ? (
              <div className="empty-state">
                <Users aria-hidden="true" />
                <strong>Belum ada regu</strong>
                <p>Tambahkan regu terlebih dahulu untuk memetakan peserta.</p>
              </div>
            ) : (
              <div className="activity-list">
                {data.teams.map((team) => {
                  const memberCount = data.participants.filter(
                    (person) => person.teamId === team.id,
                  ).length;
                  const isEditing = editingTeamId === team.id;
                  const isBusy = teamActionId === team.id;
                  return (
                    <div className="activity-row" key={team.id}>
                      <span className="activity-copy">
                        <strong>Regu {team.name}</strong>
                        <span>
                          {team.category} · {memberCount} peserta
                        </span>
                      </span>
                      {isEditing ? (
                        <form
                          className="team-members-inline"
                          onSubmit={(event) => void saveTeamName(event)}
                        >
                          <label
                            className="sr-only"
                            htmlFor={`team-name-${team.id}`}
                          >
                            Nama regu {team.name}
                          </label>
                          <input
                            id={`team-name-${team.id}`}
                            className="field"
                            value={editingTeamName}
                            onChange={(event) =>
                              setEditingTeamName(event.target.value)
                            }
                            maxLength={100}
                            required
                          />
                          <button
                            className="button button-small"
                            type="submit"
                            disabled={isBusy || !editingTeamName.trim()}
                          >
                            {isBusy ? "Menyimpan…" : "Simpan"}
                          </button>
                          <button
                            className="button button-secondary button-small"
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setEditingTeamId(null);
                              setEditingTeamName("");
                            }}
                          >
                            Batal
                          </button>
                        </form>
                      ) : (
                        <div className="team-members-inline">
                          <button
                            className="button button-secondary button-small"
                            type="button"
                            disabled={teamActionId !== null}
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setEditingTeamName(team.name);
                            }}
                          >
                            Edit nama
                          </button>
                          <button
                            className="button button-secondary button-small"
                            type="button"
                            disabled={teamActionId !== null}
                            onClick={() => void removeTeam(team)}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="filter-row">
              <label className="field-label" htmlFor="participant-team-filter">
                Peserta dari regu
              </label>
              <select
                id="participant-team-filter"
                className="filter-select"
                value={participantTeamFilter}
                onChange={(event) => setParticipantTeamFilter(event.target.value)}
              >
                <option value="all">Semua regu</option>
                <option value="unassigned">Belum dipetakan</option>
                {data.teams.map((team) => (
                  <option value={team.id} key={team.id}>
                    Regu {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <div className="search-control">
                <Search aria-hidden="true" />
                <label className="sr-only" htmlFor="participant-search">
                  Cari peserta atau pangkalan
                </label>
                <input
                  id="participant-search"
                  className="field"
                  value={search}
                  placeholder="Cari nama peserta atau pangkalan"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <span className="role-chip">
                {visibleParticipants.length} peserta
              </span>
            </div>
            <div className="filter-row">
              <label className="sr-only" htmlFor="target-team">
                Regu tujuan pemetaan
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
                disabled={!selectedIds.length || !data.teams.length}
                onClick={() => void assign()}
              >
                Petakan {selectedIds.length || ""}
              </button>
            </div>
            {!visibleParticipants.length ? (
              <div className="empty-state">
                <Search aria-hidden="true" />
                <strong>Tidak ada peserta pada pilihan ini</strong>
                <p>Ubah filter regu atau kata kunci pencarian.</p>
              </div>
            ) : (
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
                    <th>Pinru</th>
                    <th>Pindahkan regu</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleParticipants.map((person) => {
                    const team = getTeam(data, person.teamId);
                    const school = data.schools.find(
                      (item) => item.id === person.schoolId,
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
                        <td>{school?.name ?? "Belum dipetakan"}</td>
                        <td>
                          <span className="role-chip">
                            {person.isPinru ? "Pinru" : team ? "Anggota" : "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button button-secondary button-small"
                            type="button"
                            disabled={!team || person.isPinru}
                            onClick={() => {
                              if (!team) return;
                              void setTeamPinru(person.id, team.id)
                                .then(() =>
                                  notify(`${person.name} ditetapkan sebagai Pinru.`),
                                )
                                .catch((error: unknown) => {
                                  console.error("Gagal menetapkan Pinru.", error);
                                  notify(
                                    "Pinru gagal diperbarui. Pastikan peserta anggota regu yang dipilih.",
                                    true,
                                  );
                                });
                            }}
                          >
                            {person.isPinru ? "Pinru saat ini" : "Jadikan Pinru"}
                          </button>
                        </td>
                        <td>
                          <div className="team-members-inline">
                            <label
                              className="sr-only"
                              htmlFor={`participant-team-${person.id}`}
                            >
                              Regu tujuan untuk {person.name}
                            </label>
                            <select
                              id={`participant-team-${person.id}`}
                              className="filter-select"
                              value={
                                participantTeamSelections[person.id] ??
                                person.teamId
                              }
                              disabled={
                                !data.teams.length ||
                                movingParticipantId === person.id
                              }
                              onChange={(event) =>
                                setParticipantTeamSelections((selections) => ({
                                  ...selections,
                                  [person.id]: event.target.value,
                                }))
                              }
                            >
                              {!person.teamId ? (
                                <option value="">Pilih regu</option>
                              ) : null}
                              {data.teams.map((option) => (
                                <option value={option.id} key={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="button button-secondary button-small"
                              type="button"
                              disabled={
                                movingParticipantId !== null ||
                                !participantTeamSelections[person.id] ||
                                (participantTeamSelections[person.id] ??
                                  person.teamId) === person.teamId
                              }
                              onClick={() => void moveParticipant(person)}
                            >
                              {movingParticipantId === person.id
                                ? "Memindahkan…"
                                : "Pindahkan"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function EventCoordination({ notify }: { notify: Notify }) {
      const {
        data,
        setAttendance,
        setCompetitionActive,
        isConnected,
        currentUserId,
      } = useWorkspace();
      const assignedCompetitions = isConnected
        ? data.competitions.filter((item) =>
            data.panitiaAssignments.some(
              (assignment) =>
                assignment.panitiaId === currentUserId &&
                assignment.competitionId === item.id,
            ),
          )
        : data.competitions;
      const [competitionId, setCompetitionId] = React.useState(
        assignedCompetitions[0]?.id ?? "",
      );
      React.useEffect(() => {
        if (!assignedCompetitions.some((item) => item.id === competitionId)) {
          setCompetitionId(assignedCompetitions[0]?.id ?? "");
        }
      }, [assignedCompetitions, competitionId]);
      const competition = assignedCompetitions.find(
        (item) => item.id === competitionId,
      );
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
            description="Rilis instruksi Operator, catat kehadiran, dan pantau tugas pada penugasan Anda."
          />
          {!assignedCompetitions.length ? (
            <div className="empty-state">
              <CalendarCheck aria-hidden="true" />
              <strong>Belum ada pos yang ditugaskan</strong>
              <p>Minta Operator menetapkan pos kegiatan untuk akun Panitia ini.</p>
            </div>
          ) : (
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
                  assignedCompetitions.some((assigned) => assigned.id === item.id) ? (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                  ) : null
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
                const score = getScore(data.scores, team.id, competitionId);
                return (
                  <div className="activity-row" key={team.id}>
                    <span className="activity-copy">
                      <strong>Regu {team.name}</strong>
                      <span>
                        {team.category} ·{" "}
                        {getSubmission(data, team.id, competitionId)?.submitted
                          ? score
                            ? "Tugas sudah dinilai"
                            : "Tugas sudah dikirim"
                          : "Menunggu tugas"}
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
          )}
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
      const canSubmit = currentParticipant?.isPinru ?? !isConnected;
      const competition = getCompetition(data, competitionId);
      const [url, setUrl] = React.useState(
        getSubmission(data, currentTeamId, competitionId)?.url ?? "",
      );
      const [answers, setAnswers] = React.useState<Record<number, string>>({});
      const [fileName, setFileName] = React.useState("");
      const submission = getSubmission(data, currentTeamId, competitionId);
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
              ) : !canSubmit ? (
                <div className="notice" role="note">
                  <LockKeyhole aria-hidden="true" />
                  <p>
                    Hanya Pinru yang dapat mengirim atau memperbarui tugas atas
                    nama regu. Anggota dapat melihat status pengumpulan.
                  </p>
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
        : data.schools.find(
            (item) => item.id === demoParticipant?.schoolId,
          );
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
          total + (score?.status === "approved" ? score.score ?? 0 : 0),
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

    function AuthPage() {
      const router = useRouter();
      const { isConnected, signIn } = useWorkspace();
      const [loginId, setLoginId] = React.useState("");
      const [password, setPassword] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [errorMessage, setErrorMessage] = React.useState("");
      const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setErrorMessage("");
        try {
          if (!isConnected) {
            throw new Error(
              "Koneksi Supabase belum siap. Masukkan Project URL dan publishable key sebelum masuk.",
            );
          }
          await signIn(loginId, password);
          router.push("/dashboard");
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
                : "Akses kegiatan hanya tersedia setelah Supabase dikonfigurasi."}
            </p>
          </section>
          <section className="auth-main">
            <form className="auth-card" onSubmit={submit}>
              <h2>Masuk ke Ruang LT-1</h2>
              <p>
                {isConnected
                  ? "Masuk menggunakan akun yang telah dibuat dan dibagikan oleh operator."
                  : "Akses akun sedang dinonaktifkan sampai koneksi Supabase disiapkan."}
              </p>
              {!isConnected ? (
                <div className="notice auth-error" role="alert">
                  <CircleHelp aria-hidden="true" />
                  <p>
                    Tambahkan NEXT_PUBLIC_SUPABASE_URL dan
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local, lalu
                    jalankan ulang aplikasi.
                  </p>
                </div>
              ) : null}
              <div className="form-stack">
                <label>
                  <span className="field-label">ID pengguna</span>
                  <input
                    className="field"
                    type="text"
                    placeholder="contoh: adellia.putri"
                    autoComplete="username"
                    value={loginId}
                    disabled={!isConnected || busy}
                    onChange={(event) => setLoginId(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span className="field-label">Kata sandi</span>
                  <input
                    className="field"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    disabled={!isConnected || busy}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <button
                  className="button"
                  type="submit"
                  disabled={!isConnected || busy}
                >
                  {busy ? "Memproses…" : "Masuk"}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
              {errorMessage ? (
                <div className="notice auth-error" role="alert">
                  <CircleHelp aria-hidden="true" />
                  <p>{errorMessage}</p>
                </div>
              ) : null}
              <p className="field-hint">
                Akun dan peran dibuat oleh operator. Jika belum menerima akses,
                hubungi panitia kegiatan.
              </p>
            </form>
          </section>
        </main>
      );
    }

    function EventScheduleWorkspace({
      canEdit,
      notify,
    }: {
      canEdit: boolean;
      notify: Notify;
    }) {
      const {
        data,
        createEventSchedule,
        updateEventSchedule,
        deleteEventSchedule,
      } = useWorkspace();
      const [showForm, setShowForm] = React.useState(false);
      const [editingId, setEditingId] = React.useState<string | null>(null);
      const [draft, setDraft] = React.useState<Omit<EventScheduleItem, "id">>({
        title: "",
        responsiblePerson: "",
        eventDate: "",
        startTime: "",
        endTime: "",
      });
      const [formError, setFormError] = React.useState("");
      const [saving, setSaving] = React.useState(false);
      const [deletingId, setDeletingId] = React.useState<string | null>(null);
      const schedules = [...data.eventSchedules].sort(
        (left, right) =>
          left.eventDate.localeCompare(right.eventDate) ||
          left.startTime.localeCompare(right.startTime),
      );
      const groupedSchedules = schedules.reduce<Record<string, EventScheduleItem[]>>(
        (groups, schedule) => {
          groups[schedule.eventDate] ??= [];
          groups[schedule.eventDate].push(schedule);
          return groups;
        },
        {},
      );

      const resetForm = () => {
        setDraft({
          title: "",
          responsiblePerson: "",
          eventDate: "",
          startTime: "",
          endTime: "",
        });
        setEditingId(null);
        setFormError("");
      };

      const editSchedule = (schedule: EventScheduleItem) => {
        setDraft({
          title: schedule.title,
          responsiblePerson: schedule.responsiblePerson,
          eventDate: schedule.eventDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        });
        setEditingId(schedule.id);
        setFormError("");
        setShowForm(true);
      };

      const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const title = draft.title.trim();
        const responsiblePerson = draft.responsiblePerson.trim();
        if (!title || !responsiblePerson || !draft.eventDate) {
          setFormError("Lengkapi nama kegiatan, penanggung jawab, dan tanggal.");
          return;
        }
        if (!draft.startTime || !draft.endTime || draft.startTime >= draft.endTime) {
          setFormError("Waktu selesai harus setelah waktu mulai.");
          return;
        }
        const hasOverlap = schedules.some(
          (schedule) =>
            schedule.id !== editingId &&
            schedule.eventDate === draft.eventDate &&
            draft.startTime < schedule.endTime &&
            draft.endTime > schedule.startTime,
        );
        if (hasOverlap) {
          setFormError("Waktu kegiatan bertumpang tindih dengan jadwal lain.");
          return;
        }

        setSaving(true);
        setFormError("");
        const schedule = { ...draft, title, responsiblePerson };
        try {
          if (editingId) {
            await updateEventSchedule(editingId, schedule);
            notify("Jadwal kegiatan diperbarui.");
          } else {
            await createEventSchedule(schedule);
            notify("Jadwal kegiatan ditambahkan.");
          }
          resetForm();
          setShowForm(false);
        } catch (error) {
          console.error("Gagal menyimpan jadwal kegiatan.", error);
          const errorCode = isJsonRecord(error) ? error.code : null;
          setFormError(
            errorCode === "23P01"
              ? "Waktu kegiatan bertumpang tindih dengan jadwal lain."
              : error instanceof Error
                ? error.message
                : "Jadwal kegiatan gagal disimpan.",
          );
        } finally {
          setSaving(false);
        }
      };

      const removeSchedule = async (schedule: EventScheduleItem) => {
        if (
          !window.confirm(
            `Hapus kegiatan "${schedule.title}" dari jadwal?`,
          )
        ) {
          return;
        }
        setDeletingId(schedule.id);
        try {
          await deleteEventSchedule(schedule.id);
          notify("Jadwal kegiatan dihapus.");
        } catch (error) {
          console.error("Gagal menghapus jadwal kegiatan.", error);
          notify(
            error instanceof Error
              ? error.message
              : "Jadwal kegiatan gagal dihapus.",
            true,
          );
        } finally {
          setDeletingId(null);
        }
      };

      const dateLabel = (date: string) => {
        const parsedDate = new Date(`${date}T12:00:00`);
        return Number.isNaN(parsedDate.getTime())
          ? date
          : parsedDate.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
      };

      return (
        <>
          <PageHeading
            title="Jadwal kegiatan"
            description={
              canEdit
                ? "Susun rundown multi-hari. Pastikan waktu kegiatan berurutan dan tidak bertumpang tindih."
                : "Rundown kegiatan peserta, disusun menurut tanggal dan waktu."
            }
            actions={
              canEdit ? (
                <button
                  className="button"
                  onClick={() => {
                    if (showForm) {
                      resetForm();
                    }
                    setShowForm((open) => !open);
                  }}
                  type="button"
                >
                  {showForm ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  {showForm ? "Tutup formulir" : "Tambah kegiatan"}
                </button>
              ) : null
            }
          />

          {canEdit && showForm ? (
            <section className="schedule-form-card" aria-labelledby="schedule-form-title">
              <div className="section-heading">
                <div>
                  <h2 id="schedule-form-title">
                    {editingId ? "Edit kegiatan" : "Kegiatan baru"}
                  </h2>
                  <p>Waktu selesai harus setelah waktu mulai dan tidak boleh bentrok.</p>
                </div>
              </div>
              <form className="schedule-form" onSubmit={submitSchedule}>
                <label>
                  <span className="field-label">Nama kegiatan</span>
                  <input
                    className="field"
                    maxLength={150}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    required
                    value={draft.title}
                  />
                </label>
                <label>
                  <span className="field-label">Penanggung jawab</span>
                  <input
                    className="field"
                    maxLength={150}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        responsiblePerson: event.target.value,
                      }))
                    }
                    required
                    value={draft.responsiblePerson}
                  />
                </label>
                <label>
                  <span className="field-label">Tanggal</span>
                  <input
                    className="field"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, eventDate: event.target.value }))
                    }
                    required
                    type="date"
                    value={draft.eventDate}
                  />
                </label>
                <label>
                  <span className="field-label">Waktu mulai</span>
                  <input
                    className="field"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, startTime: event.target.value }))
                    }
                    required
                    type="time"
                    value={draft.startTime}
                  />
                </label>
                <label>
                  <span className="field-label">Waktu selesai</span>
                  <input
                    className="field"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, endTime: event.target.value }))
                    }
                    required
                    type="time"
                    value={draft.endTime}
                  />
                </label>
                {formError ? (
                  <p className="schedule-form-error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <div className="schedule-form-actions">
                  <button className="button" disabled={saving} type="submit">
                    {saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Simpan kegiatan"}
                  </button>
                  <button
                    className="button-secondary"
                    disabled={saving}
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    type="button"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {schedules.length === 0 ? (
            <div className="empty-state schedule-empty-state">
              <CalendarDays aria-hidden="true" />
              <strong>Belum ada jadwal kegiatan</strong>
              <p>
                {canEdit
                  ? "Tambahkan kegiatan pertama untuk mulai menyusun rundown."
                  : "Rundown akan ditampilkan di sini setelah diterbitkan."}
              </p>
            </div>
          ) : (
            <div className="schedule-days">
              {Object.entries(groupedSchedules).map(([date, daySchedules]) => (
                <section className="schedule-day" key={date}>
                  <h2>{dateLabel(date)}</h2>
                  <ol className="schedule-list">
                    {daySchedules.map((schedule) => (
                      <li className="schedule-entry" key={schedule.id}>
                        <div className="schedule-entry-time">
                          <strong>{schedule.startTime}</strong>
                          <span>{schedule.endTime}</span>
                        </div>
                        <div className="schedule-entry-content">
                          <h3>{schedule.title}</h3>
                          <p>Penanggung jawab: {schedule.responsiblePerson}</p>
                        </div>
                        {canEdit ? (
                          <div className="schedule-entry-actions">
                            <button
                              aria-label={`Edit ${schedule.title}`}
                              className="icon-button"
                              onClick={() => editSchedule(schedule)}
                              type="button"
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                            <button
                              aria-label={`Hapus ${schedule.title}`}
                              className="icon-button danger"
                              disabled={deletingId === schedule.id}
                              onClick={() => void removeSchedule(schedule)}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </>
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
        dataRefreshError,
        session,
        profile,
        refreshWorkspace,
      } = useWorkspace();
      const router = useRouter();
      const [toast, setToast] = React.useState<{ message: string; error: boolean } | null>(
        null,
      );
      const notify = React.useCallback<Notify>((message, isError = false) => {
        setToast({ message, error: isError });
        window.setTimeout(() => setToast(null), 3600);
      }, []);

      const isAuthView = view === "login";
      const requiredRole: Role | null =
        view === "operator" ||
        view === "accounts" ||
        view === "scores" ||
        view === "schools" ||
        view === "teams" ||
        view === "competitions" ||
        view === "judgeAssignments" ||
        view === "panitiaAssignments" ||
        view === "publication" ||
        view === "operatorSchedule" ||
        view === "trainingReports"
          ? "operator"
          : view === "juri" || view === "juriDashboard"
            ? "juri"
            : view === "panitia" ||
                view === "panitiaDashboard" ||
                view === "panitiaSchedule"
              ? "panitia"
              : view === "pendamping" || view === "pendampingDashboard"
                ? "pendamping_regu"
                : ["participant", "scan", "submit"].includes(view)
                ? "peserta"
                : null;
      const roleLanding: Record<Role, string> = {
        peserta: "/dashboard",
        juri: "/juri/dashboard",
        panitia: "/panitia/dashboard",
        operator: "/operator",
        pendamping_regu: "/pendamping/dashboard",
      };

      React.useEffect(() => {
        if (!isConnected || !authReady || isAuthView) return;
        if (!session) {
          router.replace("/login");
        } else if (
          profile &&
          ((requiredRole && profile.role !== requiredRole) ||
            (view === "training" &&
              !["peserta", "pendamping_regu"].includes(profile.role)) ||
            (view === "schedule" &&
              !["peserta", "pendamping_regu"].includes(profile.role)))
        ) {
          router.replace(roleLanding[profile.role]);
        }
      }, [
        authReady,
        isAuthView,
        isConnected,
        profile,
        requiredRole,
        router,
        session,
        view,
      ]);

      if (!isConnected && !isAuthView) {
        return (
          <main className="auth-main">
            <section className="auth-card" role="alert">
              <h2>Koneksi Supabase diperlukan</h2>
              <p>
                Halaman kegiatan hanya tersedia untuk akun yang sudah masuk.
                Konfigurasikan URL proyek dan publishable key Supabase terlebih
                dahulu.
              </p>
              <Link className="button" href="/login">
                Ke halaman masuk
              </Link>
            </section>
          </main>
        );
      }

      if (isConnected && !isAuthView) {
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
        if (
          (requiredRole && profile.role !== requiredRole) ||
          (view === "training" &&
            !["peserta", "pendamping_regu"].includes(profile.role)) ||
          (view === "schedule" &&
            !["peserta", "pendamping_regu"].includes(profile.role))
        ) {
          return (
            <main className="auth-main">
              <p role="status">Membuka ruang kerja sesuai peran akun…</p>
            </main>
          );
        }
      }

      if (view === "login") {
        return <AuthPage />;
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
          content = <AccountProfile notify={notify} />;
          break;
        case "submit":
          content = <SubmissionPage competitionId={competitionId} notify={notify} />;
          break;
        case "operator":
          content = <OperatorDashboard />;
          break;
        case "accounts":
          content = <AccountManagement notify={notify} />;
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
        case "judgeAssignments":
          content = <JudgeAssignmentManagement notify={notify} />;
          break;
        case "panitiaAssignments":
          content = <PanitiaAssignmentManagement notify={notify} />;
          break;
        case "publication":
          content = <PublicationSettings notify={notify} />;
          break;
        case "training":
          content = <TrainingWorkspace notify={notify} />;
          break;
        case "trainingReports":
          content = <TrainingReports notify={notify} />;
          break;
        case "schedule":
          content = <EventScheduleWorkspace canEdit={false} notify={notify} />;
          break;
        case "operatorSchedule":
          content = <EventScheduleWorkspace canEdit notify={notify} />;
          break;
        case "panitiaSchedule":
          content = <EventScheduleWorkspace canEdit notify={notify} />;
          break;
        case "juriDashboard":
          content = <RoleWorkspaceDashboard role="juri" />;
          break;
        case "panitiaDashboard":
          content = <RoleWorkspaceDashboard role="panitia" />;
          break;
        case "pendampingDashboard":
          content = <RoleWorkspaceDashboard role="pendamping_regu" />;
          break;
        case "juri":
          content = <JuryScoring notify={notify} />;
          break;
        case "panitia":
          content = <EventCoordination notify={notify} />;
          break;
        case "pendamping":
          content = <CompanionRegistration notify={notify} />;
          break;
      }

      return (
        <>
          <WorkspaceFrame view={view} notify={notify}>
            {dataRefreshError ? (
              <div className="notice auth-error" role="alert">
                <CircleHelp aria-hidden="true" />
                <p>
                  {dataRefreshError}{" "}
                  <button
                    className="text-link"
                    onClick={() => void refreshWorkspace()}
                    type="button"
                  >
                    Coba lagi
                  </button>
                </p>
              </div>
            ) : null}
            {content}
          </WorkspaceFrame>
          {toast ? <StateToast message={toast.message} isError={toast.error} /> : null}
        </>
      );
    }

export type { View };
