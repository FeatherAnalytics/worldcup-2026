export type ViewMode = "diaspora" | "squad" | "factories" | "bracket";

export interface Match {
  round: string;
  stage: "group" | "knockout";
  date: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  penalties_a?: number;
  penalties_b?: number;
}

export interface Player {
  name: string;
  team_country: string;
  team_confederation: string;
  position: string;
  club: string;
  club_country: string;
  birth_date: string;
  birth_city: string;
  birth_country: string;
  birth_lat: number | null;
  birth_lon: number | null;
  caps: number;
  goals: number;
  is_foreign_born: boolean;
  birth_country_known: boolean;
}

export interface TeamSummary {
  team_country: string;
  squad_size: number;
  foreign_born_count: number;
  birth_countries: number;
  birth_country_known_count?: number;
}

export interface BirthCountrySummary {
  birth_country: string;
  player_count: number;
  teams_represented: number;
}

export interface ConfederationSummary {
  team_confederation: string;
  player_count: number;
  team_count: number;
  foreign_born_count: number;
}

export interface ClubSummary {
  club: string;
  player_count: number;
  teams_represented: number;
}

export interface Summary {
  total_players: number;
  total_teams: number;
  foreign_born_count: number;
  foreign_born_pct: number;
  birth_country_known_count?: number;
  teams: TeamSummary[];
  birth_countries: BirthCountrySummary[];
  confederations: ConfederationSummary[];
  top_clubs: ClubSummary[];
}

export interface TooltipInfo {
  x: number;
  y: number;
  content: React.ReactNode;
}
