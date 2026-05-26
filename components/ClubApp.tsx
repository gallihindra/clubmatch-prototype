"use client";

import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Hash,
  Home,
  ListPlus,
  Minus,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Trophy,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultSelectedIds, demoPlayers, initials, Match, Player } from "@/lib/mockData";

type Screen = "home" | "players" | "new" | "active" | "leaderboard";
type SessionFormat = "Smart Rotation";
type RoundLimitMode = "manual" | "duration";
type LeaderboardView = "host" | "player";
type LeaderboardDisplayMode = "standings" | "snapshot";
type MatchmakingMode = "smart" | "tier" | "custom";
type GenderCategory = NonNullable<Player["genderCategory"]>;
type DoublesFormat = "open" | "mens" | "womens" | "mixed";
type PlayerTier = Player["tier"];
type PlayerDraft = {
  name: string;
  initials: string;
  tier: PlayerTier;
  rating: string;
  style: string;
  genderCategory: GenderCategory;
};
type SessionStat = {
  matches: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};
type SessionHistory = {
  partners: string[];
  opponentGroups: string[];
};
type PlayerSessionStatus = "active" | "not_arrived" | "temporarily_unavailable" | "left";
type MatchResultStatus = "saved" | "completed" | "skipped_result" | "skipped_not_started" | "cancelled" | "deferred";
type SavedMatchResult = {
  skipped: boolean;
  status: MatchResultStatus;
  teamAIds: number[];
  teamBIds: number[];
  unavailableIds?: number[];
  scoreA?: number;
  scoreB?: number;
  replayCompleted?: boolean;
};
type SessionStatsSnapshot = {
  stats: Record<number, SessionStat>;
  completedMatchesCount: number;
  countedMatchIds: string[];
  ignoredMatchIds: string[];
  playerMatchCounts: Record<number, number>;
  completedPlayerSlots: number;
  finalMatchCountGap: number;
};
type CompletedSessionSummary = {
  completedAt: string;
  totalRounds: number;
  stats: Record<number, SessionStat>;
};
type DeferredMatchBlock = {
  id: string;
  originalRound: number;
  court: number;
  allPlayerIds: number[];
  teamAIds: number[];
  teamBIds: number[];
};
type SessionMatchHistory = {
  exactMatchKeys: string[];
  fourPlayerGroupKeys: string[];
  partnerPairKeys: string[];
  opponentGroupKeys: string[];
  coAppearanceCounts: Record<string, number>;
};
type BenchFairnessContext = {
  playedLastRoundIds: number[];
  benchedLastRoundIds: number[];
  benchCounts: Record<number, number>;
  consecutiveBenchCounts: Record<number, number>;
  matchesPlayed: Record<number, number>;
  lastPlayedRound: Record<number, number>;
};
type MatchmakingConfig = {
  mode: MatchmakingMode;
  sameTierPercentage: number;
  mixedTierPercentage: number;
  roundNumber: number;
  totalRounds: number;
  courtCount: number;
  doublesFormat: DoublesFormat;
  avoidFormatMismatch: boolean;
  deferredPlayerIds?: number[];
  deferredGroupKeys?: string[];
  deferredOpponentKeys?: string[];
  deferredMatchBlocks?: DeferredMatchBlock[];
  sessionMatchHistory?: SessionMatchHistory;
  benchFairness?: BenchFairnessContext;
};
type GenerationDebug = {
  requestedRound: number;
  previousRound: number;
  availablePlayers: string[];
  activePlayersBeforeGeneration: string[];
  nonDeferredActivePlayersBeforeGeneration: string[];
  requiredPlayers: number;
  hardExclusionApplied: boolean;
  lastDeferredPlayerIdsForNextRound: number[];
  deferredPlayerIds: number[];
  deferredPlayerNames: string[];
  deprioritizedPlayers: string[];
  generatedPlayers: string[];
  deferredGroupKeys: string[];
  deferredOpponentKeys: string[];
  deferredMatchBlocks: string[];
  candidateRejectedBecauseExactDeferredMatch: string[];
  candidatePenalizedBecauseSameFourPlayerGroup: string[];
  generatedMatchKeys: string[];
  generatedFourPlayerGroupKeys: string[];
  exactDuplicateCandidatesRejected: string[];
  sameFourPlayerGroupCandidatesPenalized: string[];
  rematchPenaltyDebug: string[];
  partnerRepeatPenaltyDebug: string[];
  opponentRepeatPenaltyDebug: string[];
  playedLastRound: string[];
  benchedLastRound: string[];
  consecutiveBenchCountDebug: string[];
  matchesPlayedDebug: string[];
  selectedPlayingPool: string[];
  benchedThisRound: string[];
  benchReasonDebug: string[];
  selectedReasonDebug: string[];
  selectedFourPlayerGroupKey: string;
  selectedGroupUsedBefore: boolean;
  selectedGroupCoAppearanceTotal: number;
  selectedGroupReason: string;
  matchCountDistributionAfterSelection: string[];
  matchCountGapBefore: number;
  matchCountGapAfter: number;
  totalPlayerSlots: number;
  remainingRoundsIncludingCurrent: number;
  remainingPlayerSlots: number;
  idealTargetMatchesPerPlayer: number;
};
type GenerationHistoryDebugEntry = {
  round: number;
  selectedPlayingPool: string;
  benchedPlayers: string;
  teamA: string;
  teamB: string;
  fourPlayerGroupKey: string;
  priorGroupUses: number;
  coAppearanceTotal: number;
  matchesBefore: string;
  matchesAfter: string;
  consecutiveBenchBefore: string;
  reason: string;
};
type ParticipationScheduleEntry = {
  roundNumber: number;
  playingPlayerIds: number[];
  benchedPlayerIds: number[];
  fourPlayerGroupKey: string;
  coAppearanceTotal: number;
  targetMin: number;
  targetMax: number;
  matchCountsBefore: Record<number, number>;
  matchCountsAfter: Record<number, number>;
  consecutiveBenchBefore: Record<number, number>;
  reason: string;
};
type ActiveReplay = {
  round: number;
  court: number;
};

const PLAYER_STORAGE_KEY = "clubmatch.players.v1";
const LAST_SESSION_STORAGE_KEY = "clubmatch.lastSession.v1";
const showSkillDataToPlayers = false;
const RESOLVED_MATCH_STATUSES: MatchResultStatus[] = ["saved", "completed", "skipped_result", "skipped_not_started", "cancelled", "deferred"];
const getDefaultRatingForTier = (tier: PlayerTier): number => {
  switch (tier) {
    case "A": return 4.0;
    case "B": return 3.5;
    case "C": return 3.0;
    case "D": return 2.5;
    default: return 3.0;
  }
};
const tierValues: Record<Player["tier"], number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1
};

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    initials: player.initials || initials(player.name),
    tier: player.tier || "C",
    rating: Number.isFinite(Number(player.rating)) ? Number(player.rating) : getDefaultRatingForTier(player.tier || "C"),
    style: player.style || player.notes || "All court",
    genderCategory: coerceGenderCategory(player.genderCategory)
  };
}

function coerceGenderCategory(value: unknown): GenderCategory {
  return value === "female" ? "female" : "male";
}

function blankStat(): SessionStat {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0
  };
}

function getPlayerStat(stats: Record<number, SessionStat>, id: number) {
  return stats[id] ?? blankStat();
}

function getSessionStatsFromMatches({
  players,
  roundMatches,
  savedResults
}: {
  players: Player[];
  roundMatches: Record<number, Match[]>;
  savedResults: Record<string, SavedMatchResult>;
}): SessionStatsSnapshot {
  const stats = Object.fromEntries(players.map((player) => [player.id, blankStat()]));
  const countedMatchIds: string[] = [];
  const ignoredMatchIds: string[] = [];
  const applyTeam = (ids: number[], won: boolean, pointsFor: number, pointsAgainst: number) => {
    ids.forEach((id) => {
      const stat = stats[id] ?? blankStat();
      stats[id] = {
        matches: stat.matches + 1,
        wins: stat.wins + (won ? 1 : 0),
        losses: stat.losses + (won ? 0 : 1),
        pointsFor: stat.pointsFor + pointsFor,
        pointsAgainst: stat.pointsAgainst + pointsAgainst
      };
    });
  };

  Object.entries(roundMatches).forEach(([roundKey, matches]) => {
    matches.forEach((match) => {
      const key = matchResultKey(Number(roundKey), match.court);
      const result = savedResults[key];

      if (!isPlayedResult(result) || result?.scoreA === undefined || result.scoreB === undefined) {
        ignoredMatchIds.push(`${key}:${getMatchResultStatus(result) ?? "not_started"}`);
        return;
      }

      const teamAWon = result.scoreA > result.scoreB;
      countedMatchIds.push(key);
      applyTeam(result.teamAIds, teamAWon, result.scoreA, result.scoreB);
      applyTeam(result.teamBIds, !teamAWon, result.scoreB, result.scoreA);
    });
  });

  const playerMatchCounts = Object.fromEntries(players.map((player) => [player.id, getPlayerStat(stats, player.id).matches]));
  const values = players.map((player) => playerMatchCounts[player.id] ?? 0);
  const finalMatchCountGap = values.length ? Math.max(...values) - Math.min(...values) : 0;

  return {
    stats,
    completedMatchesCount: countedMatchIds.length,
    countedMatchIds,
    ignoredMatchIds,
    playerMatchCounts,
    completedPlayerSlots: countedMatchIds.length * 4,
    finalMatchCountGap
  };
}

function pairKey(players: Player[]) {
  return players.map((player) => player.id).sort((a, b) => a - b).join("-");
}

function idPairKey(ids: number[]) {
  return [...ids].sort((a, b) => a - b).join("-");
}

function opponentGroupKey(teamA: Player[], teamB: Player[]) {
  return `${pairKey(teamA)}-vs-${pairKey(teamB)}`;
}

function opponentIdGroupKey(teamAIds: number[], teamBIds: number[]) {
  return `${idPairKey(teamAIds)}-vs-${idPairKey(teamBIds)}`;
}

function exactMatchKey(teamA: Player[], teamB: Player[]) {
  const teamKeys = [pairKey(teamA), pairKey(teamB)].sort();
  return `${teamKeys[0]}-vs-${teamKeys[1]}`;
}

function exactIdMatchKey(teamAIds: number[], teamBIds: number[]) {
  const teamKeys = [idPairKey(teamAIds), idPairKey(teamBIds)].sort();
  return `${teamKeys[0]}-vs-${teamKeys[1]}`;
}

function fourPlayerGroupKey(players: Player[]) {
  return pairKey(players);
}

function partnerPairKeysForMatch(teamA: Player[], teamB: Player[]) {
  return [pairKey(teamA), pairKey(teamB)];
}

function coAppearancePairKeys(players: Player[]) {
  return combinations(players, 2).map((pair) => pairKey(pair));
}

function coAppearanceTotal(players: Player[], history?: SessionMatchHistory) {
  return coAppearancePairKeys(players).reduce((sum, key) => sum + (history?.coAppearanceCounts[key] ?? 0), 0);
}

function deferredBlockId(round: number, court: number) {
  return matchResultKey(round, court);
}

function matchToDeferredBlock(match: Match, round: number): DeferredMatchBlock {
  return {
    id: deferredBlockId(round, match.court),
    originalRound: round,
    court: match.court,
    allPlayerIds: [...match.teamA, ...match.teamB].map((player) => player.id),
    teamAIds: match.teamA.map((player) => player.id),
    teamBIds: match.teamB.map((player) => player.id)
  };
}

function isExactDeferredBlockMatch(teamA: Player[], teamB: Player[], block: DeferredMatchBlock) {
  return exactMatchKey(teamA, teamB) === exactIdMatchKey(block.teamAIds, block.teamBIds);
}

function sessionMatchHistoryFromRounds(roundMatches: Record<number, Match[]>, beforeRound: number): SessionMatchHistory {
  const previousMatches = Object.entries(roundMatches).flatMap(([roundKey, matches]) =>
    Number(roundKey) < beforeRound ? matches : []
  );
  const coAppearanceCounts: Record<string, number> = {};

  previousMatches.forEach((match) => {
    coAppearancePairKeys([...match.teamA, ...match.teamB]).forEach((key) => {
      coAppearanceCounts[key] = (coAppearanceCounts[key] ?? 0) + 1;
    });
  });

  return {
    exactMatchKeys: previousMatches.map((match) => exactMatchKey(match.teamA, match.teamB)),
    fourPlayerGroupKeys: previousMatches.map((match) => fourPlayerGroupKey([...match.teamA, ...match.teamB])),
    partnerPairKeys: previousMatches.flatMap((match) => partnerPairKeysForMatch(match.teamA, match.teamB)),
    opponentGroupKeys: previousMatches.map((match) => exactMatchKey(match.teamA, match.teamB)),
    coAppearanceCounts
  };
}

function benchFairnessFromRounds(roundMatches: Record<number, Match[]>, beforeRound: number, players: Player[]): BenchFairnessContext {
  const playerIds = players.map((player) => player.id);
  const playerIdSet = new Set(playerIds);
  const generatedRounds = Object.entries(roundMatches)
    .map(([roundKey, matches]) => ({ round: Number(roundKey), matches }))
    .filter(({ round, matches }) => round < beforeRound && matches.length > 0)
    .sort((a, b) => a.round - b.round);
  const benchCounts = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const matchesPlayed = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const lastPlayedRound = Object.fromEntries(playerIds.map((id) => [id, 0]));
  let playedLastRoundIds: number[] = [];
  let benchedLastRoundIds: number[] = [];

  generatedRounds.forEach(({ round, matches }) => {
    const playedIds = new Set(
      matches
        .flatMap((match) => [...match.teamA, ...match.teamB])
        .map((player) => player.id)
        .filter((id) => playerIdSet.has(id))
    );

    playerIds.forEach((id) => {
      if (playedIds.has(id)) {
        matchesPlayed[id] = (matchesPlayed[id] ?? 0) + 1;
        lastPlayedRound[id] = round;
      } else {
        benchCounts[id] = (benchCounts[id] ?? 0) + 1;
      }
    });

    playedLastRoundIds = playerIds.filter((id) => playedIds.has(id));
    benchedLastRoundIds = playerIds.filter((id) => !playedIds.has(id));
  });

  const consecutiveBenchCounts = Object.fromEntries(playerIds.map((id) => [id, 0]));
  playerIds.forEach((id) => {
    let count = 0;
    for (let index = generatedRounds.length - 1; index >= 0; index -= 1) {
      const playedIds = new Set(generatedRounds[index].matches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.id));
      if (playedIds.has(id)) {
        break;
      }
      count += 1;
    }
    consecutiveBenchCounts[id] = count;
  });

  return {
    playedLastRoundIds,
    benchedLastRoundIds,
    benchCounts,
    consecutiveBenchCounts,
    matchesPlayed,
    lastPlayedRound
  };
}

function groupVarietyScore(group: Player[], history?: SessionMatchHistory) {
  const groupKey = fourPlayerGroupKey(group);
  const groupUseCount = history?.fourPlayerGroupKeys.filter((key) => key === groupKey).length ?? 0;
  const recentGroupKeys = history?.fourPlayerGroupKeys.slice(-2) ?? [];
  const repeatedPartnerPairs = coAppearancePairKeys(group).reduce(
    (sum, key) => sum + (history?.partnerPairKeys.filter((partnerKey) => partnerKey === key).length ?? 0),
    0
  );
  const repeatedOpponentGroups = history?.opponentGroupKeys.filter((key) => key === groupKey).length ?? 0;
  const coAppearance = coAppearanceTotal(group, history);

  return {
    groupKey,
    groupUseCount,
    usedRecently: recentGroupKeys.includes(groupKey),
    coAppearance,
    repeatedPartnerPairs,
    repeatedOpponentGroups,
    penalty:
      groupUseCount * 10000 +
      (recentGroupKeys.includes(groupKey) ? 10000 : 0) +
      coAppearance * 100 +
      repeatedPartnerPairs * 1000 +
      repeatedOpponentGroups * 1500
  };
}

function isMatchCountValidPool(group: Player[], players: Player[], matchCountFor: (player: Player) => number) {
  const selectedIds = new Set(group.map((player) => player.id));
  const selectedMax = Math.max(...group.map(matchCountFor));
  const lowerBenchedPlayer = players.find((player) => !selectedIds.has(player.id) && matchCountFor(player) < selectedMax);

  return !lowerBenchedPlayer;
}

function selectPlayingPool(
  players: Player[],
  activeCount: number,
  stats: Record<number, SessionStat>,
  benchFairness?: BenchFairnessContext,
  history?: SessionMatchHistory,
  doublesFormat: DoublesFormat = "open"
) {
  if (players.length <= activeCount) {
    return players;
  }

  const matchCountFor = (player: Player) => benchFairness?.matchesPlayed[player.id] ?? getPlayerStat(stats, player.id).matches;
  const tieBreak = (group: Player[]) =>
    group.reduce(
      (sum, player) =>
        sum -
        (benchFairness?.consecutiveBenchCounts[player.id] ?? 0) * 10 +
        (benchFairness?.lastPlayedRound[player.id] ?? 0),
      0
    );
  const allCandidates = combinations(players, activeCount);
  const formatCandidates = allCandidates.filter((group) => groupCanCreateDoublesFormatMatch(group, doublesFormat));
  const formatSafeCandidates = formatCandidates.length > 0 ? formatCandidates : allCandidates;
  const fairCandidates = formatSafeCandidates.filter((group) => isMatchCountValidPool(group, players, matchCountFor));
  const candidates = fairCandidates.length > 0 ? fairCandidates : formatSafeCandidates;
  const unusedCandidates = candidates.filter((group) => groupVarietyScore(group, history).groupUseCount === 0);
  const nonRecentCandidates = candidates.filter((group) => !groupVarietyScore(group, history).usedRecently);
  const candidatePool = unusedCandidates.length > 0
    ? unusedCandidates
    : nonRecentCandidates.length > 0
      ? nonRecentCandidates
      : candidates;
  const rankedCandidates = candidatePool
    .map((group) => ({
      group,
      matchCountTotal: group.reduce((sum, player) => sum + matchCountFor(player), 0),
      variety: groupVarietyScore(group, history),
      tieBreak: tieBreak(group)
    }))
    .sort(
      (a, b) =>
        a.matchCountTotal - b.matchCountTotal ||
        a.variety.penalty - b.variety.penalty ||
        a.tieBreak - b.tieBreak ||
        fourPlayerGroupKey(a.group).localeCompare(fourPlayerGroupKey(b.group))
    );

  return rankedCandidates[0]?.group ?? [];
}

function quotaInfo(totalRounds: number, courtCount: number, roundNumber: number, activePlayerCount: number) {
  const totalPlayerSlots = totalRounds * courtCount * 4;
  const remainingRoundsIncludingCurrent = Math.max(totalRounds - roundNumber + 1, 0);
  const remainingPlayerSlots = remainingRoundsIncludingCurrent * courtCount * 4;
  const idealTargetMatchesPerPlayer = activePlayerCount > 0 ? totalPlayerSlots / activePlayerCount : 0;

  return {
    totalPlayerSlots,
    remainingRoundsIncludingCurrent,
    remainingPlayerSlots,
    idealTargetMatchesPerPlayer
  };
}

function matchCountGap(players: Player[], counts: Record<number, number>) {
  if (players.length === 0) {
    return 0;
  }

  const values = players.map((player) => counts[player.id] ?? 0);
  return Math.max(...values) - Math.min(...values);
}

function generateParticipationSchedule({
  players,
  totalRounds,
  courtCount,
  sessionFormat,
  doublesFormat,
  matchmakingMode,
  lockedSchedule = []
}: {
  players: Player[];
  totalRounds: number;
  courtCount: number;
  sessionFormat: SessionFormat;
  doublesFormat: DoublesFormat;
  matchmakingMode: MatchmakingMode;
  lockedSchedule?: ParticipationScheduleEntry[];
}) {
  const schedulePlayers = eligiblePlayersForDoublesFormat(players, doublesFormat);
  const activeCount = Math.min(courtCount * 4, Math.floor(schedulePlayers.length / 4) * 4);
  const totalSlots = totalRounds * activeCount;
  const targetMin = schedulePlayers.length > 0 ? Math.floor(totalSlots / schedulePlayers.length) : 0;
  const targetMax = schedulePlayers.length > 0 ? Math.ceil(totalSlots / schedulePlayers.length) : 0;
  const playerIds = schedulePlayers.map((player) => player.id);
  const playerIdSet = new Set(playerIds);
  const counts = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const consecutiveBench = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const groupUseCounts: Record<string, number> = {};
  const coAppearanceCounts: Record<string, number> = {};
  const normalizedLockedSchedule = lockedSchedule
    .filter((entry) => entry.roundNumber <= totalRounds)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const schedule: ParticipationScheduleEntry[] = [];

  const applyScheduledRound = (entry: ParticipationScheduleEntry) => {
    const playingIds = entry.playingPlayerIds.filter((id) => playerIdSet.has(id));
    const playingIdSet = new Set(playingIds);

    playingIds.forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    coAppearancePairKeys(schedulePlayers.filter((player) => playingIdSet.has(player.id))).forEach((key) => {
      coAppearanceCounts[key] = (coAppearanceCounts[key] ?? 0) + 1;
    });
    if (playingIds.length > 0) {
      const groupKey = idPairKey(playingIds);
      groupUseCounts[groupKey] = (groupUseCounts[groupKey] ?? 0) + 1;
    }
    playerIds.forEach((id) => {
      consecutiveBench[id] = playingIdSet.has(id) ? 0 : (consecutiveBench[id] ?? 0) + 1;
    });
  };

  normalizedLockedSchedule.forEach((entry) => {
    schedule.push(entry);
    applyScheduledRound(entry);
  });

  for (let roundNumber = schedule.length + 1; roundNumber <= totalRounds; roundNumber += 1) {
    if (activeCount === 0) {
      schedule.push({
        roundNumber,
        playingPlayerIds: [],
        benchedPlayerIds: playerIds,
        fourPlayerGroupKey: "none",
        coAppearanceTotal: 0,
        targetMin,
        targetMax,
        matchCountsBefore: { ...counts },
        matchCountsAfter: { ...counts },
        consecutiveBenchBefore: { ...consecutiveBench },
        reason: "not enough eligible players for scheduled participation"
      });
      continue;
    }

    const matchCountsBefore = { ...counts };
    const consecutiveBenchBefore = { ...consecutiveBench };
    const remainingRoundsAfter = totalRounds - roundNumber;
    const allCandidates = combinations(schedulePlayers, activeCount).filter((group) => groupCanCreateDoublesFormatMatch(group, doublesFormat));
    const feasibleCandidates = allCandidates.filter((group) => {
      const selectedIds = new Set(group.map((player) => player.id));

      return schedulePlayers.every((player) => {
        const nextCount = (counts[player.id] ?? 0) + (selectedIds.has(player.id) ? 1 : 0);
        return nextCount <= targetMax && nextCount + remainingRoundsAfter >= targetMin;
      });
    });
    const candidatePool = feasibleCandidates.length > 0 ? feasibleCandidates : allCandidates;
    const recentGroupKeys = schedule.slice(-2).map((entry) => entry.fourPlayerGroupKey);
    const minCount = schedulePlayers.length ? Math.min(...schedulePlayers.map((player) => counts[player.id] ?? 0)) : 0;
    const rankedCandidates = candidatePool
      .map((group) => {
        const selectedIds = new Set(group.map((player) => player.id));
        const benchedPlayers = schedulePlayers.filter((player) => !selectedIds.has(player.id));
        const groupKey = fourPlayerGroupKey(group);
        const coAppearance = coAppearancePairKeys(group).reduce((sum, key) => sum + (coAppearanceCounts[key] ?? 0), 0);
        const belowTargetMinReward = group.reduce((sum, player) => sum + ((counts[player.id] ?? 0) < targetMin ? -1000 : 0), 0);
        const targetMaxPenalty = group.reduce((sum, player) => sum + ((counts[player.id] ?? 0) >= targetMax ? 10000 : 0), 0);
        const consecutiveBenchPenalty = benchedPlayers.reduce((sum, player) => sum + (consecutiveBench[player.id] ?? 0) * 500, 0);
        const lowCountBenchedPenalty = benchedPlayers.reduce((sum, player) => sum + ((counts[player.id] ?? 0) === minCount ? 500 : 0), 0);
        const projectedCounts = Object.fromEntries(playerIds.map((id) => [id, (counts[id] ?? 0) + (selectedIds.has(id) ? 1 : 0)]));
        const projectedGap = matchCountGap(schedulePlayers, projectedCounts);
        const groupRepeatPenalty = (groupUseCounts[groupKey] ?? 0) * 20000 + (recentGroupKeys.includes(groupKey) ? 20000 : 0);
        const score =
          projectedGap * 5000 +
          targetMaxPenalty +
          belowTargetMinReward +
          consecutiveBenchPenalty +
          lowCountBenchedPenalty +
          groupRepeatPenalty +
          coAppearance * 100;

        return {
          group,
          groupKey,
          coAppearance,
          score,
          reason: `${sessionFormat}/${matchmakingMode}: target=${targetMin}-${targetMax}, projectedGap=${projectedGap}, groupUses=${groupUseCounts[groupKey] ?? 0}, recent=${recentGroupKeys.includes(groupKey)}, coAppearance=${coAppearance}, benchPenalty=${consecutiveBenchPenalty}, lowCountBenchPenalty=${lowCountBenchedPenalty}`
        };
      })
      .sort((a, b) => a.score - b.score || a.groupKey.localeCompare(b.groupKey));
    const selected = rankedCandidates[0];
    const playingPlayerIds = selected?.group.map((player) => player.id) ?? [];
    const playingIdSet = new Set(playingPlayerIds);
    const benchedPlayerIds = playerIds.filter((id) => !playingIdSet.has(id));
    const matchCountsAfter = { ...counts };

    playingPlayerIds.forEach((id) => {
      matchCountsAfter[id] = (matchCountsAfter[id] ?? 0) + 1;
    });

    const entry: ParticipationScheduleEntry = {
      roundNumber,
      playingPlayerIds,
      benchedPlayerIds,
      fourPlayerGroupKey: selected?.groupKey ?? "none",
      coAppearanceTotal: selected?.coAppearance ?? 0,
      targetMin,
      targetMax,
      matchCountsBefore,
      matchCountsAfter,
      consecutiveBenchBefore,
      reason: selected?.reason ?? "no valid participation candidate"
    };

    schedule.push(entry);
    applyScheduledRound(entry);
  }

  return schedule;
}

