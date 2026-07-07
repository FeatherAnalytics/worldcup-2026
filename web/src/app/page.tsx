"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import { MapTooltip } from "@/components/MapTooltip";
import { SidePanel } from "@/components/SidePanel";
import { BottomSheet } from "@/components/BottomSheet";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { FilterPanel } from "@/components/FilterPanel";
import { TeamSelector } from "@/components/TeamSelector";
import { TeamSummary } from "@/components/TeamSummary";
import { PlayerCard } from "@/components/PlayerCard";
import { ColorLegend } from "@/components/ColorLegend";
import { CountryDetail } from "@/components/CountryDetail";
import { BracketPanel } from "@/components/BracketPanel";
import { ClubCombobox } from "@/components/ClubCombobox";
import { ClubDetail } from "@/components/ClubDetail";
import { createDiasporaLayers } from "@/components/DiasporaLayer";
import { createSquadLayer } from "@/components/SquadLayer";
import { createFactoriesLayer } from "@/components/FactoriesLayer";
import { createBracketLayers, geoNameToTeam } from "@/components/BracketLayer";
import { createClubLayers } from "@/components/ClubLayer";
import { computeCentroids, type CountryCentroid } from "@/lib/geo";
import { participatingTeams, type StageKey } from "@/lib/bracket";
import {
  loadPlayers,
  loadSummary,
  loadMatches,
  uniqueTeams,
  uniqueConfederations,
  uniqueBirthCountries,
  uniqueClubs,
} from "@/lib/data";
import type { Player, Match, Summary, ViewMode, TooltipInfo } from "@/lib/types";
import type { FeatureCollection, Feature } from "geojson";
import type { PickingInfo } from "deck.gl";

