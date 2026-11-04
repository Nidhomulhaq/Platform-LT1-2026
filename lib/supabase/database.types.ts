export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      attendance: Table<{
        id: string;
        competition_id: string;
        team_id: string;
        present: boolean;
        recorded_by: string | null;
        updated_at: string;
      }>;
      competitions: Table<{
        id: string;
        title: string;
        description: string;
        task_type: Database["public"]["Enums"]["task_type"];
        max_score: number;
        criteria: Json;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      event_settings: Table<{
        id: boolean;
        leaderboard_published: boolean;
        certificates_published: boolean;
        certificates_published_at: string | null;
        updated_at: string;
      }>;
      event_schedules: Table<{
        id: string;
        title: string;
        responsible_person: string;
        event_date: string;
        start_time: string;
        end_time: string;
        created_at: string;
        updated_at: string;
      }>;
      judge_assignments: Table<{
        id: string;
        juri_id: string;
        competition_id: string;
        created_at: string;
      }>;
      panitia_assignments: Table<{
        id: string;
        panitia_id: string;
        competition_id: string;
        created_at: string;
      }>;
      profiles: Table<{
        id: string;
        full_name: string;
        login_id: string | null;
        role: Database["public"]["Enums"]["user_role"];
        is_active: boolean;
        school_id: string | null;
        phone_number: string | null;
        place_of_birth: string;
        date_of_birth: string | null;
        motto: string;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }>;
      schools: Table<{
        id: string;
        name: string;
        school_type: "MI" | "MTs";
        headmaster_name: string;
        headmaster_title: string;
        pembina_name: string;
        pembina_title: string;
        created_at: string;
        updated_at: string;
      }>;
      scores: Table<{
        id: string;
        competition_id: string;
        team_id: string;
        juri_id: string | null;
        score_value: number;
        criterion_scores: Json;
        status: Database["public"]["Enums"]["score_status"];
        feedback_notes: string;
        created_at: string;
        updated_at: string;
      }>;
      submissions: Table<{
        id: string;
        competition_id: string;
        team_id: string;
        submission_url: string;
        answers: Json;
        submitted_at: string;
        updated_at: string;
      }>;
      team_members: Table<{
        id: string;
        team_id: string;
        user_id: string;
        is_pinru: boolean;
        created_at: string;
      }>;
      teams: Table<{
        id: string;
        name: string;
        category: Database["public"]["Enums"]["team_category"];
        pendamping_id: string | null;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_workspace_scores: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          competitionId: string;
          teamId: string;
          judgeId: string | null;
          judgeName: string;
          criterionScores: Json;
          score: number | null;
          status: Database["public"]["Enums"]["score_status"];
          feedback: string;
        }>;
      };
      get_public_certificate: {
        Args: { target_user_id: string };
        Returns: Json;
      };
      can_access_companion_team: {
        Args: { target_team_id: string };
        Returns: boolean;
      };
      set_certificates_published: {
        Args: { should_publish: boolean };
        Returns: string | null;
      };
      set_leaderboard_published: {
        Args: { should_publish: boolean };
        Returns: string;
      };
      set_competition_active: {
        Args: { target_competition_id: string; should_be_active: boolean };
        Returns: undefined;
      };
      set_team_pinru: {
        Args: { target_user_id: string; target_team_id: string };
        Returns: undefined;
      };
      set_team_pendamping: {
        Args: { target_user_id: string; target_team_id: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      score_status: "draft" | "pending_review" | "approved" | "revision_needed";
      task_type: "cbt" | "upload" | "live";
      team_category: "putra" | "putri";
      user_role:
        | "operator"
        | "panitia"
        | "juri"
        | "peserta"
        | "pendamping_regu";
    };
    CompositeTypes: Record<string, never>;
  };
};