function matchResultKey(round: number, court: number) {
  return `${round}-${court}`;
}

function removeOne(items: string[], value: string) {
  const index = items.indexOf(value);
  return index === -1 ? items : items.filter((_, itemIndex) => itemIndex !== index);
}

function removeRoundResults(results: Record<string, SavedMatchResult>, round: number) {
  return Object.fromEntries(
    Object.entries(results).filter(([key]) => !key.startsWith(`${round}-`))
  );
}

function playerStatusLabel(status: PlayerSessionStatus) {
  return {
    active: "Active",
    not_arrived: "Not arrived",
    temporarily_unavailable: "Temporarily unavailable",
    left: "Left"
  }[status];
}

function matchStatusLabel(result?: SavedMatchResult) {
  if (!result) return "Not Started";
  const status = getMatchResultStatus(result);
  if (status === "saved" || status === "completed") return "Completed";
  if (status === "skipped_not_started") return "Skipped - players not ready";
  if (status === "deferred") return "Play Later";
  if (status === "cancelled") return "Cancelled";
  return "Skipped";
}

function getMatchResultStatus(result?: SavedMatchResult) {
  return result?.status ?? (result?.skipped ? "skipped_result" : result ? "saved" : undefined);
}

function isResolvedResult(result?: SavedMatchResult) {
  const status = getMatchResultStatus(result);

  return Boolean(status && RESOLVED_MATCH_STATUSES.includes(status));
}

function isPlayedResult(result?: SavedMatchResult) {
  const status = getMatchResultStatus(result);

  return Boolean(
    (status === "saved" || status === "completed") &&
      Number.isFinite(result?.scoreA) &&
      Number.isFinite(result?.scoreB)
  );
}

function matchScoreLabel(result?: SavedMatchResult) {
  const status = getMatchResultStatus(result);

  if (isPlayedResult(result)) return `${result?.scoreA}-${result?.scoreB}`;
  if (status === "cancelled") return "Cancelled";
  if (status === "deferred") return "Not played";
  if (status === "skipped_result") return "Skipped";
  if (status === "skipped_not_started") return "Not played";
  return "N/A";
}

function teamTierPattern(team: Player[]) {
  return team.map((player) => player.tier).sort().join("");
}

function isSameTierTeam(team: Player[]) {
  return team.length === 2 && team[0].tier === team[1].tier;
}

function isSameTierMatch(teamA: Player[], teamB: Player[]) {
  return isSameTierTeam(teamA) && isSameTierTeam(teamB) && teamTierPattern(teamA) === teamTierPattern(teamB);
}

function isBalancedMixedMatch(teamA: Player[], teamB: Player[]) {
  return !isSameTierTeam(teamA) && !isSameTierTeam(teamB) && teamTierPattern(teamA) === teamTierPattern(teamB);
}

function genderOf(player: Player): GenderCategory {
  return coerceGenderCategory(player.genderCategory);
}

function teamGenderPattern(team: Player[]) {
  const maleCount = team.filter((player) => genderOf(player) === "male").length;
  const femaleCount = team.filter((player) => genderOf(player) === "female").length;

  if (team.length === 2 && maleCount === 2) return "mens";
  if (team.length === 2 && femaleCount === 2) return "womens";
  if (team.length === 2 && maleCount === 1 && femaleCount === 1) return "mixed";
  return "open";
}

function isTeamAllowedForDoublesFormat(team: Player[], format: DoublesFormat) {
  if (format === "open") return true;

  return teamGenderPattern(team) === format;
}

function groupCanCreateDoublesFormatMatch(group: Player[], format: DoublesFormat) {
  if (format === "open") return true;
  if (group.length !== 4) return false;

  const teamOptions = [
    { teamA: [group[0], group[1]], teamB: [group[2], group[3]] },
    { teamA: [group[0], group[2]], teamB: [group[1], group[3]] },
    { teamA: [group[0], group[3]], teamB: [group[1], group[2]] }
  ];

  return teamOptions.some(
    (option) =>
      isTeamAllowedForDoublesFormat(option.teamA, format) &&
      isTeamAllowedForDoublesFormat(option.teamB, format)
  );
}

function doublesFormatPenalty(teamA: Player[], teamB: Player[], config?: MatchmakingConfig) {
  const format = config?.doublesFormat ?? "open";
  const patternA = teamGenderPattern(teamA);
  const patternB = teamGenderPattern(teamB);

  if (format !== "open") {
    return isTeamAllowedForDoublesFormat(teamA, format) && isTeamAllowedForDoublesFormat(teamB, format)
      ? 0
      : Number.POSITIVE_INFINITY;
  }

  if (config?.avoidFormatMismatch && patternA !== "open" && patternB !== "open" && patternA !== patternB) {
    return 20000;
  }

  return 0;
}

function eligiblePlayersForDoublesFormat(players: Player[], format: DoublesFormat) {
  if (format === "mens") return players.filter((player) => genderOf(player) === "male");
  if (format === "womens") return players.filter((player) => genderOf(player) === "female");
  if (format === "mixed") {
    const malePlayers = players.filter((player) => genderOf(player) === "male");
    const femalePlayers = players.filter((player) => genderOf(player) === "female");

    return [...malePlayers.slice(0, femalePlayers.length), ...femalePlayers.slice(0, malePlayers.length)];
  }

  return players;
}

function canSupportDoublesFormat(players: Player[], courtCount: number, format: DoublesFormat) {
  const maleCount = players.filter((player) => genderOf(player) === "male").length;
  const femaleCount = players.filter((player) => genderOf(player) === "female").length;

  if (format === "mens") return maleCount >= courtCount * 4;
  if (format === "womens") return femaleCount >= courtCount * 4;
  if (format === "mixed") return maleCount >= courtCount * 2 && femaleCount >= courtCount * 2;
  return players.length >= courtCount * 4;
}

function doublesFormatLabel(format: DoublesFormat) {
  return {
    open: "Open Doubles",
    mens: "Men's Doubles",
    womens: "Women's Doubles",
    mixed: "Mixed Doubles"
  }[format];
}

function hasDoublesFormatMismatch(match: Match) {
  const patternA = teamGenderPattern(match.teamA);
  const patternB = teamGenderPattern(match.teamB);

  return patternA !== "open" && patternB !== "open" && patternA !== patternB;
}

function wantsSameTierRound(config?: MatchmakingConfig) {
  if (!config || config.mode === "smart") {
    return null;
  }

  const sameTierPercentage = Math.max(0, Math.min(config.sameTierPercentage, 100));
  return ((config.roundNumber - 1) * 37) % 100 < sameTierPercentage;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...combinations(rest, size - 1).map((combo) => [first, ...combo]),
    ...combinations(rest, size)
  ];
}

function scoreTeams(teamA: Player[], teamB: Player[], stats: Record<number, SessionStat>, history: SessionHistory, config?: MatchmakingConfig) {
  const formatPenalty = doublesFormatPenalty(teamA, teamB, config);

  if (!Number.isFinite(formatPenalty)) {
    return Number.POSITIVE_INFINITY;
  }

  const ratingA = teamA.reduce((sum, player) => sum + player.rating, 0);
  const ratingB = teamB.reduce((sum, player) => sum + player.rating, 0);
  const tierA = teamA.reduce((sum, player) => sum + tierValues[player.tier], 0);
  const tierB = teamB.reduce((sum, player) => sum + tierValues[player.tier], 0);
  const teamATiers = teamTierPattern(teamA);
  const teamBTiers = teamTierPattern(teamB);
  const stackedMismatchPairs = new Set(["AA-BB", "BB-AA", "AA-CC", "CC-AA", "AA-DD", "DD-AA", "BB-DD", "DD-BB"]);
  const repeatedPartnerPenalty =
    history.partners.filter((key) => key === pairKey(teamA)).length * 100 +
    history.partners.filter((key) => key === pairKey(teamB)).length * 100;
  const repeatedOpponentPenalty =
    history.opponentGroups.filter((key) => key === opponentGroupKey(teamA, teamB) || key === opponentGroupKey(teamB, teamA)).length * 150;
  const matchCountPenalty = [...teamA, ...teamB].reduce((sum, player) => sum + getPlayerStat(stats, player.id).matches * 2, 0);
  const allPlayers = [...teamA, ...teamB];
  const deferredPlayerIdSet = new Set(config?.deferredPlayerIds ?? []);
  const deferredGroupKeySet = new Set(config?.deferredGroupKeys ?? []);
  const deferredOpponentKeySet = new Set(config?.deferredOpponentKeys ?? []);
  const deferredMatchBlocks = config?.deferredMatchBlocks ?? [];
  const sessionGeneratedHistory = config?.sessionMatchHistory;
  const candidateExactMatchKey = exactMatchKey(teamA, teamB);
  const candidateFourPlayerGroupKey = fourPlayerGroupKey(allPlayers);
  const candidatePartnerPairKeys = partnerPairKeysForMatch(teamA, teamB);
  const exactDeferredMatchBlocked = deferredMatchBlocks.some((block) => isExactDeferredBlockMatch(teamA, teamB, block));
  const sameDeferredFourPlayerGroupBlocked = deferredMatchBlocks.some((block) => idPairKey(block.allPlayerIds) === candidateFourPlayerGroupKey);

  if (exactDeferredMatchBlocked) {
    return Number.POSITIVE_INFINITY;
  }

  const exactSessionMatchRepeatPenalty =
    (sessionGeneratedHistory?.exactMatchKeys.filter((key) => key === candidateExactMatchKey).length ?? 0) * 10000;
  const sessionFourPlayerGroupPenalty =
    (sessionGeneratedHistory?.fourPlayerGroupKeys.filter((key) => key === candidateFourPlayerGroupKey).length ?? 0) * 3000;
  const sessionPartnerRepeatPenalty = candidatePartnerPairKeys.reduce(
    (sum, key) => sum + (sessionGeneratedHistory?.partnerPairKeys.filter((partnerKey) => partnerKey === key).length ?? 0) * 1000,
    0
  );
  const sessionOpponentRepeatPenalty =
    (sessionGeneratedHistory?.opponentGroupKeys.filter((key) => key === candidateExactMatchKey).length ?? 0) * 1500;
  const deferredPlayerPenalty = allPlayers.reduce((sum, player) => sum + (deferredPlayerIdSet.has(player.id) ? 500 : 0), 0);
  const deferredGroupPenalty = deferredGroupKeySet.has(pairKey(allPlayers)) ? 1000 : 0;
  const deferredBlockGroupPenalty = sameDeferredFourPlayerGroupBlocked ? 50000 : 0;
  const deferredReplayPenalty =
    deferredOpponentKeySet.has(opponentGroupKey(teamA, teamB)) || deferredOpponentKeySet.has(opponentGroupKey(teamB, teamA)) ? 2000 : 0;
  const tierGap = Math.abs(tierA - tierB);
  const extremeTierGapPenalty = tierGap >= 3 ? 5000 : 0;
  const sameTierMismatchPenalty = isSameTierTeam(teamA) && isSameTierTeam(teamB) && teamATiers !== teamBTiers ? 12000 : 0;
  const stackedMismatchPenalty = stackedMismatchPairs.has(`${teamATiers}-${teamBTiers}`) ? 16000 : 0;
  const wantsSameTier = wantsSameTierRound(config);
  // Tier modes add only this match-type preference. Bench fairness, repeated partner
  // avoidance, repeated opponent avoidance, rating balance, and mismatch penalties
  // remain part of the same total score for every generated match.
  const modePreferencePenalty =
    wantsSameTier === true
      ? isSameTierMatch(teamA, teamB)
        ? 0
        : isBalancedMixedMatch(teamA, teamB)
          ? 450
          : 1400
      : wantsSameTier === false
        ? isBalancedMixedMatch(teamA, teamB)
          ? 0
          : isSameTierMatch(teamA, teamB)
            ? 450
            : 1400
        : 0;

  return (
    repeatedPartnerPenalty +
    repeatedOpponentPenalty +
    Math.abs(ratingA - ratingB) * 5 +
    tierGap * 20 +
    matchCountPenalty +
    exactSessionMatchRepeatPenalty +
    sessionFourPlayerGroupPenalty +
    sessionPartnerRepeatPenalty +
    sessionOpponentRepeatPenalty +
    deferredPlayerPenalty +
    deferredGroupPenalty +
    deferredBlockGroupPenalty +
    deferredReplayPenalty +
    extremeTierGapPenalty +
    sameTierMismatchPenalty +
    stackedMismatchPenalty +
    modePreferencePenalty +
    formatPenalty
  );
}

function bestMatchForGroup(group: Player[], court: number, stats: Record<number, SessionStat>, history: SessionHistory, config?: MatchmakingConfig): Match & { penalty: number } {
  const teamOptions = [
    { teamA: [group[0], group[1]], teamB: [group[2], group[3]] },
    { teamA: [group[0], group[2]], teamB: [group[1], group[3]] },
    { teamA: [group[0], group[3]], teamB: [group[1], group[2]] }
  ];
  const ranked = teamOptions
    .map((option) => ({
      ...option,
      penalty: scoreTeams(option.teamA, option.teamB, stats, history, config)
    }))
    .sort((a, b) => a.penalty - b.penalty);
  const nonRematchOptions = ranked.filter(
    (option) => !config?.sessionMatchHistory?.exactMatchKeys.includes(exactMatchKey(option.teamA, option.teamB))
  );
  const selected = nonRematchOptions.length > 0 ? nonRematchOptions[0] : ranked[0];

  if (!selected || !Number.isFinite(selected.penalty)) {
    return {
      court,
      teamA: [],
      teamB: [],
      scoreA: "",
      scoreB: "",
      penalty: Number.POSITIVE_INFINITY
    };
  }

  return {
    court,
    teamA: selected.teamA,
    teamB: selected.teamB,
    scoreA: "",
    scoreB: "",
    penalty: selected.penalty
  };
}

function deferredCandidateDebug(players: Player[], blocks: DeferredMatchBlock[]) {
  const rejected = new Set<string>();
  const penalized = new Set<string>();

  combinations(players, 4).forEach((group) => {
    const groupKey = pairKey(group);

    blocks.forEach((block) => {
      if (idPairKey(block.allPlayerIds) !== groupKey) {
        return;
      }

      const teamOptions = [
        { teamA: [group[0], group[1]], teamB: [group[2], group[3]] },
        { teamA: [group[0], group[2]], teamB: [group[1], group[3]] },
        { teamA: [group[0], group[3]], teamB: [group[1], group[2]] }
      ];

      teamOptions.forEach((option) => {
        if (isExactDeferredBlockMatch(option.teamA, option.teamB, block)) {
          rejected.add(block.id);
        } else {
          penalized.add(block.id);
        }
      });
    });
  });

  return {
    rejected: Array.from(rejected),
    penalized: Array.from(penalized)
  };
}

function sessionDuplicateCandidateDebug(players: Player[], history?: SessionMatchHistory) {
  const exactDuplicates = new Set<string>();
  const sameGroups = new Set<string>();
  const partnerRepeats = new Set<string>();
  const opponentRepeats = new Set<string>();

  if (!history) {
    return {
      exactDuplicates: [],
      sameGroups: [],
      partnerRepeats: [],
      opponentRepeats: []
    };
  }

  combinations(players, 4).forEach((group) => {
    const groupKey = fourPlayerGroupKey(group);

    if (history.fourPlayerGroupKeys.includes(groupKey)) {
      sameGroups.add(groupKey);
    }

    [
      { teamA: [group[0], group[1]], teamB: [group[2], group[3]] },
      { teamA: [group[0], group[2]], teamB: [group[1], group[3]] },
      { teamA: [group[0], group[3]], teamB: [group[1], group[2]] }
    ].forEach(({ teamA, teamB }) => {
      const candidateExactKey = exactMatchKey(teamA, teamB);

      if (history.exactMatchKeys.includes(candidateExactKey)) {
        exactDuplicates.add(candidateExactKey);
      }

      if (history.opponentGroupKeys.includes(candidateExactKey)) {
        opponentRepeats.add(candidateExactKey);
      }

      partnerPairKeysForMatch(teamA, teamB).forEach((partnerKey) => {
        if (history.partnerPairKeys.includes(partnerKey)) {
          partnerRepeats.add(partnerKey);
        }
      });
    });
  });

  return {
    exactDuplicates: Array.from(exactDuplicates),
    sameGroups: Array.from(sameGroups),
    partnerRepeats: Array.from(partnerRepeats),
    opponentRepeats: Array.from(opponentRepeats)
  };
}

function matchPenaltyDebug(match: Match, history?: SessionMatchHistory) {
  const exactKey = exactMatchKey(match.teamA, match.teamB);
  const groupKey = fourPlayerGroupKey([...match.teamA, ...match.teamB]);
  const partnerKeys = partnerPairKeysForMatch(match.teamA, match.teamB);
  const exactRepeats = history?.exactMatchKeys.filter((key) => key === exactKey).length ?? 0;
  const groupRepeats = history?.fourPlayerGroupKeys.filter((key) => key === groupKey).length ?? 0;
  const partnerRepeats = partnerKeys.reduce(
    (sum, key) => sum + (history?.partnerPairKeys.filter((partnerKey) => partnerKey === key).length ?? 0),
    0
  );
  const opponentRepeats = history?.opponentGroupKeys.filter((key) => key === exactKey).length ?? 0;

  return {
    exactKey,
    groupKey,
    isRematch: exactRepeats > 0,
    rematchPenalty: exactRepeats * 10000,
    sameGroupPenalty: groupRepeats * 3000,
    partnerPenalty: partnerRepeats * 1000,
    opponentPenalty: opponentRepeats * 1500
  };
}

function hasExtremeTierMismatch(match: Match) {
  const tierA = match.teamA.reduce((sum, player) => sum + tierValues[player.tier], 0);
  const tierB = match.teamB.reduce((sum, player) => sum + tierValues[player.tier], 0);

  return Math.abs(tierA - tierB) >= 3;
}

function generateFairRound(selectedPlayers: Player[], courtCount: number, stats: Record<number, SessionStat>, history: SessionHistory, config?: MatchmakingConfig): Match[] {
  const format = config?.doublesFormat ?? "open";
  const formatEligiblePlayers = eligiblePlayersForDoublesFormat(selectedPlayers, format);
  const activeCount = Math.min(courtCount * 4, Math.floor(formatEligiblePlayers.length / 4) * 4);
  // The caller passes only players still active in the session. Sorting by matches
  // played first keeps bench rotation fair before tier/team penalties are applied.
  const deferredPlayerIdSet = new Set(config?.deferredPlayerIds ?? []);
  const sortedPlayers = [...formatEligiblePlayers]
    .sort(
      (a, b) =>
        (config?.benchFairness?.matchesPlayed[a.id] ?? getPlayerStat(stats, a.id).matches) -
          (config?.benchFairness?.matchesPlayed[b.id] ?? getPlayerStat(stats, b.id).matches) ||
        (config?.benchFairness?.consecutiveBenchCounts[b.id] ?? 0) - (config?.benchFairness?.consecutiveBenchCounts[a.id] ?? 0) ||
        (config?.benchFairness?.lastPlayedRound[a.id] ?? 0) - (config?.benchFairness?.lastPlayedRound[b.id] ?? 0) ||
        a.id - b.id
    );
  const nonDeferredPlayers = sortedPlayers.filter((player) => !deferredPlayerIdSet.has(player.id));
  const activePlayers = nonDeferredPlayers.length >= activeCount ? nonDeferredPlayers : sortedPlayers;
  const playingPool = selectPlayingPool(
    activePlayers,
    activeCount,
    stats,
    config?.benchFairness,
    config?.sessionMatchHistory,
    format
  );
  const matches: Match[] = [];
  let remaining = playingPool;

  for (let court = 1; court <= courtCount && remaining.length >= 4; court += 1) {
    const best = combinations(remaining, 4)
      .map((group) => bestMatchForGroup(group, court, stats, history, config))
      .sort((a, b) => a.penalty - b.penalty)[0];
    if (!best || !Number.isFinite(best.penalty) || best.teamA.length !== 2 || best.teamB.length !== 2) {
      break;
    }
    matches.push({
      court: best.court,
      teamA: best.teamA,
      teamB: best.teamB,
      scoreA: "",
      scoreB: ""
    });
    const usedIds = new Set([...best.teamA, ...best.teamB].map((player) => player.id));
    remaining = remaining.filter((player) => !usedIds.has(player.id));
  }

  return matches;
}

const navItems: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "players", label: "Players", icon: Users },
  { id: "new", label: "New", icon: ListPlus },
  { id: "active", label: "Active", icon: Activity },
  { id: "leaderboard", label: "Board", icon: Trophy }
];