export default function Home() {
  /* ------------------------------------------------------------------ */
  /*  Core data                                                          */
  /* ------------------------------------------------------------------ */
  const [players, setPlayers] = useState<Player[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [centroids, setCentroids] = useState<Map<string, CountryCentroid>>(new Map());

  /* ------------------------------------------------------------------ */
  /*  View & tooltip state                                               */
  /* ------------------------------------------------------------------ */
  const [activeView, setActiveView] = useState<ViewMode>("diaspora");
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Diaspora filters                                                   */
  /* ------------------------------------------------------------------ */
  const [filterConf, setFilterConf] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterBirth, setFilterBirth] = useState("");

  /* ------------------------------------------------------------------ */
  /*  Squad state                                                        */
  /* ------------------------------------------------------------------ */
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  /* Factories state */
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  /* Bracket state */
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedStage, setSelectedStage] = useState<StageKey>("r16");
  const [bracketTeam, setBracketTeam] = useState<string | null>(null);

  /* Clubs state */
  const [filterClub, setFilterClub] = useState("");

  /* ------------------------------------------------------------------ */
  /*  URL state                                                          */
  /* ------------------------------------------------------------------ */
  const [urlApplied, setUrlApplied] = useState(false);

  /* ------------------------------------------------------------------ */
  /*  Data loading                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    loadPlayers().then(setPlayers);
    loadSummary().then(setSummary);
    loadMatches().then(setMatches);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/data/countries.geojson`)
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        setGeojson(data);
        setCentroids(computeCentroids(data));
      });
  }, []);

  // Read URL params once data loads
  useEffect(() => {
    if (urlApplied || players.length === 0) return;
    const params = new URLSearchParams(window.location.search);

    const viewParam = params.get("view") as ViewMode | null;
    const VALID_VIEWS: ViewMode[] = ["diaspora", "squad", "factories", "bracket", "clubs"];
    if (viewParam && VALID_VIEWS.includes(viewParam)) setActiveView(viewParam);

    const teamParam = params.get("team");
    if (teamParam) setSelectedTeam(teamParam);

    const clubParam = params.get("club");
    if (clubParam) setFilterClub(clubParam);

    const confParam = params.get("conf");
    if (confParam) setFilterConf(confParam);

    const birthParam = params.get("birth");
    if (birthParam) setFilterBirth(birthParam);

    const stageParam = params.get("stage") as StageKey | null;
    if (stageParam) setSelectedStage(stageParam);

    const countryParam = params.get("country");
    if (countryParam) setSelectedCountry(countryParam);

    const filterTeamParam = params.get("filterTeam");
    if (filterTeamParam) setFilterTeam(filterTeamParam);

    setUrlApplied(true);
  }, [players, urlApplied]);

  // Write URL params on state change
  useEffect(() => {
    if (!urlApplied) return;
    const params = new URLSearchParams();
    if (activeView !== "diaspora") params.set("view", activeView);
    if (activeView === "squad" && selectedTeam) params.set("team", selectedTeam);
    if (activeView === "clubs" && filterClub) params.set("club", filterClub);
    if (activeView === "diaspora" && filterConf) params.set("conf", filterConf);
    if (activeView === "diaspora" && filterTeam) params.set("filterTeam", filterTeam);
    if (activeView === "diaspora" && filterBirth) params.set("birth", filterBirth);
    if (activeView === "bracket" && selectedStage !== "r16") params.set("stage", selectedStage);
    if (activeView === "factories" && selectedCountry) params.set("country", selectedCountry);

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [urlApplied, activeView, selectedTeam, filterClub, filterConf, filterTeam, filterBirth, selectedStage, selectedCountry]);

  // Set default selectedTeam once players load (only if URL didn't set one)
  useEffect(() => {
    if (players.length > 0 && selectedTeam === "") {
      const teams = uniqueTeams(players);
      if (teams.length > 0) setSelectedTeam(teams[0]);
    }
  }, [players, selectedTeam]);

  /* ------------------------------------------------------------------ */
  /*  Derived lists                                                      */
  /* ------------------------------------------------------------------ */
  const allTeams = useMemo(() => uniqueTeams(players), [players]);
  const allConfederations = useMemo(() => uniqueConfederations(players), [players]);
  const allBirthCountries = useMemo(() => uniqueBirthCountries(players), [players]);

  const allClubs = useMemo(() => uniqueClubs(players), [players]);

  const clubPlayers = useMemo(
    () => filterClub ? players.filter((p) => p.club === filterClub) : [],
    [players, filterClub]
  );

  const filteredTeams = useMemo(() => {
    let pool = players;
    if (filterConf) pool = pool.filter((p) => p.team_confederation === filterConf);
    if (filterBirth) pool = pool.filter((p) => p.birth_country === filterBirth);
    return [...new Set(pool.map((p) => p.team_country))].sort();
  }, [players, filterConf, filterBirth]);

  const filteredBirthCountries = useMemo(() => {
    let pool = players;
    if (filterConf) pool = pool.filter((p) => p.team_confederation === filterConf);
    if (filterTeam) pool = pool.filter((p) => p.team_country === filterTeam);
    return [...new Set(pool.filter((p) => p.birth_country).map((p) => p.birth_country))].sort();
  }, [players, filterConf, filterTeam]);

  const squadPlayers = useMemo(
    () => players.filter((p) => p.team_country === selectedTeam),
    [players, selectedTeam]
  );

  const activeTeams = useMemo(
    () => participatingTeams(matches, selectedStage),
    [matches, selectedStage]
  );

  const bracketTeamPlayers = useMemo(
    () => bracketTeam ? players.filter((p) => p.team_country === bracketTeam) : [],
    [players, bracketTeam]
  );

  const getConfederation = useCallback(
    (team: string) => players.find((p) => p.team_country === team)?.team_confederation ?? "",
    [players]
  );

  /* ------------------------------------------------------------------ */
  /*  View change handler — reset transient state                        */
  /* ------------------------------------------------------------------ */
  const handleViewChange = useCallback(
    (v: ViewMode) => {
      setActiveView(v);
      setTooltip(null);
      setSelectedPlayer(null);
      setSelectedCountry(null);
      setBracketTeam(null);
      setFilterClub("");
      // Reset squad selection to first team when entering squad view
      if (v === "squad" && selectedTeam === "" && allTeams.length > 0) {
        setSelectedTeam(allTeams[0]);
      }
    },
    [selectedTeam, allTeams]
  );

  /* ------------------------------------------------------------------ */
  /*  Layers                                                             */
  /* ------------------------------------------------------------------ */
  const diasporaPlayers = useMemo(() => {
    let pool = players;
    if (filterConf) pool = pool.filter((p) => p.team_confederation === filterConf);
    if (filterTeam) pool = pool.filter((p) => p.team_country === filterTeam);
    if (filterBirth) pool = pool.filter((p) => p.birth_country === filterBirth);
    const hasFilter = filterConf || filterTeam || filterBirth;
    if (!hasFilter) pool = pool.filter((p) => p.is_foreign_born);
    return pool;
  }, [players, filterConf, filterTeam, filterBirth]);

  const layers = useMemo(() => {
    if (activeView === "diaspora" && diasporaPlayers.length > 0 && centroids.size > 0) {
      return createDiasporaLayers(diasporaPlayers, centroids);
    }
    if (activeView === "squad" && squadPlayers.length > 0) {
      return [createSquadLayer(squadPlayers, selectedPlayer)];
    }
    if (activeView === "factories" && geojson && players.length > 0) {
      const foreignByCountry = new Map<string, { birth_country: string; player_count: number; teams_represented: number }>();
      for (const p of players) {
        if (!p.is_foreign_born || !p.birth_country) continue;
        const entry = foreignByCountry.get(p.birth_country) ?? { birth_country: p.birth_country, player_count: 0, teams_represented: 0 };
        entry.player_count++;
        foreignByCountry.set(p.birth_country, entry);
      }
      const teamsPerCountry = new Map<string, Set<string>>();
      for (const p of players) {
        if (!p.is_foreign_born || !p.birth_country) continue;
        const s = teamsPerCountry.get(p.birth_country) ?? new Set();
        s.add(p.team_country);
        teamsPerCountry.set(p.birth_country, s);
      }
      const foreignBirthCountries = [...foreignByCountry.values()].map((e) => ({
        ...e,
        teams_represented: teamsPerCountry.get(e.birth_country)?.size ?? 0,
      }));
      return [createFactoriesLayer(geojson, foreignBirthCountries)];
    }
    if (activeView === "bracket" && geojson && players.length > 0 && centroids.size > 0) {
      return createBracketLayers(geojson, players, activeTeams, centroids, bracketTeam, getConfederation);
    }
    if (activeView === "clubs" && clubPlayers.length > 0 && centroids.size > 0) {
      return createClubLayers(clubPlayers, centroids);
    }
    return [];
  }, [activeView, diasporaPlayers, centroids, squadPlayers, selectedPlayer, geojson, players, activeTeams, bracketTeam, getConfederation, clubPlayers]);

  /* ------------------------------------------------------------------ */
  /*  Hover handler                                                      */
  /* ------------------------------------------------------------------ */
  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        setTooltip(null);
        return;
      }

      if (activeView === "diaspora") {
        const arc = info.object as { player: Player };
        if (!arc.player) { setTooltip(null); return; }
        setTooltip({
          x: info.x,
          y: info.y,
          content: (
            <div>
              <p className="font-medium">{arc.player.name}</p>
              <p className="text-stone-500">
                {arc.player.birth_city}, {arc.player.birth_country} &rarr; {arc.player.team_country}
              </p>
              <p className="text-xs text-stone-400">{arc.player.club}</p>
            </div>
          ),
        });
      } else if (activeView === "squad") {
        const player = info.object as Player;
        if (!player.name) { setTooltip(null); return; }
        setTooltip({
          x: info.x,
          y: info.y,
          content: (
            <div>
              <p className="font-medium">{player.name}</p>
              <p className="text-stone-500">{player.position}</p>
              <p className="text-xs text-stone-400">
                {player.birth_city}, {player.birth_country}
              </p>
            </div>
          ),
        });
      } else if (activeView === "bracket") {
        const obj = info.object as Player | Feature;
        if ("name" in obj && "team_country" in obj) {
          const player = obj as Player;
          setTooltip({
            x: info.x,
            y: info.y,
            content: (
              <div>
                <p className="font-medium">{player.name}</p>
                <p className="text-stone-500">{player.team_country} &middot; {player.position}</p>
                <p className="text-xs text-stone-400">{player.birth_city}, {player.birth_country}</p>
              </div>
            ),
          });
        } else {
          setTooltip(null);
        }
      } else if (activeView === "factories") {
        const feature = info.object as Feature;
        const name = (feature.properties?.NAME ?? feature.properties?.ADMIN ?? "") as string;
        const foreignFromHere = players.filter((p) => p.birth_country === name && p.is_foreign_born);
        if (foreignFromHere.length === 0) { setTooltip(null); return; }
        const teamCount = new Set(foreignFromHere.map((p) => p.team_country)).size;
        setTooltip({
          x: info.x,
          y: info.y,
          content: (
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-stone-500">{foreignFromHere.length} players on other teams</p>
              <p className="text-xs text-stone-400">{teamCount} teams represented</p>
            </div>
          ),
        });
      } else if (activeView === "clubs") {
        const arc = info.object as { teamCountry?: string; playerCount?: number };
        if (arc?.teamCountry) {
          const teamPlayers = clubPlayers.filter((p) => p.team_country === arc.teamCountry);
          setTooltip({
            x: info.x,
            y: info.y,
            content: (
              <div>
                <p className="font-medium">{arc.teamCountry}</p>
                <p className="text-stone-500">{arc.playerCount} {arc.playerCount === 1 ? "player" : "players"}</p>
                <p className="text-xs text-stone-400">{teamPlayers.map((p) => p.name).join(", ")}</p>
              </div>
            ),
          });
        } else {
          setTooltip(null);
        }
      }
    },
    [activeView, players, clubPlayers]
  );

  /* ------------------------------------------------------------------ */
  /*  Click handler                                                      */
  /* ------------------------------------------------------------------ */
  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (activeView === "squad" && info.object) {
        const player = info.object as Player;
        if (player.name) setSelectedPlayer(player);
      }
      if (activeView === "bracket") {
        if (info.object) {
          const obj = info.object as Record<string, unknown>;
          let teamName: string | null = null;
          if ("team_country" in obj && typeof obj.team_country === "string") {
            teamName = obj.team_country;
          } else if ("properties" in obj) {
            const feat = obj as unknown as Feature;
            const geoName = (feat.properties?.NAME ?? feat.properties?.ADMIN ?? "") as string;
            teamName = geoNameToTeam(geoName);
            if (!activeTeams.has(teamName)) teamName = null;
          }
          if (teamName) {
            setBracketTeam((prev) => prev === teamName ? null : teamName);
          }
        } else {
          setBracketTeam(null);
        }
      }
      if (activeView === "factories" && info.object) {
        const feature = info.object as Feature;
        const name = (feature.properties?.NAME ?? feature.properties?.ADMIN ?? "") as string;
        if (name) setSelectedCountry(name);
      }
    },
    [activeView]
  );

  /* ------------------------------------------------------------------ */
  /*  Shared panel content — used in SidePanel + BottomSheet             */
  /* ------------------------------------------------------------------ */
  function PanelContent() {
    if (activeView === "diaspora") {
      const hasFilter = filterConf || filterTeam || filterBirth;
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-r-lg border-l-[3px] border-[#4A7FB5] bg-stone-50 px-3.5 py-3">
            {!hasFilter ? (
              <p className="font-display text-sm italic text-stone-600 leading-relaxed">
                Showing <span className="not-italic font-bold text-stone-900">{diasporaPlayers.length} foreign-born</span>{" "}
                players &mdash; those representing a different country than where they were born.
              </p>
            ) : (
              <p className="font-display text-sm italic text-stone-600 leading-relaxed">
                Showing <span className="not-italic font-bold text-stone-900">{diasporaPlayers.length}</span> players matching filter.
              </p>
            )}
          </div>
          <FilterPanel
          confederations={allConfederations}
          teams={filteredTeams}
          birthCountries={filteredBirthCountries}
          selectedConfederation={filterConf}
          selectedTeam={filterTeam}
          selectedBirthCountry={filterBirth}
          onConfederationChange={setFilterConf}
          onTeamChange={setFilterTeam}
          onBirthCountryChange={setFilterBirth}
          onClear={() => {
            setFilterConf("");
            setFilterTeam("");
            setFilterBirth("");
          }}
        />
        </div>
      );
    }
    if (activeView === "squad") {
      return (
        <div className="flex flex-col gap-3">
          <TeamSelector teams={allTeams} selected={selectedTeam} onChange={setSelectedTeam} />
          <TeamSummary team={selectedTeam} players={squadPlayers} />
          {selectedPlayer && <PlayerCard player={selectedPlayer} />}
        </div>
      );
    }
    if (activeView === "factories") {
      const countryPlayers = selectedCountry
        ? players.filter((p) => p.birth_country === selectedCountry && p.is_foreign_born)
        : [];
      return (
        <div className="flex flex-col gap-3">
          <ColorLegend />
          {selectedCountry && countryPlayers.length > 0 && (
            <CountryDetail
              country={selectedCountry}
              players={countryPlayers}
              onClose={() => setSelectedCountry(null)}
            />
          )}
          {!selectedCountry && (
            <p className="text-xs text-stone-400">Click a country to see which teams its players represent</p>
          )}
        </div>
      );
    }
    if (activeView === "bracket") {
      return (
        <BracketPanel
          matches={matches}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
          selectedTeam={bracketTeam}
          onTeamClick={(team) => setBracketTeam((prev) => prev === team ? null : team)}
          teamPlayers={bracketTeamPlayers}
        />
      );
    }
    if (activeView === "clubs") {
      return (
        <div className="flex flex-col gap-4">
          <ClubCombobox clubs={allClubs} selected={filterClub} onChange={setFilterClub} />
          {filterClub && clubPlayers.length > 0 && (
            <ClubDetail club={filterClub} players={clubPlayers} />
          )}
          {!filterClub && (
            <div className="rounded-r-lg border-l-[3px] border-[#4A7FB5] bg-stone-50 px-3.5 py-3">
              <p className="font-display text-sm italic text-stone-600 leading-relaxed">
                Search for a club to see which national teams its players represent.
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-stone-200 bg-white px-7 pb-4 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4A7FB5]">
          2026 FIFA World Cup
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
          Where Players Come From
        </h1>
        <p className="font-display mt-1 text-[15px] italic text-stone-500">
          Nearly 1 in 4 players represents a country they weren&apos;t born in
        </p>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Desktop side panel */}
        <SidePanel
          activeView={activeView}
          onViewChange={handleViewChange}
          players={players}
          summary={summary}
        >
          <PanelContent />
        </SidePanel>

        {/* Map */}
        <div className="relative flex-1">
          <MapView
            deckProps={{
              layers,
              onHover: handleHover,
              onClick: handleClick,
            }}
          />
          {tooltip && (
            <MapTooltip x={tooltip.x} y={tooltip.y}>
              {tooltip.content}
            </MapTooltip>
          )}
        </div>
      </main>

      {/* Mobile bottom sheet */}
      <BottomSheet>
        <div className="mb-3">
          <ViewSwitcher active={activeView} onChange={handleViewChange} />
        </div>
        <PanelContent />
      </BottomSheet>

      <footer className="flex justify-between border-t border-stone-200 bg-white px-7 py-2 text-[11px] text-stone-400">
        <span>Data: Wikipedia + Wikidata</span>
        <span>Basemap: CartoDB Voyager &middot; Built with deck.gl</span>
      </footer>
    </div>
  );
}
