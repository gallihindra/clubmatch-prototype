export type Player = {
  id: number;
  name: string;
  initials: string;
  tier: "A" | "B" | "C" | "D";
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  availability: "Ready" | "Warm-up" | "Later";
  style: string;
  notes?: string;
  genderCategory?: "male" | "female";
};

export type Match = {
  court: number;
  teamA: Player[];
  teamB: Player[];
  scoreA: string;
  scoreB: string;
};

export const demoPlayers: Player[] = [
  { id: 1, name: "Maya Tan", initials: "MT", tier: "A", rating: 4.7, wins: 18, losses: 6, streak: 4, availability: "Ready", style: "Counterpuncher", genderCategory: "female" },
  { id: 2, name: "Theo Banks", initials: "TB", tier: "A", rating: 4.4, wins: 15, losses: 7, streak: 2, availability: "Ready", style: "Net pressure", genderCategory: "male" },
  { id: 3, name: "Leah Ortiz", initials: "LO", tier: "B", rating: 4.2, wins: 13, losses: 9, streak: 1, availability: "Warm-up", style: "Baseline pace", genderCategory: "female" },
  { id: 4, name: "Samir Patel", initials: "SP", tier: "B", rating: 4.1, wins: 12, losses: 8, streak: 3, availability: "Ready", style: "All court", genderCategory: "male" },
  { id: 5, name: "Nora Kim", initials: "NK", tier: "C", rating: 3.9, wins: 11, losses: 10, streak: 0, availability: "Ready", style: "Drop shots", genderCategory: "female" },
  { id: 6, name: "Jon Reed", initials: "JR", tier: "C", rating: 3.8, wins: 9, losses: 9, streak: 2, availability: "Warm-up", style: "Serve plus one", genderCategory: "male" },
  { id: 7, name: "Ava Brooks", initials: "AB", tier: "D", rating: 3.6, wins: 8, losses: 12, streak: 1, availability: "Later", style: "Defense", genderCategory: "female" },
  { id: 8, name: "Elio Cruz", initials: "EC", tier: "D", rating: 3.5, wins: 7, losses: 11, streak: 0, availability: "Ready", style: "Heavy spin", genderCategory: "male" }
];

export const players = demoPlayers;

export const defaultSelectedIds = [1, 2, 3, 4, 5, 6];

export function initials(name: string) {
  const generated = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return generated || "P";
}

export function rotatePlayers(selectedPlayers: Player[], roundNumber: number) {
  const rotated = selectedPlayers.map((_, index, list) => {
    const offset = (index + roundNumber - 1) % list.length;
    return list[offset];
  });

  return rotated;
}

export function getRoundPlayers(selectedPlayers: Player[], roundNumber: number, courtCount: number) {
  const rotated = rotatePlayers(selectedPlayers, roundNumber);
  const maxCourts = Math.floor(selectedPlayers.length / 4);
  const activeCourts = Math.min(courtCount, maxCourts);
  const playersPlaying = rotated.slice(0, activeCourts * 4);
  const benchedPlayers = rotated.slice(activeCourts * 4);

  return {
    activeCourts,
    playersPlaying,
    benchedPlayers
  };
}

export function buildRound(selectedPlayers: Player[], roundNumber: number, courtCount: number): Match[] {
  const { playersPlaying } = getRoundPlayers(selectedPlayers, roundNumber, courtCount);
  const matches: Match[] = [];

  for (let i = 0; i < playersPlaying.length; i += 4) {
    matches.push({
      court: matches.length + 1,
      teamA: [playersPlaying[i], playersPlaying[i + 3]],
      teamB: [playersPlaying[i + 1], playersPlaying[i + 2]],
      scoreA: "",
      scoreB: ""
    });
  }

  return matches;
}