export default function ClubApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [clubPlayers, setClubPlayers] = useState<Player[]>(demoPlayers);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>(defaultSelectedIds);
  const [courtCount, setCourtCount] = useState(1);
  const [sessionFormat] = useState<SessionFormat>("Smart Rotation");
  const [matchmakingMode, setMatchmakingMode] = useState<MatchmakingMode>("smart");
  const [doublesFormat, setDoublesFormat] = useState<DoublesFormat>("open");
  const [avoidFormatMismatch, setAvoidFormatMismatch] = useState(true);
  const [sameTierPercentage, setSameTierPercentage] = useState(80);
  const [mixedTierPercentage, setMixedTierPercentage] = useState(20);
  const [roundLimitMode, setRoundLimitMode] = useState<RoundLimitMode>("manual");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(180);
  const [estimatedRoundMinutes, setEstimatedRoundMinutes] = useState(15);
  const [manualRoundCount, setManualRoundCount] = useState(8);
  const [totalRounds, setTotalRounds] = useState(8);
  const [addedRoundCount, setAddedRoundCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roundMatches, setRoundMatches] = useState<Record<number, Match[]>>({});
  const [sessionStats, setSessionStats] = useState<Record<number, SessionStat>>({});
  const [sessionHistory, setSessionHistory] = useState<SessionHistory>({ partners: [], opponentGroups: [] });
  const [savedResults, setSavedResults] = useState<Record<string, SavedMatchResult>>({});
  const [sessionPlayerStatuses, setSessionPlayerStatuses] = useState<Record<number, PlayerSessionStatus>>({});
  const [lastCompletedSession, setLastCompletedSession] = useState<CompletedSessionSummary | null>(null);
  const [completedSessionStored, setCompletedSessionStored] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [replayRoundNumber, setReplayRoundNumber] = useState<number | null>(null);
  const [activeReplay, setActiveReplay] = useState<ActiveReplay | null>(null);
  const [generationDebug, setGenerationDebug] = useState<GenerationDebug | null>(null);
  const [generationHistoryDebug, setGenerationHistoryDebug] = useState<GenerationHistoryDebugEntry[]>([]);
  const [participationSchedule, setParticipationSchedule] = useState<ParticipationScheduleEntry[]>([]);
  const [scheduleRegenerationNote, setScheduleRegenerationNote] = useState("No schedule generated yet.");
  const [lastDeferredPlayerIdsForNextRound, setLastDeferredPlayerIdsForNextRound] = useState<number[]>([]);
  const [deferredMatchBlocks, setDeferredMatchBlocks] = useState<DeferredMatchBlock[]>([]);

  const selectedPlayers = useMemo(
    () => clubPlayers.filter((player) => selectedIds.includes(player.id)),
    [clubPlayers, selectedIds]
  );
  const sessionPlayers = useMemo(
    () => selectedPlayers.filter((player) => (sessionPlayerStatuses[player.id] ?? "active") === "active"),
    [sessionPlayerStatuses, selectedPlayers]
  );
  const leftPlayerIds = useMemo(
    () => selectedPlayers.filter((player) => (sessionPlayerStatuses[player.id] ?? "active") === "left").map((player) => player.id),
    [selectedPlayers, sessionPlayerStatuses]
  );

  const maxCourtCount = Math.floor(selectedPlayers.length / 4);
  const canGenerateRound = sessionPlayers.length >= 4;
  const baseRoundLimit = Math.max(
    roundLimitMode === "duration"
      ? Math.floor(sessionDurationMinutes / estimatedRoundMinutes)
      : manualRoundCount,
    roundLimitMode === "duration" ? 0 : 1
  );
  const deferredContextForRound = (previousRound: number) => {
    const deferredMatches = (roundMatches[previousRound] ?? []).filter(
      (match) => savedResults[matchResultKey(previousRound, match.court)]?.status === "deferred"
    );
    const deferredPlayers = deferredMatches.flatMap((match) => [...match.teamA, ...match.teamB]);
    const uniqueDeferredPlayers = Array.from(new Map(deferredPlayers.map((player) => [player.id, player])).values());

    return {
      matches: deferredMatches,
      playerIds: uniqueDeferredPlayers.map((player) => player.id),
      playerNames: uniqueDeferredPlayers.map((player) => player.name),
      groupKeys: deferredMatches.map((match) => pairKey([...match.teamA, ...match.teamB])),
      opponentKeys: deferredMatches.map((match) => opponentGroupKey(match.teamA, match.teamB))
    };
  };
  const matchmakingConfig = (nextRound = roundNumber, deferredPlayerIds = lastDeferredPlayerIdsForNextRound): MatchmakingConfig => {
    const deferredContext = deferredContextForRound(nextRound - 1);
    const combinedDeferredPlayerIds = Array.from(new Set([...deferredContext.playerIds, ...deferredPlayerIds]));
    const sessionGeneratedHistory = sessionMatchHistoryFromRounds(roundMatches, nextRound);
    const availablePlayersForBenchFairness = selectedPlayers.filter((player) => (sessionPlayerStatuses[player.id] ?? "active") === "active");
    const recalculatedForGeneration = getSessionStatsFromMatches({ players: availablePlayersForBenchFairness, roundMatches, savedResults });
    const benchFairness = {
      ...benchFairnessFromRounds(roundMatches, nextRound, availablePlayersForBenchFairness),
      matchesPlayed: recalculatedForGeneration.playerMatchCounts
    };

    return {
      mode: matchmakingMode,
      sameTierPercentage,
      mixedTierPercentage,
      roundNumber: nextRound,
      totalRounds,
      courtCount,
      doublesFormat,
      avoidFormatMismatch,
      deferredPlayerIds: combinedDeferredPlayerIds,
      deferredGroupKeys: deferredContext.groupKeys,
      deferredOpponentKeys: deferredContext.opponentKeys,
      deferredMatchBlocks,
      sessionMatchHistory: sessionGeneratedHistory,
      benchFairness
    };
  };
  const getAvailableSessionPlayers = (statuses = sessionPlayerStatuses) =>
    selectedPlayers.filter((player) => (statuses[player.id] ?? "active") === "active");
  const generationPlayerPool = (activePlayers: Player[], deferredPlayerIds = lastDeferredPlayerIdsForNextRound) => {
    const requiredPlayers = courtCount * 4;
    const deferredPlayerIdSet = new Set(deferredPlayerIds);
    const nonDeferredActivePlayers = activePlayers.filter((player) => !deferredPlayerIdSet.has(player.id));
    const hardExclusionApplied = deferredPlayerIds.length > 0 && nonDeferredActivePlayers.length >= requiredPlayers;

    return {
      requiredPlayers,
      nonDeferredActivePlayers,
      hardExclusionApplied,
      playersForGeneration: hardExclusionApplied ? nonDeferredActivePlayers : activePlayers
    };
  };
  const playerById = (id: number) => selectedPlayers.find((player) => player.id === id);
  const scheduledPlayersForRound = (targetRound: number, activePlayers: Player[]) => {
    const scheduleEntry = participationSchedule.find((entry) => entry.roundNumber === targetRound);
    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const scheduledPlayers = scheduleEntry?.playingPlayerIds
      .map((id) => playerById(id))
      .filter((player): player is Player => Boolean(player && activePlayerIds.has(player.id))) ?? [];

    return scheduledPlayers.length >= 4 ? scheduledPlayers : activePlayers;
  };
  const buildParticipationSchedule = (
    schedulePlayers: Player[],
    scheduleTotalRounds: number,
    lockedSchedule: ParticipationScheduleEntry[] = []
  ) =>
    generateParticipationSchedule({
      players: schedulePlayers,
      totalRounds: scheduleTotalRounds,
      courtCount,
      sessionFormat,
      doublesFormat,
      matchmakingMode,
      lockedSchedule
    });
  const regenerateFutureParticipationSchedule = (
    nextStatuses: Record<number, PlayerSessionStatus>,
    fromRound: number,
    note: string,
    nextTotalRounds = totalRounds
  ) => {
    const availablePlayers = selectedPlayers.filter((player) => (nextStatuses[player.id] ?? "active") === "active");
    const lockedSchedule = participationSchedule.filter((entry) => entry.roundNumber < fromRound);
    const nextSchedule = buildParticipationSchedule(availablePlayers, nextTotalRounds, lockedSchedule);

    setParticipationSchedule(nextSchedule);
    setScheduleRegenerationNote(note);
  };
  const setGeneratedRoundDebug = (
    requestedRound: number,
    activePlayers: Player[],
    playersForGeneration: Player[],
    nextMatches: Match[],
    hardExclusionApplied: boolean,
    deferredPlayerIds = lastDeferredPlayerIdsForNextRound,
    requiredPlayers = courtCount * 4
  ) => {
    const deferredContext = deferredContextForRound(requestedRound - 1);
    const combinedDeferredPlayerIds = Array.from(new Set([...deferredContext.playerIds, ...deferredPlayerIds]));
    const deferredPlayerIdSet = new Set(combinedDeferredPlayerIds);
    const nonDeferredActivePlayers = activePlayers.filter((player) => !deferredPlayerIdSet.has(player.id));
    const deferredCandidateInfo = deferredCandidateDebug(playersForGeneration, deferredMatchBlocks);
    const sessionGeneratedHistory = sessionMatchHistoryFromRounds(roundMatches, requestedRound);
    const recalculatedForGeneration = getSessionStatsFromMatches({ players: activePlayers, roundMatches, savedResults });
    const benchFairness = {
      ...benchFairnessFromRounds(roundMatches, requestedRound, activePlayers),
      matchesPlayed: recalculatedForGeneration.playerMatchCounts
    };
    const sessionDuplicateInfo = sessionDuplicateCandidateDebug(playersForGeneration, sessionGeneratedHistory);
    const selectedPlayingIds = new Set(nextMatches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.id));
    const benchedThisRound = activePlayers.filter((player) => !selectedPlayingIds.has(player.id));
    const selectedThisRound = activePlayers.filter((player) => selectedPlayingIds.has(player.id));
    const selectedGroupKey = selectedThisRound.length > 0 ? fourPlayerGroupKey(selectedThisRound) : "none";
    const selectedGroupVariety = selectedThisRound.length > 0
      ? groupVarietyScore(selectedThisRound, sessionGeneratedHistory)
      : {
          groupKey: "none",
          groupUseCount: 0,
          usedRecently: false,
          coAppearance: 0,
          repeatedPartnerPairs: 0,
          repeatedOpponentGroups: 0,
          penalty: 0
        };
    const afterMatchCounts = { ...benchFairness.matchesPlayed };
    selectedPlayingIds.forEach((id) => {
      afterMatchCounts[id] = (afterMatchCounts[id] ?? 0) + 1;
    });
    const quota = quotaInfo(totalRounds, courtCount, requestedRound, activePlayers.length);
    const lowestMatchCount = activePlayers.length
      ? Math.min(...activePlayers.map((activePlayer) => benchFairness.matchesPlayed[activePlayer.id] ?? 0))
      : 0;
    const reasonForPlayer = (player: Player, selected: boolean) => {
      const consecutiveBenchCount = benchFairness.consecutiveBenchCounts[player.id] ?? 0;
      const matchesPlayed = benchFairness.matchesPlayed[player.id] ?? getPlayerStat(sessionStats, player.id).matches;
      const wasBenchedLastRound = benchFairness.benchedLastRoundIds.includes(player.id);
      const matchCountReason =
        matchesPlayed === lowestMatchCount
          ? "lowest match count"
          : `ahead by ${matchesPlayed - lowestMatchCount}`;

      return `${player.name}: ${selected ? "selected" : "benched"}, matches=${matchesPlayed}, ${matchCountReason}, consecutiveBench=${consecutiveBenchCount}, benchedLastRound=${wasBenchedLastRound}`;
    };

    const nextDebug: GenerationDebug = {
      requestedRound,
      previousRound: requestedRound - 1,
      availablePlayers: playersForGeneration.map((player) => player.name),
      activePlayersBeforeGeneration: activePlayers.map((player) => player.name),
      nonDeferredActivePlayersBeforeGeneration: nonDeferredActivePlayers.map((player) => player.name),
      requiredPlayers,
      hardExclusionApplied,
      lastDeferredPlayerIdsForNextRound: deferredPlayerIds,
      deferredPlayerIds: combinedDeferredPlayerIds,
      deferredPlayerNames: activePlayers.filter((player) => deferredPlayerIdSet.has(player.id)).map((player) => player.name),
      deprioritizedPlayers: activePlayers.filter((player) => deferredPlayerIdSet.has(player.id)).map((player) => player.name),
      generatedPlayers: nextMatches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.name),
      deferredGroupKeys: deferredContext.groupKeys,
      deferredOpponentKeys: deferredContext.opponentKeys,
      deferredMatchBlocks: deferredMatchBlocks.map((block) => `${block.id}:${idPairKey(block.allPlayerIds)}:${opponentIdGroupKey(block.teamAIds, block.teamBIds)}`),
      candidateRejectedBecauseExactDeferredMatch: deferredCandidateInfo.rejected,
      candidatePenalizedBecauseSameFourPlayerGroup: deferredCandidateInfo.penalized,
      generatedMatchKeys: nextMatches.map((match) => exactMatchKey(match.teamA, match.teamB)),
      generatedFourPlayerGroupKeys: nextMatches.map((match) => fourPlayerGroupKey([...match.teamA, ...match.teamB])),
      exactDuplicateCandidatesRejected: sessionDuplicateInfo.exactDuplicates,
      sameFourPlayerGroupCandidatesPenalized: sessionDuplicateInfo.sameGroups,
      rematchPenaltyDebug: nextMatches.map((match) => {
        const penalties = matchPenaltyDebug(match, sessionGeneratedHistory);
        return `${penalties.exactKey}:${penalties.rematchPenalty}`;
      }),
      partnerRepeatPenaltyDebug: [
        ...sessionDuplicateInfo.partnerRepeats,
        ...nextMatches.map((match) => {
          const penalties = matchPenaltyDebug(match, sessionGeneratedHistory);
          return `${exactMatchKey(match.teamA, match.teamB)}:${penalties.partnerPenalty}`;
        })
      ],
      opponentRepeatPenaltyDebug: [
        ...sessionDuplicateInfo.opponentRepeats,
        ...nextMatches.map((match) => {
          const penalties = matchPenaltyDebug(match, sessionGeneratedHistory);
          return `${exactMatchKey(match.teamA, match.teamB)}:${penalties.opponentPenalty}`;
        })
      ],
      playedLastRound: activePlayers
        .filter((player) => benchFairness.playedLastRoundIds.includes(player.id))
        .map((player) => player.name),
      benchedLastRound: activePlayers
        .filter((player) => benchFairness.benchedLastRoundIds.includes(player.id))
        .map((player) => player.name),
      consecutiveBenchCountDebug: activePlayers.map(
        (player) => `${player.name}:${benchFairness.consecutiveBenchCounts[player.id] ?? 0}`
      ),
      matchesPlayedDebug: activePlayers.map(
        (player) => `${player.name}:${benchFairness.matchesPlayed[player.id] ?? getPlayerStat(sessionStats, player.id).matches}`
      ),
      selectedPlayingPool: nextMatches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.name),
      benchedThisRound: benchedThisRound.map((player) => player.name),
      benchReasonDebug: benchedThisRound.map((player) => reasonForPlayer(player, false)),
      selectedReasonDebug: selectedThisRound.map((player) => reasonForPlayer(player, true)),
      selectedFourPlayerGroupKey: selectedGroupKey,
      selectedGroupUsedBefore: selectedGroupVariety.groupUseCount > 0,
      selectedGroupCoAppearanceTotal: selectedGroupVariety.coAppearance,
      selectedGroupReason: `match-count-valid group, groupUses=${selectedGroupVariety.groupUseCount}, recent=${selectedGroupVariety.usedRecently}, coAppearance=${selectedGroupVariety.coAppearance}, partnerRepeats=${selectedGroupVariety.repeatedPartnerPairs}, opponentRepeats=${selectedGroupVariety.repeatedOpponentGroups}, poolPenalty=${selectedGroupVariety.penalty}`,
      matchCountDistributionAfterSelection: activePlayers.map((player) => `${player.name}:${afterMatchCounts[player.id] ?? 0}`),
      matchCountGapBefore: matchCountGap(activePlayers, benchFairness.matchesPlayed),
      matchCountGapAfter: matchCountGap(activePlayers, afterMatchCounts),
      totalPlayerSlots: quota.totalPlayerSlots,
      remainingRoundsIncludingCurrent: quota.remainingRoundsIncludingCurrent,
      remainingPlayerSlots: quota.remainingPlayerSlots,
      idealTargetMatchesPerPlayer: quota.idealTargetMatchesPerPlayer
    };
    setGenerationDebug(nextDebug);
    setGenerationHistoryDebug((current) => {
      const nextEntry: GenerationHistoryDebugEntry = {
        round: requestedRound,
        selectedPlayingPool: selectedThisRound.map((player) => player.name).join(" / "),
        benchedPlayers: benchedThisRound.map((player) => player.name).join(" / "),
        teamA: nextMatches.map((match) => match.teamA.map((player) => player.name).join(" / ")).join(" | "),
        teamB: nextMatches.map((match) => match.teamB.map((player) => player.name).join(" / ")).join(" | "),
        fourPlayerGroupKey: selectedGroupKey,
        priorGroupUses: selectedGroupVariety.groupUseCount,
        coAppearanceTotal: selectedGroupVariety.coAppearance,
        matchesBefore: activePlayers.map((player) => `${player.name}:${benchFairness.matchesPlayed[player.id] ?? 0}`).join(" | "),
        matchesAfter: nextDebug.matchCountDistributionAfterSelection.join(" | "),
        consecutiveBenchBefore: activePlayers.map((player) => `${player.name}:${benchFairness.consecutiveBenchCounts[player.id] ?? 0}`).join(" | "),
        reason: nextDebug.selectedGroupReason
      };

      return [...current.filter((entry) => entry.round !== requestedRound), nextEntry].sort((a, b) => a.round - b.round);
    });
  };
  useEffect(() => {
    const storedPlayers = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    const storedLastSession = window.localStorage.getItem(LAST_SESSION_STORAGE_KEY);

    if (storedPlayers) {
      try {
        const parsedPlayers = JSON.parse(storedPlayers) as Player[];
        if (Array.isArray(parsedPlayers) && parsedPlayers.length > 0) {
          setClubPlayers(parsedPlayers.map(normalizePlayer));
          setSelectedIds((current) =>
            current.filter((id) => parsedPlayers.some((player) => player.id === id))
          );
        }
      } catch {
        setClubPlayers(demoPlayers);
      }
    }

    if (storedLastSession) {
      try {
        const parsedLastSession = JSON.parse(storedLastSession) as CompletedSessionSummary;
        if (parsedLastSession?.stats && parsedLastSession?.completedAt) {
          setLastCompletedSession(parsedLastSession);
        }
      } catch {
        setLastCompletedSession(null);
      }
    }

    setPlayersLoaded(true);
  }, []);

  useEffect(() => {
    if (playersLoaded) {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(clubPlayers));
    }
  }, [clubPlayers, playersLoaded]);

  useEffect(() => {
    setMatches((current) =>
      current.map((match) => ({
        ...match,
        teamA: match.teamA.map((player) => clubPlayers.find((clubPlayer) => clubPlayer.id === player.id) ?? player),
        teamB: match.teamB.map((player) => clubPlayers.find((clubPlayer) => clubPlayer.id === player.id) ?? player)
      }))
    );
  }, [clubPlayers]);

  useEffect(() => {
    if (maxCourtCount > 0 && courtCount > maxCourtCount) {
      setCourtCount(maxCourtCount);
    }
  }, [courtCount, maxCourtCount]);

  useEffect(() => {
    setSessionStats(getSessionStatsFromMatches({ players: selectedPlayers, roundMatches, savedResults }).stats);
  }, [roundMatches, savedResults, selectedPlayers]);

  useEffect(() => {
    setMatches([]);
    setSavedResults({});
    setRoundMatches({});
    setLastDeferredPlayerIdsForNextRound([]);
    setDeferredMatchBlocks([]);
    setGenerationDebug(null);
    setGenerationHistoryDebug([]);
    setParticipationSchedule([]);
    setScheduleRegenerationNote("Schedule reset after player or court selection changed.");
    setSessionPlayerStatuses((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => selectedIds.includes(Number(id))))
    );
  }, [selectedIds, courtCount]);

  useEffect(() => {
    setTotalRounds(baseRoundLimit + addedRoundCount);
  }, [addedRoundCount, baseRoundLimit]);

  useEffect(() => {
    if (totalRounds > 0 && roundNumber > totalRounds) {
      setRoundNumber(totalRounds);
      setMatches([]);
    }
  }, [roundNumber, totalRounds]);

  const createRound = (nextRound = roundNumber) => {
    const availablePlayers = getAvailableSessionPlayers();
    const deferredPlayerIdsForGeneration = lastDeferredPlayerIdsForNextRound;
    const generationPool = generationPlayerPool(availablePlayers, deferredPlayerIdsForGeneration);
    console.log("[ClubMatch] generate round clicked", {
      requestedRound: nextRound,
      currentRound: roundNumber,
      courtCount,
      availablePlayerCount: availablePlayers.length,
      availablePlayers: availablePlayers.map((player) => player.name),
      lastDeferredPlayerIdsForNextRound: deferredPlayerIdsForGeneration,
      nonDeferredActivePlayers: generationPool.nonDeferredActivePlayers.map((player) => player.name),
      hardExclusionApplied: generationPool.hardExclusionApplied,
      sessionPlayerStatuses
    });

    if (availablePlayers.length < 4 || sessionEnded) {
      console.log("[ClubMatch] generate round blocked", {
        reason: availablePlayers.length < 4 ? "not_enough_available_players" : "session_ended",
        availablePlayerCount: availablePlayers.length
      });
      setMatches([]);
      return;
    }

    const boundedRound = Math.min(nextRound, totalRounds);
    const scheduledPool = scheduledPlayersForRound(boundedRound, availablePlayers);
    const scheduledGenerationPool = generationPlayerPool(scheduledPool, deferredPlayerIdsForGeneration);
    const nextMatches = generateFairRound(
      scheduledGenerationPool.playersForGeneration,
      courtCount,
      sessionStats,
      sessionHistory,
      matchmakingConfig(boundedRound, deferredPlayerIdsForGeneration)
    );
    console.log("[ClubMatch] generated round players", {
      requestedRound: boundedRound,
      generatedPlayers: nextMatches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.name),
      activePlayersBeforeGeneration: availablePlayers.map((player) => player.name),
      playersForGeneration: scheduledGenerationPool.playersForGeneration.map((player) => player.name),
      hardExclusionApplied: scheduledGenerationPool.hardExclusionApplied,
      deferredContext: deferredContextForRound(boundedRound - 1)
    });
    setGeneratedRoundDebug(
      boundedRound,
      availablePlayers,
      scheduledGenerationPool.playersForGeneration,
      nextMatches,
      scheduledGenerationPool.hardExclusionApplied,
      deferredPlayerIdsForGeneration,
      scheduledGenerationPool.requiredPlayers
    );
    setRoundNumber(boundedRound);
    setSavedResults((current) => removeRoundResults(current, boundedRound));
    setMatches(nextMatches);
    setRoundMatches((current) => ({ ...current, [boundedRound]: nextMatches }));
    setReplayRoundNumber(null);
    setActiveReplay(null);
    setLastDeferredPlayerIdsForNextRound([]);
  };

  const nextRound = () => {
    const availablePlayers = getAvailableSessionPlayers();
    const deferredPlayerIdsForGeneration = lastDeferredPlayerIdsForNextRound;
    const generationPool = generationPlayerPool(availablePlayers, deferredPlayerIdsForGeneration);
    const allResultsResolved = matches.length > 0 && matches.every((match) => isResolvedResult(savedResults[matchResultKey(roundNumber, match.court)]));
    console.log("[ClubMatch] next round clicked", {
      currentRound: roundNumber,
      totalRounds,
      courtCount,
      allCurrentRoundResolved: allResultsResolved,
      availablePlayerCount: availablePlayers.length,
      availablePlayers: availablePlayers.map((player) => player.name),
      lastDeferredPlayerIdsForNextRound: deferredPlayerIdsForGeneration,
      nonDeferredActivePlayers: generationPool.nonDeferredActivePlayers.map((player) => player.name),
      hardExclusionApplied: generationPool.hardExclusionApplied,
      matchStatuses: matches.map((match) => ({
        court: match.court,
        key: matchResultKey(roundNumber, match.court),
        status: savedResults[matchResultKey(roundNumber, match.court)]?.status ?? "not_started"
      }))
    });

    if (availablePlayers.length < 4 || sessionEnded || roundNumber >= totalRounds || !allResultsResolved) {
      console.log("[ClubMatch] next round blocked", {
        availablePlayerCount: availablePlayers.length,
        sessionEnded,
        atFinalRound: roundNumber >= totalRounds,
        allCurrentRoundResolved: allResultsResolved
      });
      return;
    }

    const next = Math.min(roundNumber + 1, totalRounds);
    const scheduledPool = scheduledPlayersForRound(next, availablePlayers);
    const scheduledGenerationPool = generationPlayerPool(scheduledPool, deferredPlayerIdsForGeneration);
    const nextMatches = generateFairRound(
      scheduledGenerationPool.playersForGeneration,
      courtCount,
      sessionStats,
      sessionHistory,
      matchmakingConfig(next, deferredPlayerIdsForGeneration)
    );
    console.log("[ClubMatch] generated next round players", {
      requestedRound: next,
      generatedPlayers: nextMatches.flatMap((match) => [...match.teamA, ...match.teamB]).map((player) => player.name),
      activePlayersBeforeGeneration: availablePlayers.map((player) => player.name),
      playersForGeneration: scheduledGenerationPool.playersForGeneration.map((player) => player.name),
      hardExclusionApplied: scheduledGenerationPool.hardExclusionApplied,
      deferredContext: deferredContextForRound(next - 1)
    });
    setGeneratedRoundDebug(
      next,
      availablePlayers,
      scheduledGenerationPool.playersForGeneration,
      nextMatches,
      scheduledGenerationPool.hardExclusionApplied,
      deferredPlayerIdsForGeneration,
      scheduledGenerationPool.requiredPlayers
    );
    setRoundNumber(next);
    setSavedResults((current) => removeRoundResults(current, next));
    setMatches(nextMatches);
    setRoundMatches((current) => ({ ...current, [next]: nextMatches }));
    setReplayRoundNumber(null);
    setActiveReplay(null);
    setLastDeferredPlayerIdsForNextRound([]);
  };

  const togglePlayer = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((playerId) => playerId !== id)
        : [...current, id]
    );
  };

  const savePlayer = (draft: PlayerDraft, id?: number) => {
    const trimmedName = draft.name.trim();

    if (!trimmedName) {
      return false;
    }

    const parsedRating = Number(draft.rating);
    const nextPlayer: Player = {
      id: id ?? Math.max(0, ...clubPlayers.map((player) => player.id)) + 1,
      name: trimmedName,
      initials: (draft.initials.trim() || initials(trimmedName)).toUpperCase().slice(0, 3),
      tier: draft.tier,
      rating: draft.rating.trim() && Number.isFinite(parsedRating) ? parsedRating : getDefaultRatingForTier(draft.tier),
      wins: clubPlayers.find((player) => player.id === id)?.wins ?? 0,
      losses: clubPlayers.find((player) => player.id === id)?.losses ?? 0,
      streak: clubPlayers.find((player) => player.id === id)?.streak ?? 0,
      availability: clubPlayers.find((player) => player.id === id)?.availability ?? "Ready",
      style: draft.style.trim() || "All court",
      notes: draft.style.trim() || undefined,
      genderCategory: draft.genderCategory
    };

    setClubPlayers((current) =>
      id
        ? current.map((player) => (player.id === id ? nextPlayer : player))
        : [...current, nextPlayer]
    );

    return true;
  };

  const deletePlayer = (id: number) => {
    setClubPlayers((current) => current.filter((player) => player.id !== id));
    setSelectedIds((current) => current.filter((playerId) => playerId !== id));
  };

  const resetDemoPlayers = () => {
    setClubPlayers(demoPlayers);
    setSelectedIds(defaultSelectedIds);
    setMatches([]);
    setRoundMatches({});
    setSessionStats({});
    setSessionHistory({ partners: [], opponentGroups: [] });
    setSavedResults({});
    setSessionPlayerStatuses({});
    setAddedRoundCount(0);
    setParticipationSchedule([]);
    setScheduleRegenerationNote("Schedule reset with demo players.");
    setSessionEnded(false);
  };

  const updateScore = (court: number, team: "scoreA" | "scoreB", value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(0, 2);
    setMatches((current) =>
      current.map((match) =>
        match.court === court ? { ...match, [team]: nextValue } : match
      )
    );
    setRoundMatches((current) => ({
      ...current,
      [roundNumber]: (current[roundNumber] ?? matches).map((match) =>
        match.court === court ? { ...match, [team]: nextValue } : match
      )
    }));
  };

  const updateMatchPlayer = (court: number, team: "teamA" | "teamB", playerIndex: number, nextPlayerId: number) => {
    const key = matchResultKey(roundNumber, court);

    if (savedResults[key]) {
      return;
    }

    const editMatches = (current: Match[]) => {
      const targetMatch = current.find((match) => match.court === court);
      const currentPlayer = targetMatch?.[team][playerIndex];
      const nextPlayer = sessionPlayers.find((player) => player.id === nextPlayerId);

      if (!targetMatch || !currentPlayer || !nextPlayer || currentPlayer.id === nextPlayer.id) {
        return current;
      }

      const nextPlayerSlot = current
        .flatMap((match) => [
          ...match.teamA.map((player, index) => ({ court: match.court, team: "teamA" as const, index, player })),
          ...match.teamB.map((player, index) => ({ court: match.court, team: "teamB" as const, index, player }))
        ])
        .find((slot) => slot.player.id === nextPlayer.id);

      const editedCourts = new Set([court, nextPlayerSlot?.court].filter(Boolean));

      return current.map((match) => {
        let nextMatch = { ...match, teamA: [...match.teamA], teamB: [...match.teamB] };

        if (match.court === court) {
          nextMatch[team][playerIndex] = nextPlayer;
        }

        if (nextPlayerSlot && match.court === nextPlayerSlot.court) {
          nextMatch[nextPlayerSlot.team][nextPlayerSlot.index] = currentPlayer;
        }

        if (editedCourts.has(match.court)) {
          nextMatch = { ...nextMatch, scoreA: "", scoreB: "" };
        }

        return nextMatch;
      });
    };

    setMatches(editMatches);
    setRoundMatches((current) => ({ ...current, [roundNumber]: editMatches(current[roundNumber] ?? matches) }));
  };

  const markPlayerLeft = (id: number) => {
    setSessionPlayerStatuses((current) => {
      const next: Record<number, PlayerSessionStatus> = { ...current, [id]: "left" };
      regenerateFutureParticipationSchedule(next, roundNumber + 1, "Future schedule regenerated after a player left.");
      return next;
    });
  };

  const startSession = () => {
    if (
      selectedPlayers.length < 4 ||
      totalRounds < 1 ||
      !canSupportDoublesFormat(selectedPlayers, courtCount, doublesFormat)
    ) {
      return;
    }

    const freshStats = Object.fromEntries(selectedPlayers.map((player) => [player.id, blankStat()]));
    const freshHistory = { partners: [], opponentGroups: [] };
    const freshSchedule = buildParticipationSchedule(selectedPlayers, baseRoundLimit);
    const firstScheduleEntry = freshSchedule.find((entry) => entry.roundNumber === 1);
    const firstScheduledPlayers = firstScheduleEntry?.playingPlayerIds
      .map((id) => selectedPlayers.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player)) ?? selectedPlayers;
    const firstConfig: MatchmakingConfig = {
      mode: matchmakingMode,
      sameTierPercentage,
      mixedTierPercentage,
      roundNumber: 1,
      totalRounds: baseRoundLimit,
      courtCount,
      doublesFormat,
      avoidFormatMismatch,
      deferredPlayerIds: [],
      deferredGroupKeys: [],
      deferredOpponentKeys: [],
      deferredMatchBlocks: [],
      sessionMatchHistory: {
        exactMatchKeys: [],
        fourPlayerGroupKeys: [],
        partnerPairKeys: [],
        opponentGroupKeys: [],
        coAppearanceCounts: {}
      },
      benchFairness: benchFairnessFromRounds({}, 1, selectedPlayers)
    };
    const firstMatches = generateFairRound(firstScheduledPlayers, courtCount, freshStats, freshHistory, firstConfig);
    const firstPlayers = firstMatches.flatMap((match) => [...match.teamA, ...match.teamB]);
    const firstPlayerIds = new Set(firstPlayers.map((player) => player.id));
    const firstBenchedPlayers = selectedPlayers.filter((player) => !firstPlayerIds.has(player.id));
    const firstGroupKey = firstPlayers.length ? fourPlayerGroupKey(firstPlayers) : "none";
    const firstMatchCountsAfter = selectedPlayers.map((player) => `${player.name}:${firstPlayerIds.has(player.id) ? 1 : 0}`);

    setRoundNumber(1);
    setSessionStats(freshStats);
    setSessionHistory(freshHistory);
    setSavedResults({});
    setSessionPlayerStatuses({});
    setRoundMatches({ 1: firstMatches });
    setAddedRoundCount(0);
    setReplayRoundNumber(null);
    setActiveReplay(null);
    setLastDeferredPlayerIdsForNextRound([]);
    setDeferredMatchBlocks([]);
    setGenerationDebug(null);
    setParticipationSchedule(freshSchedule);
    setScheduleRegenerationNote("Schedule generated when session started.");
    setGenerationHistoryDebug([
      {
        round: 1,
        selectedPlayingPool: firstPlayers.map((player) => player.name).join(" / "),
        benchedPlayers: firstBenchedPlayers.map((player) => player.name).join(" / "),
        teamA: firstMatches.map((match) => match.teamA.map((player) => player.name).join(" / ")).join(" | "),
        teamB: firstMatches.map((match) => match.teamB.map((player) => player.name).join(" / ")).join(" | "),
        fourPlayerGroupKey: firstGroupKey,
        priorGroupUses: 0,
        coAppearanceTotal: firstScheduleEntry?.coAppearanceTotal ?? 0,
        matchesBefore: selectedPlayers.map((player) => `${player.name}:${firstScheduleEntry?.matchCountsBefore[player.id] ?? 0}`).join(" | "),
        matchesAfter: firstMatchCountsAfter.join(" | "),
        consecutiveBenchBefore: selectedPlayers.map((player) => `${player.name}:${firstScheduleEntry?.consecutiveBenchBefore[player.id] ?? 0}`).join(" | "),
        reason: firstScheduleEntry?.reason ?? "fresh session participation schedule"
      }
    ]);
    setTotalRounds(baseRoundLimit);
    setSessionEnded(false);
    setCompletedSessionStored(false);
    setMatches(firstMatches);
    setScreen("active");
  };

  const startNewSessionSetup = () => {
    setRoundNumber(1);
    setSessionStats({});
    setSessionHistory({ partners: [], opponentGroups: [] });
    setSavedResults({});
    setSessionPlayerStatuses({});
    setRoundMatches({});
    setAddedRoundCount(0);
    setReplayRoundNumber(null);
    setActiveReplay(null);
    setLastDeferredPlayerIdsForNextRound([]);
    setDeferredMatchBlocks([]);
    setGenerationDebug(null);
    setGenerationHistoryDebug([]);
    setParticipationSchedule([]);
    setScheduleRegenerationNote("No schedule generated yet.");
    setTotalRounds(baseRoundLimit);
    setSessionEnded(false);
    setMatches([]);
    setCompletedSessionStored(false);
    setScreen("new");
  };

  const resetLocalSessionData = () => {
    window.localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
    setRoundNumber(1);
    setSessionStats({});
    setSessionHistory({ partners: [], opponentGroups: [] });
    setSavedResults({});
    setSessionPlayerStatuses({});
    setRoundMatches({});
    setAddedRoundCount(0);
    setReplayRoundNumber(null);
    setActiveReplay(null);
    setLastDeferredPlayerIdsForNextRound([]);
    setDeferredMatchBlocks([]);
    setGenerationDebug(null);
    setGenerationHistoryDebug([]);
    setParticipationSchedule([]);
    setScheduleRegenerationNote("Local session data reset.");
    setTotalRounds(baseRoundLimit);
    setSessionEnded(false);
    setMatches([]);
    setCompletedSessionStored(false);
    setLastCompletedSession(null);
    setScreen("new");
  };

  const addMoreRounds = (additionalRounds: number) => {
    if (sessionEnded) {
      return;
    }

    const safeAdditionalRounds = Math.max(Math.floor(additionalRounds), 1);
    const nextTotalRounds = totalRounds + safeAdditionalRounds;
    const availablePlayers = getAvailableSessionPlayers();
    const nextSchedule = buildParticipationSchedule(availablePlayers, nextTotalRounds, participationSchedule);

    setAddedRoundCount((current) => current + safeAdditionalRounds);
    setTotalRounds(nextTotalRounds);
    setParticipationSchedule(nextSchedule);
    setScheduleRegenerationNote(`Schedule extended by ${safeAdditionalRounds} round${safeAdditionalRounds === 1 ? "" : "s"}.`);
    setCompletedSessionStored(false);
  };

  const endSession = () => {
    const recalculatedSession = getSessionStatsFromMatches({ players: selectedPlayers, roundMatches, savedResults });
    const completedSession = {
      completedAt: new Date().toISOString(),
      totalRounds,
      stats: recalculatedSession.stats
    };

    setLastCompletedSession(completedSession);
    setCompletedSessionStored(true);
    setSessionEnded(true);
    window.localStorage.setItem(LAST_SESSION_STORAGE_KEY, JSON.stringify(completedSession));
  };

  const updatePlayerSessionStatus = (id: number, status: PlayerSessionStatus) => {
    setSessionPlayerStatuses((current) => {
      const next = { ...current, [id]: status };

      console.log("[ClubMatch] player session status changed", {
        playerId: id,
        statusBefore: current[id] ?? "active",
        statusAfter: status,
        statusesAfter: next
      });

      regenerateFutureParticipationSchedule(next, roundNumber + 1, "Future schedule regenerated after player availability changed.");
      return next;
    });
  };

  const markPlayersUnavailable = (ids: number[], status: "not_arrived" | "temporarily_unavailable") => {
    setSessionPlayerStatuses((current) => {
      const next: Record<number, PlayerSessionStatus> = {
        ...current,
        ...Object.fromEntries(ids.map((id) => [id, status]))
      };
      regenerateFutureParticipationSchedule(next, roundNumber + 1, "Future schedule regenerated after players were marked unavailable.");
      return next;
    });
  };

  const saveMatchResult = (
    match: Match,
    status: MatchResultStatus = "saved",
    unavailableIds: number[] = [],
    unavailableStatus: "not_arrived" | "temporarily_unavailable" = "not_arrived"
  ) => {
    const resultRound = activeReplay?.round ?? roundNumber;
    const key = matchResultKey(resultRound, match.court);
    const statusBefore = savedResults[key]?.status ?? "not_started";
    const savingActiveReplay =
      Boolean(activeReplay && activeReplay.round === resultRound && activeReplay.court === match.court) &&
      (status === "saved" || status === "completed") &&
      savedResults[key]?.status === "deferred";

    console.log("[ClubMatch] save/skip match requested", {
      key,
      roundNumber: resultRound,
      normalCurrentRound: roundNumber,
      activeReplay,
      court: match.court,
      requestedStatus: status,
      statusBefore,
      unavailableIds,
      unavailableNames: unavailableIds
        .map((id) => selectedPlayers.find((player) => player.id === id)?.name)
        .filter(Boolean),
      sessionPlayerStatusesBefore: sessionPlayerStatuses
    });

    if (savedResults[key] && !savingActiveReplay) {
      console.log("[ClubMatch] save/skip ignored because match already has a result", {
        key,
        existingStatus: savedResults[key].status
      });
      return;
    }

    const scoreA = Number(match.scoreA);
    const scoreB = Number(match.scoreB);

    if (status === "saved" || status === "completed") {

      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || match.scoreA === "" || match.scoreB === "" || scoreA === scoreB) {
        return;
      }

      const teamAWon = scoreA > scoreB;
      const applyTeam = (team: Player[], won: boolean, pointsFor: number, pointsAgainst: number, current: Record<number, SessionStat>) => {
        team.forEach((player) => {
          const stat = current[player.id] ?? blankStat();
          current[player.id] = {
            matches: stat.matches + 1,
            wins: stat.wins + (won ? 1 : 0),
            losses: stat.losses + (won ? 0 : 1),
            pointsFor: stat.pointsFor + pointsFor,
            pointsAgainst: stat.pointsAgainst + pointsAgainst
          };
        });
      };

      setSessionStats((current) => {
        const next = { ...current };
        applyTeam(match.teamA, teamAWon, scoreA, scoreB, next);
        applyTeam(match.teamB, !teamAWon, scoreB, scoreA, next);
        return next;
      });

      setSessionHistory((current) => ({
        partners: [...current.partners, pairKey(match.teamA), pairKey(match.teamB)],
        opponentGroups: [...current.opponentGroups, opponentGroupKey(match.teamA, match.teamB)]
      }));
    } else if (status === "skipped_not_started" && unavailableIds.length > 0) {
      setSessionPlayerStatuses((current) => {
        const next = {
          ...current,
          ...Object.fromEntries(unavailableIds.map((id) => [id, unavailableStatus]))
        };

        console.log("[ClubMatch] session player statuses updated by skip", {
          key,
          unavailableStatus,
          before: current,
          after: next
        });

        regenerateFutureParticipationSchedule(next, resultRound + 1, "Future schedule regenerated after skipped players were marked unavailable.");
        return next;
      });
    } else if (status === "deferred") {
      const deferredPlayerIds = [...match.teamA, ...match.teamB].map((player) => player.id);
      const deferredBlock = matchToDeferredBlock(match, resultRound);

      setLastDeferredPlayerIdsForNextRound(deferredPlayerIds);
      setDeferredMatchBlocks((current) => [
        ...current.filter((block) => block.id !== deferredBlock.id),
        deferredBlock
      ]);
      console.log("[ClubMatch] deferred player cooldown set", {
        key,
        deferredPlayerIds,
        deferredPlayers: [...match.teamA, ...match.teamB].map((player) => player.name),
        deferredBlock
      });
    }

    if (status === "saved" || status === "completed") {
      setDeferredMatchBlocks((current) => current.filter((block) => block.id !== key));
    }

    if (status !== "saved" && status !== "completed") {
      setMatches((current) =>
        current.map((currentMatch) =>
          currentMatch.court === match.court ? { ...currentMatch, scoreA: "", scoreB: "" } : currentMatch
        )
      );
      setRoundMatches((current) => ({
        ...current,
        [resultRound]: (current[resultRound] ?? matches).map((currentMatch) =>
          currentMatch.court === match.court ? { ...currentMatch, scoreA: "", scoreB: "" } : currentMatch
        )
      }));
    }

    setSavedResults((current) => {
      const next = {
        ...current,
        [key]: {
          skipped: status !== "saved" && status !== "completed",
          status,
          teamAIds: match.teamA.map((player) => player.id),
          teamBIds: match.teamB.map((player) => player.id),
          unavailableIds,
          scoreA: status === "saved" || status === "completed" ? scoreA : undefined,
          scoreB: status === "saved" || status === "completed" ? scoreB : undefined,
          replayCompleted: savingActiveReplay || undefined
        }
      };
      const currentRoundMatches = activeReplay ? [match] : roundMatches[resultRound] ?? matches;
      const allCurrentRoundResolved =
        currentRoundMatches.length > 0 &&
        currentRoundMatches.every((roundMatch) => isResolvedResult(next[matchResultKey(resultRound, roundMatch.court)]));

      console.log("[ClubMatch] match status saved", {
        key,
        statusBefore,
        statusAfter: status,
        resolvedMatches: currentRoundMatches.filter((roundMatch) => isResolvedResult(next[matchResultKey(resultRound, roundMatch.court)])).length,
        currentRoundMatches: currentRoundMatches.length,
        allCurrentRoundResolved,
        savedResultsAfter: next
      });

      return next;
    });
    if (savingActiveReplay) {
      setDeferredMatchBlocks((current) => current.filter((block) => block.id !== key));
      setReplayRoundNumber(null);
      setActiveReplay(null);
      setMatches(roundMatches[roundNumber] ?? []);
    }
  };

  const replaySkippedRound = (round: number) => {
    const replayMatches = roundMatches[round] ?? [];
    const hasSkippedNotStarted = replayMatches.some((match) => savedResults[matchResultKey(round, match.court)]?.status === "skipped_not_started");

    if (!hasSkippedNotStarted || replayMatches.length === 0) {
      return;
    }

    console.log("[ClubMatch] replay skipped round", {
      originalRound: round,
      matches: replayMatches.map((match) => ({
        court: match.court,
        teamA: match.teamA.map((player) => player.name),
        teamB: match.teamB.map((player) => player.name)
      }))
    });

    setRoundNumber(round);
    setReplayRoundNumber(round);
    setMatches(replayMatches.map((match) => ({ ...match, scoreA: "", scoreB: "" })));
    setSavedResults((current) => {
      const next = { ...current };
      replayMatches.forEach((match) => {
        const key = matchResultKey(round, match.court);

        if (next[key]?.status === "skipped_not_started") {
          delete next[key];
        }
      });
      return next;
    });
  };

  const playDeferredMatch = (round: number, court: number) => {
    const deferredMatch = (roundMatches[round] ?? []).find((match) => match.court === court);
    const key = matchResultKey(round, court);

    if (!deferredMatch || savedResults[key]?.status !== "deferred") {
      return;
    }

    console.log("[ClubMatch] play deferred match now", {
      originalRound: round,
      court,
      teamA: deferredMatch.teamA.map((player) => player.name),
      teamB: deferredMatch.teamB.map((player) => player.name)
    });

    setReplayRoundNumber(round);
    setActiveReplay({ round, court });
    setMatches([{ ...deferredMatch, scoreA: "", scoreB: "" }]);
    setLastDeferredPlayerIdsForNextRound((current) => {
      const replayPlayerIds = new Set([...deferredMatch.teamA, ...deferredMatch.teamB].map((player) => player.id));
      return current.filter((id) => !replayPlayerIds.has(id));
    });
  };

  const cancelDeferredMatch = (round: number, court: number) => {
    const deferredMatch = (roundMatches[round] ?? []).find((match) => match.court === court);
    const key = matchResultKey(round, court);

    if (!deferredMatch || savedResults[key]?.status !== "deferred") {
      return;
    }

    console.log("[ClubMatch] cancel deferred match", { originalRound: round, court });

    setDeferredMatchBlocks((current) => current.filter((block) => block.id !== key));
    setSavedResults((current) => ({
      ...current,
      [key]: {
        skipped: true,
        status: "cancelled",
        teamAIds: deferredMatch.teamA.map((player) => player.id),
        teamBIds: deferredMatch.teamB.map((player) => player.id),
        scoreA: undefined,
        scoreB: undefined
      }
    }));
  };

  const clearMatchResult = (match: Match) => {
    const key = matchResultKey(activeReplay?.round ?? roundNumber, match.court);
    const savedResult = savedResults[key];

    if (!savedResult) {
      return;
    }

    if (isPlayedResult(savedResult) && savedResult.scoreA !== undefined && savedResult.scoreB !== undefined) {
      const savedScoreA = savedResult.scoreA;
      const savedScoreB = savedResult.scoreB;
      const teamAWon = savedScoreA > savedScoreB;
      const reverseTeam = (ids: number[], won: boolean, pointsFor: number, pointsAgainst: number, current: Record<number, SessionStat>) => {
        ids.forEach((id) => {
          const stat = current[id] ?? blankStat();
          current[id] = {
            matches: Math.max(stat.matches - 1, 0),
            wins: Math.max(stat.wins - (won ? 1 : 0), 0),
            losses: Math.max(stat.losses - (won ? 0 : 1), 0),
            pointsFor: Math.max(stat.pointsFor - pointsFor, 0),
            pointsAgainst: Math.max(stat.pointsAgainst - pointsAgainst, 0)
          };
        });
      };

      setSessionStats((current) => {
        const next = { ...current };
        reverseTeam(savedResult.teamAIds, teamAWon, savedScoreA, savedScoreB, next);
        reverseTeam(savedResult.teamBIds, !teamAWon, savedScoreB, savedScoreA, next);
        return next;
      });

      const teamAPlayers = savedResult.teamAIds
        .map((id) => clubPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player));
      const teamBPlayers = savedResult.teamBIds
        .map((id) => clubPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player));

      setSessionHistory((current) => ({
        partners: removeOne(removeOne(current.partners, pairKey(teamAPlayers)), pairKey(teamBPlayers)),
        opponentGroups: removeOne(current.opponentGroups, opponentGroupKey(teamAPlayers, teamBPlayers))
      }));
    }

    setSavedResults((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (savedResult.status === "deferred") {
      const deferredIds = new Set([...savedResult.teamAIds, ...savedResult.teamBIds]);
      setLastDeferredPlayerIdsForNextRound((current) => current.filter((id) => !deferredIds.has(id)));
      setDeferredMatchBlocks((current) => current.filter((block) => block.id !== key));
    }
    setCompletedSessionStored(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
      <Header screen={screen} />
      <section className="flex-1 px-4 pt-3">
        {screen === "home" && (
          <HomeScreen
            selectedPlayers={selectedPlayers}
            onNewSession={() => setScreen("new")}
            onActiveSession={() => setScreen("active")}
          />
        )}
        {screen === "players" && (
          <PlayersScreen
            players={clubPlayers}
            selectedIds={selectedIds}
            onToggle={togglePlayer}
            onSavePlayer={savePlayer}
            onDeletePlayer={deletePlayer}
            onResetDemoPlayers={resetDemoPlayers}
          />
        )}
        {screen === "new" && (
          <NewSessionScreen
            selectedPlayers={selectedPlayers}
            players={clubPlayers}
            selectedIds={selectedIds}
            courtCount={courtCount}
            maxCourtCount={maxCourtCount}
            sessionFormat={sessionFormat}
            matchmakingMode={matchmakingMode}
            doublesFormat={doublesFormat}
            avoidFormatMismatch={avoidFormatMismatch}
            sameTierPercentage={sameTierPercentage}
            mixedTierPercentage={mixedTierPercentage}
            roundLimitMode={roundLimitMode}
            sessionDurationMinutes={sessionDurationMinutes}
            estimatedRoundMinutes={estimatedRoundMinutes}
            manualRoundCount={manualRoundCount}
            totalRounds={totalRounds}
            onToggle={togglePlayer}
            onSelectAll={() => setSelectedIds(clubPlayers.map((player) => player.id))}
            onClearAll={() => setSelectedIds([])}
            onCourtCountChange={setCourtCount}
            onMatchmakingModeChange={setMatchmakingMode}
            onDoublesFormatChange={setDoublesFormat}
            onAvoidFormatMismatchChange={setAvoidFormatMismatch}
            onSameTierPercentageChange={setSameTierPercentage}
            onMixedTierPercentageChange={setMixedTierPercentage}
            onRoundLimitModeChange={setRoundLimitMode}
            onSessionDurationMinutesChange={setSessionDurationMinutes}
            onEstimatedRoundMinutesChange={setEstimatedRoundMinutes}
            onManualRoundCountChange={setManualRoundCount}
            onStart={startSession}
          />
        )}
        {screen === "active" && (
          <ActiveSessionScreen
            matches={matches}
            roundMatches={roundMatches}
            roundNumber={roundNumber}
            replayRoundNumber={replayRoundNumber}
            activeReplay={activeReplay}
            totalRounds={totalRounds}
            courtCount={courtCount}
            doublesFormat={doublesFormat}
            avoidFormatMismatch={avoidFormatMismatch}
            selectedPlayers={selectedPlayers}
            sessionPlayers={sessionPlayers}
            sessionStats={sessionStats}
            sessionPlayerStatuses={sessionPlayerStatuses}
            generationDebug={generationDebug}
            generationHistoryDebug={generationHistoryDebug}
            participationSchedule={participationSchedule}
            scheduleRegenerationNote={scheduleRegenerationNote}
            lastDeferredPlayerIdsForNextRound={lastDeferredPlayerIdsForNextRound}
            deferredMatchBlocks={deferredMatchBlocks}
            savedResults={savedResults}
            leftPlayerIds={leftPlayerIds}
            onGenerate={() => createRound()}
            onScore={updateScore}
            onPlayerChange={updateMatchPlayer}
            onMarkLeft={markPlayerLeft}
            onMarkAvailable={(id) => updatePlayerSessionStatus(id, "active")}
            onSaveResult={(match) => saveMatchResult(match)}
            onSkipResult={(match, status, unavailableIds, unavailableStatus) =>
              saveMatchResult(match, status, unavailableIds, unavailableStatus)
            }
            onClearResult={clearMatchResult}
            onReplayRound={replaySkippedRound}
            onPlayDeferredMatch={playDeferredMatch}
            onCancelDeferredMatch={cancelDeferredMatch}
            onNextRound={nextRound}
            onAddRounds={addMoreRounds}
            onEndSession={endSession}
            onViewLeaderboard={() => setScreen("leaderboard")}
            onStartNewSession={startNewSessionSetup}
            onResetLocalSessionData={resetLocalSessionData}
            sessionEnded={sessionEnded}
          />
        )}
        {screen === "leaderboard" && (
          <LeaderboardScreen
            players={clubPlayers}
            sessionStats={sessionStats}
            roundMatches={roundMatches}
            savedResults={savedResults}
            lastCompletedSession={lastCompletedSession}
            sessionFormat={sessionFormat}
            totalRounds={totalRounds}
            courtCount={courtCount}
          />
        )}
      </section>
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-ink/10 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                  active ? "bg-ink text-white" : "text-ink/60 hover:bg-mist"
                }`}
                aria-label={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function Header({ screen }: { screen: Screen }) {
  const title = {
    home: "ClubMatch",
    players: "Players",
    new: "New Session",
    active: "Active Session",
    leaderboard: "Leaderboard"
  }[screen];

  return (
    <header className="sticky top-0 z-10 bg-mist/90 px-4 pb-2 pt-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-court">Early Prototype</p>
          <h1 className="text-2xl font-black text-ink">{title}</h1>
          <p className="mt-0.5 text-[11px] font-semibold text-ink/50">
            Private prototype. Data is stored only on this device.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lime text-ink">
          <Shield size={22} />
        </div>
      </div>
    </header>
  );
}

function HomeScreen({
  selectedPlayers,
  onNewSession,
  onActiveSession
}: {
  selectedPlayers: Player[];
  onNewSession: () => void;
  onActiveSession: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-ink p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-lime">Live club night</p>
        <h2 className="mt-2 text-3xl font-black leading-tight">Match players fast between rounds.</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Ready" value="6" dark />
          <Stat label="Courts" value="2" dark />
          <Stat label="Round" value="1" dark />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onNewSession} className="rounded-lg bg-court p-4 text-left font-bold text-white shadow-soft">
          <Plus className="mb-5" size={24} />
          New session
        </button>
        <button onClick={onActiveSession} className="rounded-lg bg-white p-4 text-left font-bold text-ink shadow-soft">
          <Play className="mb-5 text-clay" size={24} />
          Resume live
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">Selected now</h2>
          <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold">{selectedPlayers.length} players</span>
        </div>
        <div className="mt-4 space-y-3">
          {selectedPlayers.slice(0, 4).map((player) => (
            <PlayerRow key={player.id} player={player} compact />
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlayersScreen({
  players,
  selectedIds,
  onToggle,
  onSavePlayer,
  onDeletePlayer,
  onResetDemoPlayers
}: {
  players: Player[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSavePlayer: (draft: PlayerDraft, id?: number) => boolean;
  onDeletePlayer: (id: number) => void;
  onResetDemoPlayers: () => void;
}) {
  const emptyDraft: PlayerDraft = {
    name: "",
    initials: "",
    tier: "C",
    rating: getDefaultRatingForTier("C").toFixed(1),
    style: "",
    genderCategory: "male"
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PlayerDraft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const openNewPlayer = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
  };

  const openEditPlayer = (player: Player) => {
    setEditingId(player.id);
    setDraft({
      name: player.name,
      initials: player.initials,
      tier: player.tier,
      rating: player.rating.toFixed(1),
      style: player.style || player.notes || "",
      genderCategory: coerceGenderCategory(player.genderCategory)
    });
    setShowForm(true);
  };

  const updateDraftName = (name: string) => {
    setDraft((current) => ({
      ...current,
      name,
      initials: editingId ? current.initials : initials(name)
    }));
  };

  const updateDraftTier = (tier: PlayerTier) => {
    setDraft((current) => ({
      ...current,
      tier,
      rating: getDefaultRatingForTier(tier).toFixed(1)
    }));
  };

  const saveDraft = () => {
    const didSave = onSavePlayer(draft, editingId ?? undefined);

    if (didSave) {
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Manage players</h2>
            <p className="mt-1 text-sm text-ink/60">Saved locally on this device.</p>
          </div>
          <button
            onClick={openNewPlayer}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-court text-white"
            aria-label="Add new player"
          >
            <Plus size={24} />
          </button>
        </div>
        <button
          onClick={onResetDemoPlayers}
          className="mt-4 h-11 w-full rounded-lg bg-mist text-sm font-black text-ink"
        >
          Reset demo players
        </button>
      </Card>

      {showForm && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">{editingId ? "Edit player" : "Add player"}</h2>
            <button
              onClick={() => setShowForm(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-mist"
              aria-label="Close player form"
            >
              <X size={20} />
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-black">Name</span>
            <input
              value={draft.name}
              onChange={(event) => updateDraftName(event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-mist px-3 font-bold outline-none focus:border-court"
              placeholder="Player name"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-black">Initials</span>
              <input
                value={draft.initials}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, initials: event.target.value.toUpperCase().slice(0, 3) }))
                }
                className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-mist px-3 text-center font-black outline-none focus:border-court"
                placeholder="AB"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black">Rating</span>
              <input
                value={draft.rating}
                onChange={(event) => setDraft((current) => ({ ...current, rating: event.target.value }))}
                inputMode="decimal"
                className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-mist px-3 text-center font-black outline-none focus:border-court"
                placeholder="3.0"
              />
              <span className="mt-2 block text-xs font-semibold text-ink/55">
                Rating is used internally for matchmaking. Tier is the simpler label.
              </span>
            </label>
          </div>

          <div className="mt-3">
            <p className="text-sm font-black">Tier</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(["A", "B", "C", "D"] as PlayerTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => updateDraftTier(tier)}
                  className={`h-11 rounded-lg font-black ${
                    draft.tier === tier ? "bg-ink text-white" : "bg-mist text-ink/55"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-black">Gender category</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                ["male", "Male"],
                ["female", "Female"]
              ] as [GenderCategory, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setDraft((current) => ({ ...current, genderCategory: id }))}
                  className={`min-h-11 rounded-lg px-2 text-xs font-black ${
                    draft.genderCategory === id ? "bg-ink text-white" : "bg-mist text-ink/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-3 block">
            <span className="text-sm font-black">Notes / play style</span>
            <input
              value={draft.style}
              onChange={(event) => setDraft((current) => ({ ...current, style: event.target.value }))}
              className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-mist px-3 font-bold outline-none focus:border-court"
              placeholder="Optional"
            />
          </label>

          <button
            onClick={saveDraft}
            disabled={!draft.name.trim()}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-black text-white disabled:bg-ink/25"
          >
            <Save size={18} /> Save player
          </button>
        </Card>
      )}

      {players.map((player) => (
        <Card key={player.id}>
          <div className="flex items-center gap-3">
            <Avatar player={player} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-base font-black">{player.name}</h2>
                <span className="rounded-full bg-mist px-2 py-1 text-xs font-black">Tier {player.tier}</span>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {player.rating.toFixed(1)} - {player.style} - {coerceGenderCategory(player.genderCategory) === "male" ? "Male" : "Female"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <button
              onClick={() => onToggle(player.id)}
              className={`flex h-10 items-center justify-center rounded-lg text-sm font-black ${
                selectedIds.includes(player.id) ? "bg-court text-white" : "bg-mist text-ink/55"
              }`}
            >
              {selectedIds.includes(player.id) ? "Selected" : "Select"}
            </button>
            <button
              onClick={() => openEditPlayer(player)}
              className="flex h-10 items-center justify-center rounded-lg bg-mist text-ink"
              aria-label={`Edit ${player.name}`}
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDeletePlayer(player.id)}
              className="flex h-10 items-center justify-center rounded-lg bg-clay/10 text-clay"
              aria-label={`Delete ${player.name}`}
            >
              <Trash2 size={18} />
            </button>
            <div className="flex h-10 items-center justify-center rounded-lg bg-lime text-sm font-black">
              {player.initials}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NewSessionScreen({
  selectedPlayers,
  players,
  selectedIds,
  courtCount,
  maxCourtCount,
  sessionFormat,
  matchmakingMode,
  doublesFormat,
  avoidFormatMismatch,
  sameTierPercentage,
  mixedTierPercentage,
  roundLimitMode,
  sessionDurationMinutes,
  estimatedRoundMinutes,
  manualRoundCount,
  totalRounds,
  onToggle,
  onSelectAll,
  onClearAll,
  onCourtCountChange,
  onMatchmakingModeChange,
  onDoublesFormatChange,
  onAvoidFormatMismatchChange,
  onSameTierPercentageChange,
  onMixedTierPercentageChange,
  onRoundLimitModeChange,
  onSessionDurationMinutesChange,
  onEstimatedRoundMinutesChange,
  onManualRoundCountChange,
  onStart
}: {
  selectedPlayers: Player[];
  players: Player[];
  selectedIds: number[];
  courtCount: number;
  maxCourtCount: number;
  sessionFormat: SessionFormat;
  matchmakingMode: MatchmakingMode;
  doublesFormat: DoublesFormat;
  avoidFormatMismatch: boolean;
  sameTierPercentage: number;
  mixedTierPercentage: number;
  roundLimitMode: RoundLimitMode;
  sessionDurationMinutes: number;
  estimatedRoundMinutes: number;
  manualRoundCount: number;
  totalRounds: number;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onCourtCountChange: (courtCount: number) => void;
  onMatchmakingModeChange: (mode: MatchmakingMode) => void;
  onDoublesFormatChange: (format: DoublesFormat) => void;
  onAvoidFormatMismatchChange: (avoid: boolean) => void;
  onSameTierPercentageChange: (percentage: number) => void;
  onMixedTierPercentageChange: (percentage: number) => void;
  onRoundLimitModeChange: (mode: RoundLimitMode) => void;
  onSessionDurationMinutesChange: (minutes: number) => void;
  onEstimatedRoundMinutesChange: (minutes: number) => void;
  onManualRoundCountChange: (rounds: number) => void;
  onStart: () => void;
}) {
  const baseCanStart = selectedPlayers.length >= 4 && totalRounds >= 1;
  const formatSupported = baseCanStart && canSupportDoublesFormat(selectedPlayers, courtCount, doublesFormat);
  const canStart = baseCanStart && formatSupported;
  const displayedCourtCount = baseCanStart ? courtCount : 0;
  const playersPerRound = displayedCourtCount * 4;
  const benchedPerRound = Math.max(selectedPlayers.length - playersPerRound, 0);
  const estimatedSessionLength = totalRounds * estimatedRoundMinutes;
  const canDecreaseCourts = courtCount > 1;
  const canIncreaseCourts = maxCourtCount > 0 && courtCount < maxCourtCount;
  const maleCount = selectedPlayers.filter((player) => genderOf(player) === "male").length;
  const femaleCount = selectedPlayers.filter((player) => genderOf(player) === "female").length;
  const canDecreaseRounds = manualRoundCount > 1;
  const setSameTierMix = (percentage: number) => {
    const nextSameTier = Math.max(0, Math.min(Math.floor(percentage), 100));
    onSameTierPercentageChange(nextSameTier);
    onMixedTierPercentageChange(100 - nextSameTier);
  };
  const setMixedTierMix = (percentage: number) => {
    const nextMixedTier = Math.max(0, Math.min(Math.floor(percentage), 100));
    onMixedTierPercentageChange(nextMixedTier);
    onSameTierPercentageChange(100 - nextMixedTier);
  };
  const selectMatchmakingMode = (mode: MatchmakingMode) => {
    onMatchmakingModeChange(mode);

    if (mode === "tier") {
      onSameTierPercentageChange(80);
      onMixedTierPercentageChange(20);
    }
  };
  const updateNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(Math.floor(parsed), 1) : fallback;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Build a group</h2>
            <p className="mt-1 text-sm text-ink/60">Pick at least 4 players for doubles courts.</p>
          </div>
          <span className="rounded-lg bg-mist px-3 py-2 text-xl font-black">{selectedPlayers.length}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onSelectAll} className="h-11 rounded-lg bg-court text-sm font-black text-white">
            Select All
          </button>
          <button onClick={onClearAll} className="h-11 rounded-lg bg-mist text-sm font-black text-ink">
            Clear All
          </button>
        </div>
        <p className="mt-3 text-sm font-black text-ink">{selectedPlayers.length} selected</p>
        {selectedPlayers.length < 4 && (
          <p className="mt-4 rounded-lg bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
            Select at least 4 players to start a session.
          </p>
        )}
      </Card>

      <Card>
        <div>
          <h2 className="text-xl font-black">Session Format</h2>
          <p className="mt-1 text-sm text-ink/60">Choose how players rotate through courts.</p>
        </div>
        <div className="mt-4 space-y-2">
          <button className="flex min-h-14 w-full items-center justify-between rounded-lg border border-court bg-white px-4 py-3 text-left shadow-sm">
            <span className="font-black">{sessionFormat}</span>
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-black">Active</span>
          </button>
          {["Americano", "Round Robin", "Mexicano"].map((format) => (
            <button
              key={format}
              disabled
              className="flex min-h-14 w-full items-center justify-between rounded-lg bg-mist px-4 py-3 text-left text-ink/35"
            >
              <span className="font-black">{format}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black">Coming soon</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div>
          <h2 className="text-xl font-black">Matchmaking Mode</h2>
          <p className="mt-1 text-sm text-ink/60">Control how much the generator favors tier groups.</p>
        </div>
        <div className="mt-4 space-y-2">
          {([
            { id: "smart", label: "Smart Rotation", note: "Balanced teams, bench fairness, repeated-pair avoidance." },
            { id: "tier", label: "Tier Group Rotation", note: "About 80% same-tier, 20% mixed/fun." },
            { id: "custom", label: "Custom Mix", note: "Set the same-tier and mixed/fun blend." }
          ] as { id: MatchmakingMode; label: string; note: string }[]).map((mode) => (
            <button
              key={mode.id}
              onClick={() => selectMatchmakingMode(mode.id)}
              className={`min-h-16 w-full rounded-lg border px-4 py-3 text-left ${
                matchmakingMode === mode.id ? "border-court bg-white shadow-sm" : "border-transparent bg-mist"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-black">{mode.label}</span>
                {matchmakingMode === mode.id && <span className="rounded-full bg-lime px-3 py-1 text-xs font-black">Active</span>}
              </div>
              <p className="mt-1 text-xs font-semibold text-ink/55">{mode.note}</p>
            </button>
          ))}
        </div>
        {(matchmakingMode === "tier" || matchmakingMode === "custom") && (
          <div className="mt-4 rounded-lg bg-mist p-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Same-tier" value={`${sameTierPercentage}%`} />
              <Stat label="Mixed/fun" value={`${mixedTierPercentage}%`} />
            </div>
            {matchmakingMode === "custom" ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-black">Same-tier %</span>
                  <input
                    value={sameTierPercentage}
                    onChange={(event) => setSameTierMix(Number(event.target.value))}
                    inputMode="numeric"
                    className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-white px-3 text-center text-xl font-black outline-none focus:border-court"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-black">Mixed/fun %</span>
                  <input
                    value={mixedTierPercentage}
                    onChange={(event) => setMixedTierMix(Number(event.target.value))}
                    inputMode="numeric"
                    className="mt-2 h-12 w-full rounded-lg border border-ink/10 bg-white px-3 text-center text-xl font-black outline-none focus:border-court"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-ink/55">
                The generator targets same-tier matches most rounds and rotates in balanced A+B style mixed matches occasionally.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div>
          <h2 className="text-xl font-black">Doubles Format</h2>
          <p className="mt-1 text-sm text-ink/60">Set gender pairing rules for generated doubles matches.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            ["open", "Open Doubles"],
            ["mens", "Men's Doubles"],
            ["womens", "Women's Doubles"],
            ["mixed", "Mixed Doubles"]
          ] as [DoublesFormat, string][]).map(([format, label]) => (
            <button
              key={format}
              onClick={() => onDoublesFormatChange(format)}
              className={`min-h-12 rounded-lg px-3 text-sm font-black ${
                doublesFormat === format ? "bg-ink text-white" : "bg-mist text-ink/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {doublesFormat === "open" && (
          <button
            onClick={() => onAvoidFormatMismatchChange(!avoidFormatMismatch)}
            className="mt-3 flex min-h-12 w-full items-center justify-between rounded-lg bg-mist px-3 text-left"
          >
            <span>
              <span className="block text-sm font-black">Avoid format mismatch</span>
              <span className="block text-xs font-semibold text-ink/55">
                Avoid mixed vs men, mixed vs women, or men vs women pairings.
              </span>
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${avoidFormatMismatch ? "bg-lime text-ink" : "bg-white text-ink/50"}`}>
              {avoidFormatMismatch ? "On" : "Off"}
            </span>
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Male" value={String(maleCount)} />
          <Stat label="Female" value={String(femaleCount)} />
        </div>
        {baseCanStart && !formatSupported && (
          <p className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
            Not enough eligible players for this doubles format. Reduce courts or change format.
          </p>
        )}
      </Card>

      <div className="space-y-3">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onToggle(player.id)}
            className={`w-full rounded-lg border p-4 text-left shadow-soft ${
              selectedIds.includes(player.id) ? "border-court bg-white" : "border-transparent bg-white/70"
            }`}
          >
            <PlayerRow player={player} selected={selectedIds.includes(player.id)} />
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Number of Courts</h2>
            <p className="mt-1 text-sm text-ink/60">
              Choose how many courts to run this session.
            </p>
          </div>
          <span className="rounded-lg bg-mist px-3 py-2 text-sm font-black">
            Max {maxCourtCount}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[64px_1fr_64px] items-center gap-3">
          <button
            onClick={() => onCourtCountChange(Math.max(1, courtCount - 1))}
            disabled={!baseCanStart || !canDecreaseCourts}
            className="flex h-16 items-center justify-center rounded-lg bg-ink text-white shadow-soft disabled:bg-ink/15 disabled:text-ink/25"
            aria-label="Decrease courts"
          >
            <Minus size={28} />
          </button>
          <div className="flex h-16 items-center justify-center rounded-lg bg-mist text-3xl font-black text-ink">
            {displayedCourtCount}
          </div>
          <button
            onClick={() => onCourtCountChange(Math.min(maxCourtCount, courtCount + 1))}
            disabled={!baseCanStart || !canIncreaseCourts}
            className="flex h-16 items-center justify-center rounded-lg bg-court text-white shadow-soft disabled:bg-ink/15 disabled:text-ink/25"
            aria-label="Increase courts"
          >
            <Plus size={28} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Selected players" value={String(selectedPlayers.length)} />
          <Stat label="Courts" value={String(displayedCourtCount)} />
          <Stat label="Playing per round" value={String(playersPerRound)} />
          <Stat label="Benched per round" value={String(benchedPerRound)} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Round Limit</h2>
            <p className="mt-1 text-sm text-ink/60">
              Set how many rounds this session should run.
            </p>
          </div>
          <span className="rounded-lg bg-lime px-3 py-2 text-sm font-black">
            {totalRounds} rounds
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-mist p-1">
          <button
            onClick={() => onRoundLimitModeChange("manual")}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-black ${
              roundLimitMode === "manual" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            <Hash size={18} /> Manual rounds
          </button>
          <button
            onClick={() => onRoundLimitModeChange("duration")}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-black ${
              roundLimitMode === "duration" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            <Clock size={18} /> Duration
          </button>
        </div>

        {roundLimitMode === "manual" ? (
          <div className="mt-4">
            <p className="text-sm font-black">Total rounds</p>
            <div className="mt-2 grid grid-cols-[64px_1fr_64px] items-center gap-3">
              <button
                onClick={() => onManualRoundCountChange(Math.max(1, manualRoundCount - 1))}
                disabled={!canDecreaseRounds}
                className="flex h-16 items-center justify-center rounded-lg bg-ink text-white shadow-soft disabled:bg-ink/15 disabled:text-ink/25"
                aria-label="Decrease total rounds"
              >
                <Minus size={28} />
              </button>
              <div className="flex h-16 items-center justify-center rounded-lg bg-mist text-3xl font-black text-ink">
                {manualRoundCount}
              </div>
              <button
                onClick={() => onManualRoundCountChange(manualRoundCount + 1)}
                className="flex h-16 items-center justify-center rounded-lg bg-court text-white shadow-soft"
                aria-label="Increase total rounds"
              >
                <Plus size={28} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-black">Session minutes</span>
              <input
                value={sessionDurationMinutes}
                onChange={(event) =>
                  onSessionDurationMinutesChange(updateNumber(event.target.value, sessionDurationMinutes))
                }
                inputMode="numeric"
                className="mt-2 h-14 w-full rounded-lg border border-ink/10 bg-mist px-3 text-center text-2xl font-black outline-none focus:border-court"
                aria-label="Session duration in minutes"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black">Round minutes</span>
              <input
                value={estimatedRoundMinutes}
                onChange={(event) =>
                  onEstimatedRoundMinutesChange(updateNumber(event.target.value, estimatedRoundMinutes))
                }
                inputMode="numeric"
                className="mt-2 h-14 w-full rounded-lg border border-ink/10 bg-mist px-3 text-center text-2xl font-black outline-none focus:border-court"
                aria-label="Estimated round duration in minutes"
              />
            </label>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-black">Session Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Format" value={sessionFormat} />
          <Stat
            label="Matchmaking"
            value={matchmakingMode === "smart" ? "Smart" : matchmakingMode === "tier" ? "Tier" : "Custom"}
          />
          <Stat label="Doubles" value={doublesFormatLabel(doublesFormat)} />
          <Stat label="Selected players" value={String(selectedPlayers.length)} />
          <Stat label="Courts" value={String(displayedCourtCount)} />
          <Stat label="Playing per round" value={String(playersPerRound)} />
          <Stat label="Benched per round" value={String(benchedPerRound)} />
          <Stat label="Total rounds" value={String(totalRounds)} />
        </div>
        <div className="mt-2 rounded-lg bg-mist p-3">
          <p className="text-xs font-semibold text-ink/55">Estimated session length</p>
          <p className="text-xl font-black">{estimatedSessionLength} minutes</p>
        </div>

        {!canStart && (
          <p className="mt-4 rounded-lg bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
            {selectedPlayers.length < 4
              ? "Select at least 4 players to start a session."
              : "Not enough eligible players for this doubles format. Reduce courts or change format."}
          </p>
        )}

        <button
          onClick={onStart}
          disabled={!canStart}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-ink font-black text-white disabled:bg-ink/25"
        >
          Start Session <ChevronRight size={18} />
        </button>
      </Card>
    </div>
  );
}

function ActiveSessionScreen({
  selectedPlayers,
  sessionPlayers,
  sessionStats,
  matches,
  roundMatches,
  roundNumber,
  replayRoundNumber,
  activeReplay,
  totalRounds,
  courtCount,
  doublesFormat,
  avoidFormatMismatch,
  savedResults,
  sessionPlayerStatuses,
  generationDebug,
  generationHistoryDebug,
  participationSchedule,
  scheduleRegenerationNote,
  lastDeferredPlayerIdsForNextRound,
  deferredMatchBlocks,
  leftPlayerIds,
  onGenerate,
  onScore,
  onPlayerChange,
  onMarkLeft,
  onMarkAvailable,
  onSaveResult,
  onSkipResult,
  onClearResult,
  onReplayRound,
  onPlayDeferredMatch,
  onCancelDeferredMatch,
  onNextRound,
  onAddRounds,
  onEndSession,
  onViewLeaderboard,
  onStartNewSession,
  onResetLocalSessionData,
  sessionEnded
}: {
  selectedPlayers: Player[];
  sessionPlayers: Player[];
  sessionStats: Record<number, SessionStat>;
  matches: Match[];
  roundMatches: Record<number, Match[]>;
  roundNumber: number;
  replayRoundNumber: number | null;
  activeReplay: ActiveReplay | null;
  totalRounds: number;
  courtCount: number;
  doublesFormat: DoublesFormat;
  avoidFormatMismatch: boolean;
  savedResults: Record<string, SavedMatchResult>;
  sessionPlayerStatuses: Record<number, PlayerSessionStatus>;
  generationDebug: GenerationDebug | null;
  generationHistoryDebug: GenerationHistoryDebugEntry[];
  participationSchedule: ParticipationScheduleEntry[];
  scheduleRegenerationNote: string;
  lastDeferredPlayerIdsForNextRound: number[];
  deferredMatchBlocks: DeferredMatchBlock[];
  leftPlayerIds: number[];
  onGenerate: () => void;
  onScore: (court: number, team: "scoreA" | "scoreB", value: string) => void;
  onPlayerChange: (court: number, team: "teamA" | "teamB", playerIndex: number, playerId: number) => void;
  onMarkLeft: (id: number) => void;
  onMarkAvailable: (id: number) => void;
  onSaveResult: (match: Match) => void;
  onSkipResult: (
    match: Match,
    status: MatchResultStatus,
    unavailableIds?: number[],
    unavailableStatus?: "not_arrived" | "temporarily_unavailable"
  ) => void;
  onClearResult: (match: Match) => void;
  onReplayRound: (round: number) => void;
  onPlayDeferredMatch: (round: number, court: number) => void;
  onCancelDeferredMatch: (round: number, court: number) => void;
  onNextRound: () => void;
  onAddRounds: (additionalRounds: number) => void;
  onEndSession: () => void;
  onViewLeaderboard: () => void;
  onStartNewSession: () => void;
  onResetLocalSessionData: () => void;
  sessionEnded: boolean;
}) {
  const [showAddRounds, setShowAddRounds] = useState(false);
  const [customRounds, setCustomRounds] = useState("1");
  const [roundFilter, setRoundFilter] = useState<"all" | "current" | "completed" | "skipped" | "not_started">("all");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const isReplayMode = Boolean(activeReplay);
  const activeResultRound = activeReplay?.round ?? roundNumber;
  const canGenerate = !isReplayMode && sessionPlayers.length >= 4 && totalRounds > 0 && roundNumber <= totalRounds && matches.length === 0;
  const isFinalRound = roundNumber >= totalRounds;
  const playingIds = new Set(matches.flatMap((match) => [...match.teamA, ...match.teamB].map((player) => player.id)));
  const playersPlaying = sessionPlayers.filter((player) => playingIds.has(player.id));
  const benchedPlayers = sessionPlayers.filter((player) => matches.length > 0 && !playingIds.has(player.id));
  const leftPlayers = selectedPlayers.filter((player) => leftPlayerIds.includes(player.id));
  const notArrivedPlayers = selectedPlayers.filter((player) => sessionPlayerStatuses[player.id] === "not_arrived");
  const temporarilyUnavailablePlayers = selectedPlayers.filter((player) => sessionPlayerStatuses[player.id] === "temporarily_unavailable");
  const unavailablePlayers = [...notArrivedPlayers, ...temporarilyUnavailablePlayers, ...leftPlayers];
  const resultForMatch = (match: Match) => {
    const result = savedResults[matchResultKey(activeResultRound, match.court)];

    return isReplayMode && result?.status === "deferred" ? undefined : result;
  };
  const resolvedCount = matches.filter((match) => isResolvedResult(resultForMatch(match))).length;
  const allResultsResolved = matches.length > 0 && resolvedCount === matches.length;
  const nextRoundDisabled = isReplayMode || sessionEnded || roundNumber >= totalRounds || !allResultsResolved || sessionPlayers.length < 4;
  const pendingDeferredMatches = Object.entries(roundMatches).flatMap(([roundKey, roundMatchList]) => {
    const originalRound = Number(roundKey);

    return roundMatchList
      .map((match) => ({
        round: originalRound,
        match,
        result: savedResults[matchResultKey(originalRound, match.court)]
      }))
      .filter((item) => item.result?.status === "deferred");
  });
  const sessionCompleted = !isReplayMode && isFinalRound && allResultsResolved && pendingDeferredMatches.length === 0;
  const plannedRoundsResolved = !isReplayMode && isFinalRound && allResultsResolved;
  const completedRounds = Math.max(0, Math.min(totalRounds, roundNumber - (allResultsResolved ? 0 : 1)));
  const progressPercent = totalRounds > 0 ? Math.min((completedRounds / totalRounds) * 100, 100) : 0;
  const activeCourtCount = matches.length || Math.min(courtCount, Math.floor(sessionPlayers.length / 4));
  const roundStatusText = isReplayMode ? "Replay in progress" : allResultsResolved ? "Ready for next round" : "Round in progress";
  const formatMismatchInCurrentRound = doublesFormat === "open" && avoidFormatMismatch && matches.some(hasDoublesFormatMismatch);
  const limitedPlayerPool =
    matches.length > 0 &&
    (sessionPlayers.length < courtCount * 4 ||
      (leftPlayers.length > 0 && sessionPlayers.length <= matches.length * 4 + 2) ||
      matches.some(hasExtremeTierMismatch) ||
      formatMismatchInCurrentRound);
  const generatedHistoryBeforeCurrentRound = sessionMatchHistoryFromRounds(roundMatches, roundNumber);
  const recalculatedForCurrentRound = getSessionStatsFromMatches({ players: sessionPlayers, roundMatches, savedResults });
  const matchCountFairnessBeforeCurrentRound = {
    ...benchFairnessFromRounds(roundMatches, roundNumber + 1, sessionPlayers),
    matchesPlayed: recalculatedForCurrentRound.playerMatchCounts
  };
  const currentMatchCountGap = matchCountGap(sessionPlayers, matchCountFairnessBeforeCurrentRound.matchesPlayed);
  const perfectDistributionPossible =
    sessionPlayers.length > 0 &&
    (totalRounds * courtCount * 4) % sessionPlayers.length === 0 &&
    unavailablePlayers.length === 0;
  const matchCountImbalanceDetected =
    currentMatchCountGap > 1 || (sessionCompleted && perfectDistributionPossible && currentMatchCountGap > 0);
  const repeatedCurrentMatch =
    matches.length > 0 &&
    matches.some((match) => generatedHistoryBeforeCurrentRound.exactMatchKeys.includes(exactMatchKey(match.teamA, match.teamB)));
  const deferredMatches = pendingDeferredMatches;
  const recalculatedSessionStats = getSessionStatsFromMatches({ players: selectedPlayers, roundMatches, savedResults });
  const statsMismatchDetected = selectedPlayers.some(
    (player) => getPlayerStat(sessionStats, player.id).matches !== getPlayerStat(recalculatedSessionStats.stats, player.id).matches
  );
  const completedAllPlannedRounds = recalculatedSessionStats.completedMatchesCount >= totalRounds * Math.min(courtCount, Math.floor(selectedPlayers.length / 4));
  const perfectCompletedDistributionPossible =
    selectedPlayers.length > 0 &&
    recalculatedSessionStats.completedPlayerSlots > 0 &&
    recalculatedSessionStats.completedPlayerSlots % selectedPlayers.length === 0 &&
    unavailablePlayers.length === 0;
  const finalDistributionWarning =
    completedAllPlannedRounds &&
    ((perfectCompletedDistributionPossible && recalculatedSessionStats.finalMatchCountGap > 0) ||
      recalculatedSessionStats.finalMatchCountGap > 1);
  const imbalancePlayers = sessionPlayers.length > 0 ? sessionPlayers : selectedPlayers;
  const imbalanceCounts = imbalancePlayers.map((player) => ({
    player,
    matches: getPlayerStat(recalculatedSessionStats.stats, player.id).matches
  }));
  const minMatchCount = imbalanceCounts.length ? Math.min(...imbalanceCounts.map((item) => item.matches)) : 0;
  const maxMatchCount = imbalanceCounts.length ? Math.max(...imbalanceCounts.map((item) => item.matches)) : 0;
  const matchCountGapValue = Math.max(maxMatchCount - minMatchCount, currentMatchCountGap, recalculatedSessionStats.finalMatchCountGap);
  const lowestMatchPlayers = imbalanceCounts.filter((item) => item.matches === minMatchCount).map((item) => item.player);
  const highestMatchPlayers = imbalanceCounts.filter((item) => item.matches === maxMatchCount).map((item) => item.player);
  const statusChangedPlayers = selectedPlayers.filter((player) => (sessionPlayerStatuses[player.id] ?? "active") !== "active");
  const matchResults = Object.values(savedResults);
  const hasSkippedOrDeferredMatches = matchResults.some((result) =>
    result.status === "skipped_result" ||
    result.status === "skipped_not_started" ||
    result.status === "deferred" ||
    result.status === "cancelled"
  );
  const totalPlayerSlots = totalRounds * courtCount * 4;
  const countedPlayerSlots = recalculatedSessionStats.completedPlayerSlots;
  const pendingReplaySummaries = deferredMatches.map(({ round, match }) => ({
    round,
    court: match.court,
    players: [...match.teamA, ...match.teamB]
  }));
  const pendingReplayCount = pendingReplaySummaries.length;
  const plannedSlotsNotCounted = countedPlayerSlots < totalPlayerSlots && (pendingReplayCount > 0 || hasSkippedOrDeferredMatches);
  const perfectDistributionForSelectedPlayers = selectedPlayers.length > 0 && totalPlayerSlots % selectedPlayers.length === 0;
  const idealMatchesPerSelectedPlayer = selectedPlayers.length > 0 ? totalPlayerSlots / selectedPlayers.length : 0;
  const imbalanceReasons = [
    statusChangedPlayers.length > 0 ? "Some players were unavailable or marked not arrived." : null,
    hasSkippedOrDeferredMatches ? "Some matches were skipped or deferred." : null,
    deferredMatches.length > 0 ? "A replay/pending match has not been completed." : null,
    statusChangedPlayers.length > 0 || selectedPlayers.length !== sessionPlayers.length ? "Player pool changed during the session." : null,
    !perfectDistributionForSelectedPlayers ? "Generator could not distribute matches evenly with current constraints." : null
  ].filter((reason): reason is string => Boolean(reason));
  const imbalanceActions = [
    deferredMatches.length > 0 ? "Complete pending replay matches." : null,
    deferredMatches.length > 0 ? "Cancel pending replay if it will not be played." : null,
    statusChangedPlayers.some((player) => sessionPlayerStatuses[player.id] === "not_arrived" || sessionPlayerStatuses[player.id] === "temporarily_unavailable")
      ? "Mark unavailable players as available if they have arrived."
      : null,
    deferredMatches.length > 0 ? "Add more rounds only if imbalance remains after replay." : null,
    deferredMatches.length === 0 && !isFinalRound ? "Continue generating rounds to balance match count." : null,
    deferredMatches.length === 0 && statusChangedPlayers.length === 0 && isFinalRound && matchCountGapValue > 0 ? "Add more rounds to give lower-count players another match." : null,
    isFinalRound ? "End session anyway." : null
  ].filter((action): action is string => Boolean(action));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ${allResultsResolved ? "bg-lime text-ink" : "bg-court/10 text-court"}`}>
              {roundStatusText}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight">
              {isReplayMode ? `Round ${activeReplay?.round} Replay` : `Round ${roundNumber} of ${totalRounds}`}
            </h2>
            <p className="mt-1 text-xs font-bold text-ink/55">{completedRounds} of {totalRounds} rounds completed</p>
          </div>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime disabled:bg-ink/10 disabled:text-ink/25"
            aria-label="Generate round"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-court" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip value={`${activeCourtCount} ${activeCourtCount === 1 ? "Court" : "Courts"}`} />
          <StatusChip value={`${playersPlaying.length} Playing`} />
          <StatusChip value={`${benchedPlayers.length} Benched`} />
          <StatusChip value={`${sessionPlayers.length} Available`} />
          <StatusChip value={`${unavailablePlayers.length} Unavailable`} tone={unavailablePlayers.length ? "warn" : "neutral"} />
          <StatusChip value={`${resolvedCount}/${matches.length} Resolved`} tone={allResultsResolved ? "ready" : "neutral"} />
        </div>
        {playersPlaying.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {playersPlaying.map((player) => (
              <div key={player.id} className="flex min-w-fit items-center gap-2 rounded-lg bg-mist px-2 py-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-court text-[10px] font-black text-white">
                  {player.initials || initials(player.name)}
                </div>
                <span className="whitespace-nowrap text-xs font-black">{player.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
        {benchedPlayers.length > 0 && (
          <p className="mt-2 truncate text-xs font-bold text-ink/55">
            Bench: {benchedPlayers.map((player) => player.name.split(" ")[0]).join(", ")}
          </p>
        )}
        {leftPlayers.length > 0 && (
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {leftPlayers.map((player) => (
              <span key={player.id} className="rounded-full bg-clay/10 px-2 py-1 text-[10px] font-black text-clay">
                {player.name.split(" ")[0]} left
              </span>
            ))}
          </div>
        )}
        {sessionPlayers.length < 4 && (
          <div className="mt-3 rounded-lg bg-clay/10 p-3">
            <p className="text-sm font-black text-clay">Not enough available players to generate a round.</p>
          </div>
        )}
        {limitedPlayerPool && (
          <div className="mt-3 rounded-lg bg-clay/10 p-3">
            <p className="text-sm font-black text-clay">Limited player pool. This round may be less balanced.</p>
            {sessionPlayers.length >= 4 && sessionPlayers.length < courtCount * 4 && (
              <p className="mt-1 text-xs font-bold text-clay">
                Available players only support {Math.floor(sessionPlayers.length / 4)} active court{Math.floor(sessionPlayers.length / 4) === 1 ? "" : "s"} right now.
              </p>
            )}
            {formatMismatchInCurrentRound && (
              <p className="mt-1 text-xs font-bold text-clay">
                Limited player pool. Format mismatch may occur.
              </p>
            )}
          </div>
        )}
        {repeatedCurrentMatch && (
          <div className="mt-3 rounded-lg bg-clay/10 p-3">
            <p className="text-sm font-black text-clay">Limited player pool. Some matchups may repeat.</p>
          </div>
        )}
        {matchCountImbalanceDetected && (
          <MatchCountImbalanceCard
            minMatches={minMatchCount}
            maxMatches={maxMatchCount}
            gap={matchCountGapValue}
            lowestPlayers={lowestMatchPlayers}
            highestPlayers={highestMatchPlayers}
            totalPlayerSlots={totalPlayerSlots}
            countedPlayerSlots={countedPlayerSlots}
            plannedSlotsNotCounted={plannedSlotsNotCounted}
            pendingReplaySummaries={pendingReplaySummaries}
            playerCount={selectedPlayers.length}
            courtCount={courtCount}
            totalRounds={totalRounds}
            perfectDistributionPossible={perfectDistributionForSelectedPlayers}
            idealMatchesPerPlayer={idealMatchesPerSelectedPlayer}
            reasons={imbalanceReasons}
            actions={imbalanceActions}
          />
        )}
        {statsMismatchDetected && (
          <div className="mt-3 rounded-lg bg-clay/10 p-3">
            <p className="text-sm font-black text-clay">Stats mismatch detected.</p>
          </div>
        )}
        {finalDistributionWarning && (
          <MatchCountImbalanceCard
            title="Participation fairness failed."
            minMatches={minMatchCount}
            maxMatches={maxMatchCount}
            gap={matchCountGapValue}
            lowestPlayers={lowestMatchPlayers}
            highestPlayers={highestMatchPlayers}
            totalPlayerSlots={totalPlayerSlots}
            countedPlayerSlots={countedPlayerSlots}
            plannedSlotsNotCounted={plannedSlotsNotCounted}
            pendingReplaySummaries={pendingReplaySummaries}
            playerCount={selectedPlayers.length}
            courtCount={courtCount}
            totalRounds={totalRounds}
            perfectDistributionPossible={perfectDistributionForSelectedPlayers}
            idealMatchesPerPlayer={idealMatchesPerSelectedPlayer}
            reasons={imbalanceReasons}
            actions={imbalanceActions}
          />
        )}
      </Card>

      {unavailablePlayers.length > 0 && (
        <UnavailablePlayersSection
          unavailablePlayers={unavailablePlayers}
          sessionPlayerStatuses={sessionPlayerStatuses}
          onMarkAvailable={onMarkAvailable}
        />
      )}

      <PendingMatchesSection
        deferredMatches={deferredMatches}
        onPlayNow={onPlayDeferredMatch}
        onCancelMatch={onCancelDeferredMatch}
      />

      {matches.length === 0 ? (
        <>
        <RoundOverview
          totalRounds={totalRounds}
          currentRound={roundNumber}
          replayRoundNumber={replayRoundNumber}
          roundMatches={roundMatches}
          savedResults={savedResults}
          filter={roundFilter}
          expandedRound={expandedRound}
          onFilterChange={setRoundFilter}
          onToggleRound={(round) => setExpandedRound((current) => (current === round ? null : round))}
          onReplayRound={onReplayRound}
        />
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-center font-black text-white shadow-soft disabled:bg-ink/25"
        >
          <RefreshCw size={20} /> {canGenerate ? "Generate mock round" : "Not enough available players to generate a round."}
        </button>
        </>
      ) : (
        <div className="space-y-3">
          <RoundOverview
            totalRounds={totalRounds}
            currentRound={roundNumber}
            replayRoundNumber={replayRoundNumber}
            roundMatches={roundMatches}
            savedResults={savedResults}
            filter={roundFilter}
            expandedRound={expandedRound}
            onFilterChange={setRoundFilter}
            onToggleRound={(round) => setExpandedRound((current) => (current === round ? null : round))}
            onReplayRound={onReplayRound}
          />
          {matches.map((match) => {
            const result = resultForMatch(match);

            return (
              <CourtCard
                key={match.court}
                match={match}
                result={result}
                saved={isResolvedResult(result)}
                isRematch={generatedHistoryBeforeCurrentRound.exactMatchKeys.includes(exactMatchKey(match.teamA, match.teamB))}
                isReplayMode={isReplayMode}
                availablePlayers={sessionPlayers}
                leftPlayerIds={leftPlayerIds}
                onScore={onScore}
                onPlayerChange={onPlayerChange}
                onMarkLeft={onMarkLeft}
                onSaveResult={onSaveResult}
                onSkipResult={onSkipResult}
                onPlayLater={(matchToDefer) => onSkipResult(matchToDefer, "deferred")}
                onClearResult={onClearResult}
              />
            );
          })}
          {plannedRoundsResolved && deferredMatches.length > 0 && !sessionEnded ? (
            <Card>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-court text-white">
                  <Clock size={24} />
                </div>
                <h2 className="mt-3 text-xl font-black">Pending Replay Matches</h2>
                <p className="mt-1 text-sm font-semibold text-ink/55">
                  Planned rounds are complete. Finish pending replays or end the session anyway.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {deferredMatches.map(({ round, match }) => (
                  <button
                    key={`${round}-${match.court}`}
                    onClick={() => onPlayDeferredMatch(round, match.court)}
                    className="flex min-h-12 w-full items-center justify-center rounded-lg bg-court px-3 text-sm font-black text-white"
                  >
                    Play Round {round} Replay
                  </button>
                ))}
                <button onClick={onEndSession} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-black text-white shadow-soft">
                  End Session Anyway <ChevronRight size={18} />
                </button>
              </div>
            </Card>
          ) : sessionCompleted && sessionEnded ? (
            <Card>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-white">
                  <Trophy size={24} />
                </div>
                <h2 className="mt-3 text-xl font-black">Session ended</h2>
                <p className="mt-1 text-sm font-semibold text-ink/55">
                  Final results are saved. Start a new session when the next group is ready.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <button onClick={onViewLeaderboard} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-lime font-black text-ink shadow-soft">
                  View Final Leaderboard <Trophy size={18} />
                </button>
                <button onClick={onStartNewSession} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-black text-white shadow-soft">
                  Start New Session <ChevronRight size={18} />
                </button>
              </div>
            </Card>
          ) : sessionCompleted ? (
            <Card>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-lime">
                  <Trophy size={24} />
                </div>
                <h2 className="mt-3 text-xl font-black">Session completed</h2>
                <p className="mt-1 text-sm font-semibold text-ink/55">
                  All planned rounds are complete. Add more rounds if there is still court time.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <button onClick={() => setShowAddRounds(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-court font-black text-white shadow-soft">
                  Add More Rounds <Plus size={18} />
                </button>
                <button onClick={onViewLeaderboard} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-lime font-black text-ink shadow-soft">
                  View Final Leaderboard <Trophy size={18} />
                </button>
                <button onClick={onEndSession} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-black text-white shadow-soft">
                  End Session <ChevronRight size={18} />
                </button>
              </div>
              {showAddRounds && (
                <div className="mt-4 rounded-lg bg-mist p-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">Add rounds</h3>
                      <p className="text-xs font-semibold text-ink/55">Current progress: {completedRounds} of {totalRounds} rounds completed</p>
                    </div>
                    <button
                      onClick={() => setShowAddRounds(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white"
                      aria-label="Close add rounds"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((rounds) => (
                      <button
                        key={rounds}
                        onClick={() => {
                          onAddRounds(rounds);
                          setShowAddRounds(false);
                        }}
                        className="h-12 rounded-lg bg-white text-sm font-black text-ink shadow-sm"
                      >
                        +{rounds}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <label className="block">
                      <span className="sr-only">Custom additional rounds</span>
                      <input
                        value={customRounds}
                        onChange={(event) => setCustomRounds(event.target.value.replace(/\D/g, "").slice(0, 2))}
                        inputMode="numeric"
                        className="h-12 w-full rounded-lg border border-ink/10 bg-white px-3 text-center text-lg font-black outline-none focus:border-court"
                        placeholder="1"
                      />
                    </label>
                    <button
                      onClick={() => {
                        onAddRounds(Math.max(Number(customRounds) || 1, 1));
                        setCustomRounds("1");
                        setShowAddRounds(false);
                      }}
                      className="h-12 rounded-lg bg-court px-4 text-sm font-black text-white"
                    >
                      Add custom
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ) : isFinalRound ? (
            <p className="rounded-lg bg-mist px-3 py-3 text-center text-sm font-bold text-ink/60">
              Save or skip every result to finish the session.
            </p>
          ) : (
            <>
            <button
              onClick={onNextRound}
              disabled={nextRoundDisabled}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-court font-black text-white shadow-soft disabled:bg-ink/25"
            >
              Next round <ChevronRight size={18} />
            </button>
            {!allResultsResolved && (
              <p className="text-center text-xs font-bold text-ink/50">
                Save or skip every result to unlock the next round.
              </p>
            )}
            </>
          )}
        </div>
      )}
      <ActiveSessionDebugPanel
        open={debugOpen}
        onToggle={() => setDebugOpen((current) => !current)}
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        courtCount={courtCount}
        matches={matches}
        roundMatches={roundMatches}
        savedResults={savedResults}
        resolvedCount={resolvedCount}
        allCurrentRoundResolved={allResultsResolved}
        nextRoundDisabled={nextRoundDisabled}
        availablePlayers={sessionPlayers}
        selectedPlayers={selectedPlayers}
        unavailablePlayers={unavailablePlayers}
        sessionPlayerStatuses={sessionPlayerStatuses}
        leftPlayers={leftPlayers}
        deferredMatches={deferredMatches}
        generationDebug={generationDebug}
        generationHistoryDebug={generationHistoryDebug}
        participationSchedule={participationSchedule}
        scheduleRegenerationNote={scheduleRegenerationNote}
        lastDeferredPlayerIdsForNextRound={lastDeferredPlayerIdsForNextRound}
        deferredMatchBlocks={deferredMatchBlocks}
        accumulatedStats={sessionStats}
        recalculatedStatsSnapshot={recalculatedSessionStats}
        onResetLocalSessionData={onResetLocalSessionData}
      />
    </div>
  );
}

type RoundFilter = "all" | "current" | "completed" | "skipped" | "not_started";

function UnavailablePlayersSection({
  unavailablePlayers,
  sessionPlayerStatuses,
  onMarkAvailable
}: {
  unavailablePlayers: Player[];
  sessionPlayerStatuses: Record<number, PlayerSessionStatus>;
  onMarkAvailable: (id: number) => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Unavailable Players</h2>
          <p className="mt-1 text-xs font-bold text-ink/55">
            Available players can be included in the next generated round.
          </p>
        </div>
        <span className="rounded-lg bg-mist px-3 py-2 text-sm font-black">{unavailablePlayers.length}</span>
      </div>

      {unavailablePlayers.length === 0 ? (
        <p className="mt-3 rounded-lg bg-mist px-3 py-3 text-sm font-bold text-ink/55">
          Everyone selected is currently available.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {unavailablePlayers.map((player) => {
            const status = sessionPlayerStatuses[player.id] ?? "active";
            const canMarkAvailable = status === "not_arrived" || status === "temporarily_unavailable";

            return (
              <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg bg-mist px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{player.name}</p>
                  <p className={`mt-1 text-xs font-black ${status === "left" ? "text-clay" : "text-court"}`}>
                    {playerStatusLabel(status)}
                  </p>
                </div>
                {canMarkAvailable ? (
                  <button
                    onClick={() => onMarkAvailable(player.id)}
                    className="h-11 shrink-0 rounded-lg bg-court px-4 text-sm font-black text-white shadow-sm"
                  >
                    Mark Available
                  </button>
                ) : status === "left" ? (
                  <button
                    onClick={() => {
                      if (window.confirm(`Restore ${player.name} to available for future rounds?`)) {
                        onMarkAvailable(player.id);
                      }
                    }}
                    className="h-9 shrink-0 rounded-lg bg-white px-3 text-xs font-black text-clay"
                  >
                    Restore
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function PendingMatchesSection({
  deferredMatches,
  onPlayNow,
  onCancelMatch
}: {
  deferredMatches: { round: number; match: Match; result?: SavedMatchResult }[];
  onPlayNow: (round: number, court: number) => void;
  onCancelMatch: (round: number, court: number) => void;
}) {
  if (deferredMatches.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Pending Matches / Play Later</h2>
          <p className="mt-1 text-xs font-bold text-ink/55">
            Deferred matches have no score and do not affect the leaderboard until played.
          </p>
        </div>
        <span className="rounded-lg bg-mist px-3 py-2 text-sm font-black">{deferredMatches.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {deferredMatches.map(({ round, match }) => (
          <div key={`${round}-${match.court}`} className="rounded-lg bg-mist p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black">Round {round} Play Later</p>
                <p className="text-xs font-bold text-ink/55">Court {match.court} - Status: Play Later</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-ink/60">Not played</span>
            </div>
            <div className="mt-2 space-y-1 text-xs font-semibold text-ink/65">
              <p className="truncate">A: {match.teamA.map((player) => player.name.split(" ")[0]).join(" / ")}</p>
              <p className="truncate">B: {match.teamB.map((player) => player.name.split(" ")[0]).join(" / ")}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => onPlayNow(round, match.court)}
                className="h-10 rounded-lg bg-court px-2 text-xs font-black text-white"
              >
                Round {round} Replay
              </button>
              <button className="h-10 rounded-lg bg-white px-2 text-xs font-black text-ink/60">
                Keep Later
              </button>
              <button
                onClick={() => onCancelMatch(round, match.court)}
                className="h-10 rounded-lg bg-clay/10 px-2 text-xs font-black text-clay"
              >
                Cancel Match
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActiveSessionDebugPanel({
  open,
  onToggle,
  roundNumber,
  totalRounds,
  courtCount,
  matches,
  roundMatches,
  savedResults,
  resolvedCount,
  allCurrentRoundResolved,
  nextRoundDisabled,
  availablePlayers,
  selectedPlayers,
  unavailablePlayers,
  sessionPlayerStatuses,
  leftPlayers,
  deferredMatches,
  generationDebug,
  generationHistoryDebug,
  participationSchedule,
  scheduleRegenerationNote,
  lastDeferredPlayerIdsForNextRound,
  deferredMatchBlocks,
  accumulatedStats,
  recalculatedStatsSnapshot,
  onResetLocalSessionData
}: {
  open: boolean;
  onToggle: () => void;
  roundNumber: number;
  totalRounds: number;
  courtCount: number;
  matches: Match[];
  roundMatches: Record<number, Match[]>;
  savedResults: Record<string, SavedMatchResult>;
  resolvedCount: number;
  allCurrentRoundResolved: boolean;
  nextRoundDisabled: boolean;
  availablePlayers: Player[];
  selectedPlayers: Player[];
  unavailablePlayers: Player[];
  sessionPlayerStatuses: Record<number, PlayerSessionStatus>;
  leftPlayers: Player[];
  deferredMatches: { round: number; match: Match; result?: SavedMatchResult }[];
  generationDebug: GenerationDebug | null;
  generationHistoryDebug: GenerationHistoryDebugEntry[];
  participationSchedule: ParticipationScheduleEntry[];
  scheduleRegenerationNote: string;
  lastDeferredPlayerIdsForNextRound: number[];
  deferredMatchBlocks: DeferredMatchBlock[];
  accumulatedStats: Record<number, SessionStat>;
  recalculatedStatsSnapshot: SessionStatsSnapshot;
  onResetLocalSessionData: () => void;
}) {
  const deferredPlayers = Array.from(
    new Map(
      deferredMatches
        .flatMap(({ match }) => [...match.teamA, ...match.teamB])
        .map((player) => [player.id, player])
    ).values()
  );
  const lastDeferredPlayers = availablePlayers.filter((player) => lastDeferredPlayerIdsForNextRound.includes(player.id));
  const nonDeferredAvailablePlayers = availablePlayers.filter((player) => !lastDeferredPlayerIdsForNextRound.includes(player.id));
  const requiredPlayersNow = courtCount * 4;
  const hardExclusionWouldApplyNow =
    lastDeferredPlayerIdsForNextRound.length > 0 && nonDeferredAvailablePlayers.length >= requiredPlayersNow;
  const statsMismatch = selectedPlayers.some(
    (player) => getPlayerStat(accumulatedStats, player.id).matches !== getPlayerStat(recalculatedStatsSnapshot.stats, player.id).matches
  );
  const generatedRoundRows = Object.entries(roundMatches)
    .flatMap(([roundKey, roundMatchList]) =>
      roundMatchList.map((match) => ({
        round: Number(roundKey),
        match,
        key: fourPlayerGroupKey([...match.teamA, ...match.teamB])
      }))
    )
    .sort((a, b) => a.round - b.round || a.match.court - b.match.court);
  const roundNumbers = Array.from({ length: totalRounds }, (_, index) => index + 1);
  const generatedRoundNumbers = new Set(Object.entries(roundMatches).filter(([, roundMatchList]) => roundMatchList.length > 0).map(([roundKey]) => Number(roundKey)));
  const playerParticipationRows = selectedPlayers.map((player) => ({
    player,
    rounds: roundNumbers.map((round) => {
      const roundMatchList = roundMatches[round] ?? [];
      const played = roundMatchList.some((match) => [...match.teamA, ...match.teamB].some((matchPlayer) => matchPlayer.id === player.id));
      const status = sessionPlayerStatuses[player.id] ?? "active";

      if (played) return "Played";
      if (status !== "active" && generatedRoundNumbers.has(round)) return "Unavailable";
      if (generatedRoundNumbers.has(round)) return "Benched";
      return "-";
    })
  }));
  const scheduledCountByPlayer = Object.fromEntries(
    selectedPlayers.map((player) => [
      player.id,
      participationSchedule.filter((entry) => entry.playingPlayerIds.includes(player.id)).length
    ])
  );
  const coAppearanceSummary = participationSchedule
    .flatMap((entry) => coAppearancePairKeys(selectedPlayers.filter((player) => entry.playingPlayerIds.includes(player.id))))
    .reduce<Record<string, number>>((summary, key) => {
      summary[key] = (summary[key] ?? 0) + 1;
      return summary;
    }, {});

  return (
    <Card>
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-lg font-black">Debug Panel</h2>
          <p className="text-xs font-bold text-ink/50">Temporary skip-flow diagnostics</p>
        </div>
        <span className="rounded-lg bg-mist px-3 py-2 text-xs font-black">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-lg bg-ink p-3 font-mono text-[11px] text-white">
          <button
            onClick={onResetLocalSessionData}
            className="w-full rounded bg-clay px-3 py-2 text-left font-black text-white"
          >
            Reset all local session data
          </button>
          <div className="grid grid-cols-2 gap-2">
            <DebugLine label="currentRound" value={String(roundNumber)} />
            <DebugLine label="totalRounds" value={String(totalRounds)} />
            <DebugLine label="currentRoundMatches" value={String(matches.length)} />
            <DebugLine label="resolvedMatches" value={`${resolvedCount}/${matches.length}`} />
            <DebugLine label="allResolved" value={String(allCurrentRoundResolved)} />
            <DebugLine label="nextDisabled" value={String(nextRoundDisabled)} />
          </div>
          <div>
            <p className="font-black text-lime">Current matches</p>
            <div className="mt-2 space-y-2">
              {matches.length === 0 ? (
                <p className="text-white/60">No current matches.</p>
              ) : (
                matches.map((match) => {
                  const key = matchResultKey(roundNumber, match.court);
                  const result = savedResults[key];

                  return (
                    <div key={key} className="rounded bg-white/10 p-2">
                      <p>match id: {key}</p>
                      <p>court: {match.court}</p>
                      <p>status: {result?.status ?? "not_started"}</p>
                      <p>team A: {match.teamA.map((player) => player.name).join(" / ")}</p>
                      <p>team B: {match.teamB.map((player) => player.name).join(" / ")}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <p className="font-black text-lime">Generation History</p>
            <div className="mt-2 space-y-2">
              {generatedRoundRows.length === 0 ? (
                <p className="text-white/60">No generated rounds.</p>
              ) : (
                generatedRoundRows.map(({ round, match, key }) => (
                  <div key={`${round}-${match.court}`} className="rounded bg-white/10 p-2">
                    <p>Round {round} Court {match.court}</p>
                    <p>Player group: {[...match.teamA, ...match.teamB].map((player) => player.name).join(" / ")}</p>
                    <p>Team A: {match.teamA.map((player) => player.name).join(" / ")}</p>
                    <p>Team B: {match.teamB.map((player) => player.name).join(" / ")}</p>
                    <p>fourPlayerGroupKey: {key}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="font-black text-lime">Generation Decision History</p>
            <div className="mt-2 space-y-2">
              {generationHistoryDebug.length === 0 ? (
                <p className="text-white/60">No generation decisions recorded.</p>
              ) : (
                generationHistoryDebug.map((entry) => (
                  <div key={entry.round} className="rounded bg-white/10 p-2">
                    <p>Round: {entry.round}</p>
                    <p>Selected pool: {entry.selectedPlayingPool}</p>
                    <p>Benched players: {entry.benchedPlayers || "none"}</p>
                    <p>Team A: {entry.teamA}</p>
                    <p>Team B: {entry.teamB}</p>
                    <p>fourPlayerGroupKey: {entry.fourPlayerGroupKey}</p>
                    <p>prior group uses: {entry.priorGroupUses}</p>
                    <p>coAppearanceCount total: {entry.coAppearanceTotal}</p>
                    <p>matches before: {entry.matchesBefore}</p>
                    <p>matches after: {entry.matchesAfter}</p>
                    <p>consecutive bench before: {entry.consecutiveBenchBefore}</p>
                    <p>reason: {entry.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="font-black text-lime">Participation Schedule</p>
            <p className="mt-1 text-white/70">{scheduleRegenerationNote}</p>
            <div className="mt-2 space-y-2">
              {participationSchedule.length === 0 ? (
                <p className="text-white/60">No participation schedule generated.</p>
              ) : (
                participationSchedule.map((entry) => (
                  <div key={entry.roundNumber} className="rounded bg-white/10 p-2">
                    <p>Round: {entry.roundNumber}</p>
                    <p>Playing pool: {entry.playingPlayerIds.map((id) => selectedPlayers.find((player) => player.id === id)?.name ?? id).join(" / ") || "none"}</p>
                    <p>Benched: {entry.benchedPlayerIds.map((id) => selectedPlayers.find((player) => player.id === id)?.name ?? id).join(" / ") || "none"}</p>
                    <p>Target min/max: {entry.targetMin} / {entry.targetMax}</p>
                    <p>fourPlayerGroupKey: {entry.fourPlayerGroupKey}</p>
                    <p>coAppearance total: {entry.coAppearanceTotal}</p>
                    <p>match counts before: {selectedPlayers.map((player) => `${player.name}:${entry.matchCountsBefore[player.id] ?? 0}`).join(" | ")}</p>
                    <p>match counts after: {selectedPlayers.map((player) => `${player.name}:${entry.matchCountsAfter[player.id] ?? 0}`).join(" | ")}</p>
                    <p>consecutive bench before: {selectedPlayers.map((player) => `${player.name}:${entry.consecutiveBenchBefore[player.id] ?? 0}`).join(" | ")}</p>
                    <p>reason: {entry.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="font-black text-lime">Scheduled vs actual match counts</p>
            <p>
              {selectedPlayers.map((player) => `${player.name}: scheduled ${scheduledCountByPlayer[player.id] ?? 0}, completed ${getPlayerStat(recalculatedStatsSnapshot.stats, player.id).matches}`).join(" | ")}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">CoAppearance summary</p>
            <p>
              {Object.keys(coAppearanceSummary).length
                ? Object.entries(coAppearanceSummary).map(([key, value]) => `${key}:${value}`).join(" | ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">Participation Matrix</p>
            <div className="mt-2 overflow-x-auto rounded bg-white/10">
              <table className="min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="p-2">Player</th>
                    {roundNumbers.map((round) => (
                      <th key={round} className="p-2 text-center">R{round}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerParticipationRows.map((row) => (
                    <tr key={row.player.id} className="border-b border-white/10 last:border-b-0">
                      <td className="p-2 font-black">{row.player.name}</td>
                      {row.rounds.map((value, index) => (
                        <td key={`${row.player.id}-${index}`} className="p-2 text-center">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="font-black text-lime">Stats mismatch detected</p>
            <p>{String(statsMismatch)}</p>
          </div>
          <div>
            <p className="font-black text-lime">completed matches count</p>
            <p>{String(recalculatedStatsSnapshot.completedMatchesCount)}</p>
          </div>
          <div>
            <p className="font-black text-lime">completed player slots</p>
            <p>{String(recalculatedStatsSnapshot.completedPlayerSlots)}</p>
          </div>
          <div>
            <p className="font-black text-lime">counted match IDs</p>
            <p>{recalculatedStatsSnapshot.countedMatchIds.length ? recalculatedStatsSnapshot.countedMatchIds.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">ignored match IDs with status</p>
            <p>{recalculatedStatsSnapshot.ignoredMatchIds.length ? recalculatedStatsSnapshot.ignoredMatchIds.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">player match counts from completed matches</p>
            <p>
              {selectedPlayers.length
                ? selectedPlayers.map((player) => `${player.name}:${getPlayerStat(recalculatedStatsSnapshot.stats, player.id).matches}`).join(" | ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">accumulated vs recalculated matches</p>
            <p>
              {selectedPlayers.length
                ? selectedPlayers
                    .map((player) => {
                      const accumulated = getPlayerStat(accumulatedStats, player.id).matches;
                      const recalculated = getPlayerStat(recalculatedStatsSnapshot.stats, player.id).matches;
                      return `${player.name}: ${accumulated} / ${recalculated} / diff ${accumulated - recalculated}`;
                    })
                    .join(" | ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">final match count gap</p>
            <p>{String(recalculatedStatsSnapshot.finalMatchCountGap)}</p>
          </div>
          <div>
            <p className="font-black text-lime">Available players</p>
            <p>{availablePlayers.length ? availablePlayers.map((player) => player.name).join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Unavailable players</p>
            <p>
              {unavailablePlayers.length
                ? unavailablePlayers.map((player) => `${player.name} (${sessionPlayerStatuses[player.id] ?? "active"})`).join(", ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">Left players</p>
            <p>{leftPlayers.length ? leftPlayers.map((player) => player.name).join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Deferred matches</p>
            <p>
              {deferredMatches.length
                ? deferredMatches.map(({ round, match }) => `Round ${round} Court ${match.court}`).join(", ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">Deferred player IDs/names</p>
            <p>
              {deferredPlayers.length
                ? deferredPlayers.map((player) => `${player.id}:${player.name}`).join(", ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">deferredMatchBlocks</p>
            <p>
              {deferredMatchBlocks.length
                ? deferredMatchBlocks
                    .map((block) => `${block.id} all:${idPairKey(block.allPlayerIds)} teams:${opponentIdGroupKey(block.teamAIds, block.teamBIds)}`)
                    .join(" | ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">Pending Play Later matches</p>
            <p>
              {deferredMatches.length
                ? deferredMatches.map(({ round, match }) => `Round ${round} Court ${match.court}: ${match.teamA.map((player) => player.name).join(" / ")} vs ${match.teamB.map((player) => player.name).join(" / ")}`).join(" | ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">candidate rejected because exact deferred match</p>
            <p>{generationDebug?.candidateRejectedBecauseExactDeferredMatch.length ? generationDebug.candidateRejectedBecauseExactDeferredMatch.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">candidate penalized because same 4-player group</p>
            <p>{generationDebug?.candidatePenalizedBecauseSameFourPlayerGroup.length ? generationDebug.candidatePenalizedBecauseSameFourPlayerGroup.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">exactMatchKey for current generated match</p>
            <p>{generationDebug?.generatedMatchKeys.length ? generationDebug.generatedMatchKeys.join(", ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">fourPlayerGroupKey</p>
            <p>{generationDebug?.generatedFourPlayerGroupKeys.length ? generationDebug.generatedFourPlayerGroupKeys.join(", ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">whether exact duplicate was rejected</p>
            <p>{generationDebug?.exactDuplicateCandidatesRejected.length ? generationDebug.exactDuplicateCandidatesRejected.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">whether same 4-player group was penalized</p>
            <p>{generationDebug?.sameFourPlayerGroupCandidatesPenalized.length ? generationDebug.sameFourPlayerGroupCandidatesPenalized.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">whether this is a rematch / duplicate-rematch penalty</p>
            <p>{generationDebug?.rematchPenaltyDebug.length ? generationDebug.rematchPenaltyDebug.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">partner repeat penalties</p>
            <p>{generationDebug?.partnerRepeatPenaltyDebug.length ? generationDebug.partnerRepeatPenaltyDebug.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">opponent repeat penalties</p>
            <p>{generationDebug?.opponentRepeatPenaltyDebug.length ? generationDebug.opponentRepeatPenaltyDebug.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">lastDeferredPlayerIdsForNextRound</p>
            <p>
              {lastDeferredPlayerIdsForNextRound.length
                ? `${lastDeferredPlayerIdsForNextRound.join(", ")}${lastDeferredPlayers.length ? ` (${lastDeferredPlayers.map((player) => player.name).join(", ")})` : ""}`
                : "none"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">Active players before generation</p>
            <p>{availablePlayers.length ? availablePlayers.map((player) => player.name).join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Non-deferred active players before generation</p>
            <p>{nonDeferredAvailablePlayers.length ? nonDeferredAvailablePlayers.map((player) => player.name).join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Hard exclusion would apply now</p>
            <p>{String(hardExclusionWouldApplyNow)} (required {requiredPlayersNow})</p>
          </div>
          <div>
            <p className="font-black text-lime">Hard exclusion applied last generation</p>
            <p>{generationDebug ? String(generationDebug.hardExclusionApplied) : "none yet"} {generationDebug ? `(required ${generationDebug.requiredPlayers})` : ""}</p>
          </div>
          <div>
            <p className="font-black text-lime">Players deprioritized for next round</p>
            <p>{generationDebug?.deprioritizedPlayers.length ? generationDebug.deprioritizedPlayers.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Available players used for generation</p>
            <p>{generationDebug?.availablePlayers.length ? generationDebug.availablePlayers.join(", ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">Generated round players</p>
            <p>{generationDebug?.generatedPlayers.length ? generationDebug.generatedPlayers.join(", ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">played last round</p>
            <p>{generationDebug?.playedLastRound.length ? generationDebug.playedLastRound.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">benched last round</p>
            <p>{generationDebug?.benchedLastRound.length ? generationDebug.benchedLastRound.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">consecutive bench count</p>
            <p>{generationDebug?.consecutiveBenchCountDebug.length ? generationDebug.consecutiveBenchCountDebug.join(" | ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">matches played</p>
            <p>{generationDebug?.matchesPlayedDebug.length ? generationDebug.matchesPlayedDebug.join(" | ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">total player slots</p>
            <p>{generationDebug ? String(generationDebug.totalPlayerSlots) : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">ideal target matches per player</p>
            <p>{generationDebug ? generationDebug.idealTargetMatchesPerPlayer.toFixed(2) : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">remaining rounds / remaining player slots</p>
            <p>
              {generationDebug
                ? `${generationDebug.remainingRoundsIncludingCurrent} / ${generationDebug.remainingPlayerSlots}`
                : "none yet"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">match count gap before / after round</p>
            <p>
              {generationDebug
                ? `${generationDebug.matchCountGapBefore} / ${generationDebug.matchCountGapAfter}`
                : "none yet"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">selected playing pool</p>
            <p>{generationDebug?.selectedPlayingPool.length ? generationDebug.selectedPlayingPool.join(", ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">selected fourPlayerGroupKey</p>
            <p>{generationDebug?.selectedFourPlayerGroupKey ?? "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">group used before / coAppearanceCount total</p>
            <p>
              {generationDebug
                ? `${String(generationDebug.selectedGroupUsedBefore)} / ${generationDebug.selectedGroupCoAppearanceTotal}`
                : "none yet"}
            </p>
          </div>
          <div>
            <p className="font-black text-lime">reason this group was selected</p>
            <p>{generationDebug?.selectedGroupReason ?? "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">match count distribution after selection</p>
            <p>{generationDebug?.matchCountDistributionAfterSelection.length ? generationDebug.matchCountDistributionAfterSelection.join(" | ") : "none yet"}</p>
          </div>
          <div>
            <p className="font-black text-lime">reason each selected player was selected</p>
            <p>{generationDebug?.selectedReasonDebug.length ? generationDebug.selectedReasonDebug.join(" | ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">benched this round</p>
            <p>{generationDebug?.benchedThisRound.length ? generationDebug.benchedThisRound.join(", ") : "none"}</p>
          </div>
          <div>
            <p className="font-black text-lime">reason why each benched player was benched</p>
            <p>{generationDebug?.benchReasonDebug.length ? generationDebug.benchReasonDebug.join(" | ") : "none"}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function DebugLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/10 p-2">
      <p className="text-white/50">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function RoundOverview({
  totalRounds,
  currentRound,
  replayRoundNumber,
  roundMatches,
  savedResults,
  filter,
  expandedRound,
  onFilterChange,
  onToggleRound,
  onReplayRound
}: {
  totalRounds: number;
  currentRound: number;
  replayRoundNumber: number | null;
  roundMatches: Record<number, Match[]>;
  savedResults: Record<string, SavedMatchResult>;
  filter: RoundFilter;
  expandedRound: number | null;
  onFilterChange: (filter: RoundFilter) => void;
  onToggleRound: (round: number) => void;
  onReplayRound: (round: number) => void;
}) {
  const rounds = Array.from({ length: totalRounds }, (_, index) => index + 1);
  const getRoundStatus = (round: number) => {
    const matches = roundMatches[round] ?? [];
    const results = matches.map((match) => savedResults[matchResultKey(round, match.court)]).filter(Boolean);
    const allMatchesResolved = matches.length > 0 && matches.every((match) => isResolvedResult(savedResults[matchResultKey(round, match.court)]));

    if (round === currentRound && !allMatchesResolved) return "current";
    if (matches.length === 0) return "not_started";
    if (results.some((result) => result.status === "cancelled")) return "cancelled";
    if (results.some((result) => result.status === "deferred")) return "deferred";
    if (results.some((result) => result.status === "skipped_not_started" || result.status === "skipped_result")) return "skipped";
    if (allMatchesResolved) return "completed";
    return "upcoming";
  };
  const visibleRounds = rounds.filter((round) => {
    const status = getRoundStatus(round);
    if (filter === "all") return true;
    if (filter === "completed") return status === "completed";
    if (filter === "skipped") return status === "skipped" || status === "cancelled";
    if (filter === "not_started") return status === "not_started" || status === "upcoming";
    return status === "current";
  });
  const statusLabel = (status: string) => ({
    current: "Current",
    completed: "Completed",
    skipped: "Skipped",
    deferred: "Play Later",
    cancelled: "Cancelled",
    not_started: "Not Started",
    upcoming: "Upcoming"
  }[status] ?? "Upcoming");

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">Round Overview</h2>
        <span className="rounded-full bg-mist px-3 py-1 text-xs font-black">{visibleRounds.length}/{totalRounds}</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {([
          ["all", "All"],
          ["current", "Current"],
          ["completed", "Completed"],
          ["skipped", "Skipped"],
          ["not_started", "Not Started"]
        ] as [RoundFilter, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={`h-9 shrink-0 rounded-lg px-3 text-xs font-black ${filter === id ? "bg-ink text-white" : "bg-mist text-ink/60"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {visibleRounds.map((round) => {
          const matches = roundMatches[round] ?? [];
          const status = getRoundStatus(round);
          const expanded = expandedRound === round;
          const results = matches.map((match) => savedResults[matchResultKey(round, match.court)]).filter(Boolean);
          const hasSkippedNotStarted = results.some((result) => result.status === "skipped_not_started");
          const hasDeferred = results.some((result) => result.status === "deferred");
          const hasReplayCompleted = results.some((result) => result.replayCompleted);
          const resultLabel = replayRoundNumber === round
            ? `Round ${round} Replay`
            : hasReplayCompleted
              ? `Round ${round} Replay Completed`
            : hasDeferred
              ? "Play Later"
            : hasSkippedNotStarted
              ? "Skipped - players not ready"
            : statusLabel(status);

          return (
            <div key={round} className="rounded-lg bg-mist">
              <button
                onClick={() => onToggleRound(round)}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <div>
                  <p className="text-sm font-black">Round {round}</p>
                  <p className="text-xs font-semibold text-ink/55">{matches.length ? `${matches.length} court${matches.length > 1 ? "s" : ""}` : "No matches yet"}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
                  status === "current" ? "bg-lime text-ink" : status === "cancelled" || status === "skipped" ? "bg-clay/10 text-clay" : status === "deferred" ? "bg-court/10 text-court" : "bg-white text-ink/60"
                }`}>
                  {resultLabel}
                </span>
              </button>
              {expanded && matches.length > 0 && (
                <div className="space-y-2 border-t border-ink/10 px-3 py-2">
                  {hasSkippedNotStarted && replayRoundNumber !== round && (
                    <button
                      onClick={() => onReplayRound(round)}
                      className="h-10 w-full rounded-lg bg-court text-sm font-black text-white"
                    >
                      Replay Round {round}
                    </button>
                  )}
                  {matches.map((match) => {
                    const result = savedResults[matchResultKey(round, match.court)];
                    const score = result ? matchScoreLabel(result) : "N/A";
                    const previousHistory = sessionMatchHistoryFromRounds(roundMatches, round);
                    const isRematch = previousHistory.exactMatchKeys.includes(exactMatchKey(match.teamA, match.teamB));

                    return (
                      <div key={match.court} className="rounded-lg bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black">Court {match.court}</p>
                            {isRematch && (
                              <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-black text-clay">Rematch</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-court">{score}</p>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-ink/60">
                          A: {match.teamA.map((player) => player.name.split(" ")[0]).join(" / ")}
                        </p>
                        <p className="truncate text-xs font-semibold text-ink/60">
                          B: {match.teamB.map((player) => player.name.split(" ")[0]).join(" / ")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CourtCard({
  match,
  result,
  saved,
  isRematch,
  isReplayMode,
  availablePlayers,
  leftPlayerIds,
  onScore,
  onPlayerChange,
  onMarkLeft,
  onSaveResult,
  onSkipResult,
  onPlayLater,
  onClearResult
}: {
  match: Match;
  result?: SavedMatchResult;
  saved: boolean;
  isRematch: boolean;
  isReplayMode: boolean;
  availablePlayers: Player[];
  leftPlayerIds: number[];
  onScore: (court: number, team: "scoreA" | "scoreB", value: string) => void;
  onPlayerChange: (court: number, team: "teamA" | "teamB", playerIndex: number, playerId: number) => void;
  onMarkLeft: (id: number) => void;
  onSaveResult: (match: Match) => void;
  onSkipResult: (
    match: Match,
    status: MatchResultStatus,
    unavailableIds?: number[],
    unavailableStatus?: "not_arrived" | "temporarily_unavailable"
  ) => void;
  onPlayLater: (match: Match) => void;
  onClearResult: (match: Match) => void;
}) {
  const [skipMenuOpen, setSkipMenuOpen] = useState(false);
  const [notReadyIds, setNotReadyIds] = useState<number[]>([]);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [unavailableStatus, setUnavailableStatus] = useState<"not_arrived" | "temporarily_unavailable">("not_arrived");
  const canSave = match.scoreA !== "" && match.scoreB !== "" && match.scoreA !== match.scoreB;
  const matchPlayers = [...match.teamA, ...match.teamB];
  const statusLabel = matchStatusLabel(result);
  const playedResult = isPlayedResult(result);
  const scoreLockedLabel = result && !playedResult ? "N/A" : undefined;
  const toggleNotReady = (id: number) => {
    setNotReadyIds((current) =>
      current.includes(id) ? current.filter((playerId) => playerId !== id) : [...current, id]
    );
  };

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black">Court {match.court}</h2>
          {isRematch && (
            <span className="rounded-full bg-clay/10 px-2 py-1 text-[11px] font-black text-clay">Rematch</span>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${saved ? "bg-lime" : "bg-mist"}`}>
          {saved ? statusLabel : "Doubles"}
        </span>
      </div>
      <p className="mb-2 rounded-lg bg-mist px-2 py-1 text-[11px] font-bold text-ink/55">
        Match status: {statusLabel}
      </p>
      <ScoreRow
        court={match.court}
        team="teamA"
        label="A"
        players={match.teamA}
        score={match.scoreA}
        saved={saved}
        scoreLockedLabel={scoreLockedLabel}
        editing={editingPlayers && !saved}
        availablePlayers={availablePlayers}
        leftPlayerIds={leftPlayerIds}
        onChange={(value) => onScore(match.court, "scoreA", value)}
        onPlayerChange={onPlayerChange}
        onMarkLeft={onMarkLeft}
      />
      <div className="my-2 h-px bg-ink/10" />
      <ScoreRow
        court={match.court}
        team="teamB"
        label="B"
        players={match.teamB}
        score={match.scoreB}
        saved={saved}
        scoreLockedLabel={scoreLockedLabel}
        editing={editingPlayers && !saved}
        availablePlayers={availablePlayers}
        leftPlayerIds={leftPlayerIds}
        onChange={(value) => onScore(match.court, "scoreB", value)}
        onPlayerChange={onPlayerChange}
        onMarkLeft={onMarkLeft}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setEditingPlayers((current) => !current)}
          disabled={saved || isReplayMode}
          className="h-10 rounded-lg bg-mist px-2 text-xs font-black text-ink disabled:text-ink/25"
        >
          {editingPlayers ? "Done editing" : "Edit players"}
        </button>
        <button
          onClick={() => {
            onPlayLater(match);
            setSkipMenuOpen(false);
            setEditingPlayers(false);
          }}
          disabled={saved}
          className="h-10 rounded-lg bg-mist px-2 text-xs font-black text-ink disabled:text-ink/25"
        >
          Play Later
        </button>
        <button
          onClick={() => {
            console.log("[ClubMatch] skip reason menu clicked", {
              court: match.court,
              statusBefore: result?.status ?? "not_started"
            });
            setSkipMenuOpen((current) => !current);
            setEditingPlayers(false);
          }}
          disabled={saved}
          className="h-10 rounded-lg bg-mist px-2 text-xs font-black text-ink disabled:text-ink/25"
        >
          Skip
        </button>
        <button
          onClick={() => onSaveResult(match)}
          disabled={saved || !canSave}
          className="h-10 rounded-lg bg-ink px-2 text-xs font-black text-white disabled:bg-ink/25"
        >
          {saved ? "Saved" : "Save Result"}
        </button>
      </div>
      {skipMenuOpen && !saved && (
        <div className="mt-2 rounded-lg bg-mist p-2">
          <p className="text-sm font-black">Skip reason</p>
          <div className="mt-2 grid gap-2">
            <button
              onClick={() => {
                onSkipResult(match, "skipped_result");
                setSkipMenuOpen(false);
              }}
              className="min-h-10 rounded-lg bg-white px-3 text-left text-xs font-black"
            >
              Skip result only
            </button>
            <div className="rounded-lg bg-white p-2">
              <p className="text-sm font-black">Players not ready / not arrived</p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-mist p-1">
                <button
                  onClick={() => setUnavailableStatus("not_arrived")}
                  className={`h-9 rounded-lg text-xs font-black ${unavailableStatus === "not_arrived" ? "bg-ink text-white" : "text-ink/60"}`}
                >
                  Not arrived
                </button>
                <button
                  onClick={() => setUnavailableStatus("temporarily_unavailable")}
                  className={`h-9 rounded-lg text-xs font-black ${unavailableStatus === "temporarily_unavailable" ? "bg-ink text-white" : "text-ink/60"}`}
                >
                  Temp unavailable
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {matchPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => toggleNotReady(player.id)}
                    className={`min-h-9 rounded-lg px-2 text-xs font-black ${
                      notReadyIds.includes(player.id) ? "bg-clay text-white" : "bg-mist text-ink"
                    }`}
                  >
                    {player.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  onSkipResult(match, "skipped_not_started", notReadyIds, unavailableStatus);
                  setNotReadyIds([]);
                  setSkipMenuOpen(false);
                }}
                disabled={notReadyIds.length === 0}
                className="mt-2 h-10 w-full rounded-lg bg-clay text-xs font-black text-white disabled:bg-ink/20"
              >
                Skip - players not ready
              </button>
            </div>
            <button
              onClick={() => {
                onSkipResult(match, "cancelled");
                setSkipMenuOpen(false);
              }}
              className="min-h-10 rounded-lg bg-white px-3 text-left text-xs font-black text-clay"
            >
              Cancel match
            </button>
          </div>
        </div>
      )}
      {saved && (
        <p className="mt-2 rounded-lg bg-mist px-3 py-2 text-center text-xs font-black text-ink/55">
          {playedResult ? `Final score ${matchScoreLabel(result)}` : `${matchScoreLabel(result)} - no leaderboard stats updated`}
        </p>
      )}
      {saved && (
        <button
          onClick={() => onClearResult(match)}
          className="mt-2 h-11 w-full rounded-lg bg-clay/10 text-sm font-black text-clay"
        >
          Clear result to edit match
        </button>
      )}
    </Card>
  );
}

function ScoreRow({
  court,
  team,
  label,
  players,
  score,
  saved,
  scoreLockedLabel,
  editing,
  availablePlayers,
  leftPlayerIds,
  onChange,
  onPlayerChange,
  onMarkLeft
}: {
  court: number;
  team: "teamA" | "teamB";
  label: string;
  players: Player[];
  score: string;
  saved: boolean;
  scoreLockedLabel?: string;
  editing: boolean;
  availablePlayers: Player[];
  leftPlayerIds: number[];
  onChange: (value: string) => void;
  onPlayerChange: (court: number, team: "teamA" | "teamB", playerIndex: number, playerId: number) => void;
  onMarkLeft: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-black text-white">{label}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{players.map((player) => player.name.split(" ")[0]).join(" / ")}</p>
          <p className="text-[11px] text-ink/50">
            {players.map((player) => `${player.tier} ${player.rating.toFixed(1)}`).join(" + ")}
          </p>
        </div>
        {scoreLockedLabel ? (
          <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-ink/10 bg-mist text-center text-xs font-black text-ink/45">
            {scoreLockedLabel}
          </div>
        ) : (
          <input
            value={score}
            onChange={(event) => onChange(event.target.value)}
            disabled={saved}
            inputMode="numeric"
            aria-label={`Team ${label} score`}
            placeholder="0"
            className="h-10 w-14 rounded-lg border border-ink/10 bg-mist text-center text-xl font-black outline-none focus:border-court disabled:text-ink/30"
          />
        )}
      </div>
      {editing && (
      <div className="grid gap-1">
        {players.map((player, index) => {
          const isLeft = leftPlayerIds.includes(player.id);
          const optionPlayers = availablePlayers.some((availablePlayer) => availablePlayer.id === player.id)
            ? availablePlayers
            : [player, ...availablePlayers];

          return (
            <div key={`${team}-${player.id}-${index}`} className="grid grid-cols-[1fr_auto] gap-1">
              <label className="block">
                <span className="sr-only">Edit {player.name}</span>
                <select
                  value={player.id}
                  onChange={(event) => onPlayerChange(court, team, index, Number(event.target.value))}
                  disabled={saved}
                  className="h-9 w-full rounded-lg border border-ink/10 bg-mist px-2 text-xs font-black outline-none focus:border-court disabled:text-ink/35"
                >
                  {optionPlayers.map((optionPlayer) => (
                    <option key={optionPlayer.id} value={optionPlayer.id}>
                      {optionPlayer.name}{leftPlayerIds.includes(optionPlayer.id) ? " (left)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => onMarkLeft(player.id)}
                disabled={saved || isLeft}
                className="h-9 rounded-lg bg-clay/10 px-2 text-[11px] font-black text-clay disabled:text-clay/35"
              >
                {isLeft ? "Left" : "Mark left"}
              </button>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function rankPlayers(players: Player[], stats: Record<number, SessionStat>) {
  return [...players].sort((a, b) => {
    const statA = getPlayerStat(stats, a.id);
    const statB = getPlayerStat(stats, b.id);
    const winRateA = statA.matches ? statA.wins / statA.matches : 0;
    const winRateB = statB.matches ? statB.wins / statB.matches : 0;
    const diffA = statA.pointsFor - statA.pointsAgainst;
    const diffB = statB.pointsFor - statB.pointsAgainst;

    return (
      statB.wins - statA.wins ||
      winRateB - winRateA ||
      diffB - diffA ||
      statB.matches - statA.matches ||
      b.rating - a.rating
    );
  });
}

function LeaderboardScreen({
  players,
  sessionStats,
  roundMatches,
  savedResults,
  lastCompletedSession,
  sessionFormat,
  totalRounds,
  courtCount
}: {
  players: Player[];
  sessionStats: Record<number, SessionStat>;
  roundMatches: Record<number, Match[]>;
  savedResults: Record<string, SavedMatchResult>;
  lastCompletedSession: CompletedSessionSummary | null;
  sessionFormat: SessionFormat;
  totalRounds: number;
  courtCount: number;
}) {
  const [leaderboardView, setLeaderboardView] = useState<LeaderboardView>("host");
  const [displayMode, setDisplayMode] = useState<LeaderboardDisplayMode>("standings");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const recalculatedSession = getSessionStatsFromMatches({ players, roundMatches, savedResults });
  const leaderboardStats = recalculatedSession.stats;
  const statsMismatchDetected = players.some(
    (player) => getPlayerStat(sessionStats, player.id).matches !== getPlayerStat(leaderboardStats, player.id).matches
  );
  const ranked = rankPlayers(players, leaderboardStats);
  const previousRanked = lastCompletedSession ? rankPlayers(players, lastCompletedSession.stats) : [];
  const hasCurrentStats = ranked.some((player) => getPlayerStat(leaderboardStats, player.id).matches > 0);
  const showSkillData = leaderboardView === "host" || showSkillDataToPlayers;
  const completedRounds = Object.entries(roundMatches).filter(([roundKey, matches]) =>
    matches.length > 0 && matches.every((match) => isResolvedResult(savedResults[matchResultKey(Number(roundKey), match.court)]))
  ).length;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lime">
            <BarChart3 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">Session Leaderboard</h2>
            <p className="text-sm text-ink/60">
              {leaderboardView === "host"
                ? "Tier and rating are used internally for matchmaking."
                : "Based on the current session only."}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-mist p-1">
          <button
            onClick={() => setDisplayMode("standings")}
            className={`h-11 rounded-lg text-sm font-black ${
              displayMode === "standings" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setDisplayMode("snapshot")}
            className={`h-11 rounded-lg text-sm font-black ${
              displayMode === "snapshot" ? "bg-ink text-white" : "text-ink/60"
            }`}
          >
            Snapshot
          </button>
        </div>
        {displayMode === "standings" && (
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-mist p-1">
              <button
                onClick={() => setLeaderboardView("host")}
                className={`h-11 rounded-lg text-sm font-black ${
                  leaderboardView === "host" ? "bg-ink text-white" : "text-ink/60"
                }`}
              >
                Host View
              </button>
              <button
                onClick={() => setLeaderboardView("player")}
                className={`h-11 rounded-lg text-sm font-black ${
                  leaderboardView === "player" ? "bg-ink text-white" : "text-ink/60"
                }`}
              >
                Player View
              </button>
            </div>
            <button
              onClick={() => setFullscreenOpen(true)}
              className="flex h-[52px] items-center justify-center rounded-lg bg-court px-4 text-sm font-black text-white shadow-soft"
              aria-label="Expand leaderboard"
            >
              Expand
            </button>
          </div>
        )}
      </Card>
      {!hasCurrentStats && (
        <Card>
          <p className="text-sm font-bold text-ink/60">
            Start a session and save results to populate this board.
          </p>
        </Card>
      )}
      {statsMismatchDetected && (
        <Card>
          <p className="text-sm font-black text-clay">Stats mismatch detected</p>
          <p className="mt-1 text-xs font-bold text-ink/55">Leaderboard is using recalculated saved/completed match results.</p>
        </Card>
      )}
      {displayMode === "standings" ? (
        <>
          <Card>
            <StandingsTable players={ranked} sessionStats={leaderboardStats} showSkillData={showSkillData} mode="compact" />
          </Card>
          <Card>
            <h2 className="text-lg font-black">Previous Session Summary</h2>
            {lastCompletedSession ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-ink/55">
                  Last completed session: {lastCompletedSession.totalRounds} rounds
                </p>
                {previousRanked.slice(0, 3).map((player, index) => {
                  const stat = getPlayerStat(lastCompletedSession.stats, player.id);
                  const scoreDiff = stat.pointsFor - stat.pointsAgainst;

                  return (
                    <div key={player.id} className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {index + 1}. {player.name}
                        </p>
                        <p className="text-xs font-semibold text-ink/50">
                          {stat.wins}W-{stat.losses}L - Diff {scoreDiff}
                        </p>
                      </div>
                      {showSkillData && (
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-black">Tier {player.tier}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-ink/55">
                Complete a session to save a local summary here.
              </p>
            )}
          </Card>
        </>
      ) : (
        <LeaderboardSnapshot
          players={ranked}
          sessionStats={leaderboardStats}
          sessionFormat={sessionFormat}
          completedRounds={completedRounds}
          totalRounds={totalRounds}
          courtCount={courtCount}
        />
      )}
      {fullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-mist">
          <div className="mx-auto flex h-screen w-full max-w-5xl flex-col">
            <div className="sticky top-0 z-20 border-b border-ink/10 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-court">Session Leaderboard</p>
                  <h2 className="truncate text-2xl font-black text-ink">Full standings</h2>
                </div>
                <button
                  onClick={() => setFullscreenOpen(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-white"
                  aria-label="Close leaderboard"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-3 py-3">
              <StandingsTable players={ranked} sessionStats={leaderboardStats} showSkillData={showSkillData} mode="full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardSnapshot({
  players,
  sessionStats,
  sessionFormat,
  completedRounds,
  totalRounds,
  courtCount
}: {
  players: Player[];
  sessionStats: Record<number, SessionStat>;
  sessionFormat: SessionFormat;
  completedRounds: number;
  totalRounds: number;
  courtCount: number;
}) {
  const rankClass = (index: number) => {
    if (index === 0) return "border-lime bg-lime/40";
    if (index === 1) return "border-ink/15 bg-white";
    if (index === 2) return "border-court/30 bg-court/10";
    return "border-transparent bg-mist";
  };
  const rankBadgeClass = (index: number) => {
    if (index === 0) return "bg-lime text-ink";
    if (index === 1) return "bg-white text-ink";
    if (index === 2) return "bg-court/20 text-court";
    return "bg-white text-ink/70";
  };

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-soft">
      <div className="bg-ink p-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Session Leaderboard</p>
        <h2 className="mt-1 text-2xl font-black">Snapshot</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">{sessionFormat}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">
            {completedRounds}/{totalRounds} rounds
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">
            {courtCount} {courtCount === 1 ? "court" : "courts"}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {players.map((player, index) => {
          const stat = getPlayerStat(sessionStats, player.id);
          const winRate = stat.matches ? Math.round((stat.wins / stat.matches) * 100) : 0;
          const scoreDiff = stat.pointsFor - stat.pointsAgainst;
          const scoreDiffLabel = `${scoreDiff > 0 ? "+" : ""}${scoreDiff} DIFF`;

          return (
            <div key={player.id} className={`rounded-lg border p-3 ${rankClass(index)}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${rankBadgeClass(index)}`}>
                  {index === 0 ? <Trophy size={17} /> : `#${index + 1}`}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-black">{player.name}</p>
                    <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">
                      {stat.wins}-{stat.losses}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-ink/60">
                    {stat.wins}-{stat.losses} - {winRate}% WR - {scoreDiffLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-ink/45">
                    PF {stat.pointsFor} - PA {stat.pointsAgainst}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-ink/10 px-4 py-3">
        <p className="text-center text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">
          ClubMatch Prototype - Generated from session results
        </p>
      </div>
    </section>
  );
}

function StandingsTable({
  players,
  sessionStats,
  showSkillData,
  mode
}: {
  players: Player[];
  sessionStats: Record<number, SessionStat>;
  showSkillData: boolean;
  mode: "compact" | "full";
}) {
  const gridTemplateColumns =
    mode === "full"
      ? showSkillData
        ? "44px minmax(180px, 1fr) 46px 46px 46px 56px 64px 50px 50px 78px"
        : "44px minmax(180px, 1fr) 46px 46px 46px 56px 64px 50px 50px"
      : "38px minmax(0, 1fr) 36px 36px 48px 56px";

  const minWidth = mode === "full" ? (showSkillData ? "min-w-[780px]" : "min-w-[700px]") : "min-w-0";
  const headerLabels = mode === "full" ? ["M", "W", "L", "WR", "DIFF", "PF", "PA"] : ["W", "L", "WR", "DIFF"];

  const rankAccent = (index: number) => {
    if (index === 0) return { row: "bg-lime/45", icon: "bg-lime text-ink", label: "1" };
    if (index === 1) return { row: "bg-mist", icon: "bg-white text-ink", label: "2" };
    if (index === 2) return { row: "bg-court/10", icon: "bg-court/20 text-court", label: "3" };
    return { row: "", icon: "bg-mist text-court", label: String(index + 1) };
  };

  return (
    <div className={`${mode === "full" ? "overflow-x-auto rounded-lg bg-white shadow-soft" : "overflow-hidden"}`}>
      <div className={minWidth}>
        <div
          className="sticky top-0 z-10 grid items-center gap-2 border-b border-ink/10 bg-white px-1 pb-2 text-[11px] font-black uppercase text-ink/45"
          style={{ gridTemplateColumns }}
        >
          <span>#</span>
          <span>Player</span>
          {headerLabels.map((label) => (
            <span key={label} className="text-center">{label}</span>
          ))}
          {mode === "full" && showSkillData && <span className="text-center">Skill</span>}
        </div>
        <div className="divide-y divide-ink/10">
          {players.map((player, index) => {
            const stat = getPlayerStat(sessionStats, player.id);
            const winRate = stat.matches ? Math.round((stat.wins / stat.matches) * 100) : 0;
            const scoreDiff = stat.pointsFor - stat.pointsAgainst;
            const accent = rankAccent(index);

            return (
              <div
                key={player.id}
                className={`grid min-h-14 items-center gap-2 rounded-lg px-1 py-2 text-sm ${accent.row}`}
                style={{ gridTemplateColumns }}
              >
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${accent.icon}`}>
                  {accent.label}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">{player.name}</p>
                  {showSkillData && (
                    <p className="truncate text-[11px] font-semibold text-ink/45">
                      Tier {player.tier} - Rating {player.rating.toFixed(1)}
                    </p>
                  )}
                </div>
                {mode === "full" && <span className="text-center font-black">{stat.matches}</span>}
                <span className="text-center font-black">{stat.wins}</span>
                <span className="text-center font-black">{stat.losses}</span>
                <span className="text-center font-black">{stat.matches ? `${winRate}%` : "0%"}</span>
                <span className={`text-center font-black ${scoreDiff > 0 ? "text-court" : scoreDiff < 0 ? "text-clay" : ""}`}>
                  {scoreDiff}
                </span>
                {mode === "full" && (
                  <>
                    <span className="text-center font-black">{stat.pointsFor}</span>
                    <span className="text-center font-black">{stat.pointsAgainst}</span>
                    {showSkillData && (
                      <span className="text-center text-xs font-black text-ink/60">
                        {player.tier} / {player.rating.toFixed(1)}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg bg-white p-4 shadow-soft">{children}</section>;
}

function Stat({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${dark ? "bg-white/10" : "bg-mist"}`}>
      <p className="text-xl font-black">{value}</p>
      <p className={`text-xs font-semibold ${dark ? "text-white/65" : "text-ink/55"}`}>{label}</p>
    </div>
  );
}

function StatusChip({ value, tone = "neutral" }: { value: string; tone?: "neutral" | "ready" | "warn" }) {
  const toneClass = {
    neutral: "bg-mist text-ink/70",
    ready: "bg-lime text-ink",
    warn: "bg-clay/10 text-clay"
  }[tone];

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${toneClass}`}>
      {value}
    </span>
  );
}

function MatchCountImbalanceCard({
  title = "Match count imbalance detected.",
  minMatches,
  maxMatches,
  gap,
  lowestPlayers,
  highestPlayers,
  totalPlayerSlots,
  countedPlayerSlots,
  plannedSlotsNotCounted,
  pendingReplaySummaries,
  playerCount,
  courtCount,
  totalRounds,
  perfectDistributionPossible,
  idealMatchesPerPlayer,
  reasons,
  actions
}: {
  title?: string;
  minMatches: number;
  maxMatches: number;
  gap: number;
  lowestPlayers: Player[];
  highestPlayers: Player[];
  totalPlayerSlots: number;
  countedPlayerSlots: number;
  plannedSlotsNotCounted: boolean;
  pendingReplaySummaries: { round: number; court: number; players: Player[] }[];
  playerCount: number;
  courtCount: number;
  totalRounds: number;
  perfectDistributionPossible: boolean;
  idealMatchesPerPlayer: number;
  reasons: string[];
  actions: string[];
}) {
  const nameList = (players: Player[]) => players.map((player) => player.name).join(", ") || "None";
  const hasPendingReplays = pendingReplaySummaries.length > 0;

  return (
    <div className="mt-3 rounded-lg bg-clay/10 p-3 text-clay">
      <p className="text-sm font-black">{title}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/70 p-2">
          <p className="text-lg font-black">{minMatches}</p>
          <p className="text-[10px] font-black uppercase">Lowest</p>
        </div>
        <div className="rounded-lg bg-white/70 p-2">
          <p className="text-lg font-black">{maxMatches}</p>
          <p className="text-[10px] font-black uppercase">Highest</p>
        </div>
        <div className="rounded-lg bg-white/70 p-2">
          <p className="text-lg font-black">{gap}</p>
          <p className="text-[10px] font-black uppercase">Gap</p>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-xs font-bold">
        <p>Lowest: {minMatches} matches ({nameList(lowestPlayers)})</p>
        <p>Highest: {maxMatches} matches ({nameList(highestPlayers)})</p>
        <p>
          {perfectDistributionPossible
            ? `This session has ${playerCount} players, ${courtCount} court${courtCount === 1 ? "" : "s"}, and ${totalRounds} rounds, so each player should ideally play ${idealMatchesPerPlayer} matches.`
            : `Perfect distribution is not possible with ${playerCount} players, ${courtCount} court${courtCount === 1 ? "" : "s"}, and ${totalRounds} rounds. The system will keep the gap as small as possible.`}
        </p>
        <p>Planned player slots: {totalPlayerSlots}. Counted player slots: {countedPlayerSlots}.</p>
        {plannedSlotsNotCounted && (
          <p>Not all planned slots have been counted yet.</p>
        )}
      </div>
      {hasPendingReplays && (
        <div className="mt-2 rounded-lg bg-white/70 p-2 text-xs font-bold">
          <p>
            There {pendingReplaySummaries.length === 1 ? "is" : "are"} {pendingReplaySummaries.length} pending Play Later match{pendingReplaySummaries.length === 1 ? "" : "es"} that {pendingReplaySummaries.length === 1 ? "has" : "have"} not been completed yet.
          </p>
          <div className="mt-1 space-y-1">
            {pendingReplaySummaries.map((summary) => (
              <p key={`${summary.round}-${summary.court}`}>
                Round {summary.round} Replay: {summary.players.map((player) => player.name).join(", ")}
              </p>
            ))}
          </div>
          <p className="mt-1">Complete pending replay matches first before judging final participation fairness.</p>
        </div>
      )}
      {reasons.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-black uppercase">Possible reasons</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {reasons.map((reason) => (
              <span key={reason} className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black">
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}
      {actions.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-black uppercase">Suggested action</p>
          <p className="mt-1 text-xs font-bold">{actions.join(" ")}</p>
        </div>
      )}
      <p className="mt-2 text-[10px] font-bold opacity-75">Total player slots: {totalPlayerSlots}</p>
    </div>
  );
}

function PlayerRow({
  player,
  compact = false,
  selected = false
}: {
  player: Player;
  compact?: boolean;
  selected?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar player={player} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-black">{player.name}</h3>
          {!compact && <span className="text-sm font-black">{player.rating.toFixed(1)}</span>}
        </div>
        <p className="truncate text-sm text-ink/60">Tier {player.tier} - {player.rating.toFixed(1)} - {player.style}</p>
      </div>
      {selected && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-court text-white">
          <Check size={18} />
        </div>
      )}
    </div>
  );
}

function Avatar({ player }: { player: Player }) {
  return (
    <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-court text-sm font-black text-white">
      {player.initials || initials(player.name)}
    </div>
  );
}
