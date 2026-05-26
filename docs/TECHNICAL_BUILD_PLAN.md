
1. Build Goal

Build a mobile-first web app / PWA that allows a club host to run a doubles racquet sports session fully from a phone.

The MVP should focus on:

* Player database
* Session setup
* Match generation
* Score input
* Session leaderboard
* Basic player view

The app should prioritize speed, simplicity, and smooth live-session usage.

⸻

2. Recommended Tech Stack

Frontend

Next.js + React

Reason:

* Good for web app MVP
* Easy to deploy
* Mobile-first UI friendly
* Works well with Vercel
* Easy to evolve into PWA

Styling

Tailwind CSS

Reason:

* Fast UI development
* Easy mobile responsive design
* Clean modern card-based layout

Database

Supabase Postgres

Reason:

* Proper relational database
* Easy table structure
* Built-in auth
* Free tier available
* Better long-term than Google Sheets

Authentication

MVP options:

Phase 1

Simple host login only.

Phase 2

Supabase Auth with email login.

For the first internal prototype, auth can be very simple because only the host will use it.

Hosting

Vercel

Reason:

* Easy deployment for Next.js
* Free tier available
* Fast iteration

⸻

3. MVP App Structure

Main Screens

1. Home

Purpose:

* Quick access to active session
* Create new session
* View recent sessions

Content:

* Active session card
* New Session button
* Recent sessions list

⸻

2. Players

Purpose:

* Manage player database

Features:

* View all players
* Add player
* Edit player
* Update tier
* View basic stats

Player fields:

* Name
* Tier
* Rating
* Matches
* Wins
* Losses
* Win rate

⸻

3. New Session

Purpose:

* Start a new club session

Fields:

* Sport type
* Date
* Number of courts
* Attending players

Actions:

* Start Session

⸻

4. Active Session

Purpose:

* Main host control screen during live session

Features:

* Current round
* Court assignments
* Generate Round button
* Edit / swap players
* Input score
* Save result
* Next round
* Mark player as left

This is the most important screen.

⸻

5. Score Input

Purpose:

* Quickly enter match result

Fields:

* Team A score
* Team B score

Actions:

* Save score
* Update player stats
* Update leaderboard
* Update rating

⸻

6. Leaderboard

Purpose:

* Show session performance

Metrics:

* Matches
* Wins
* Losses
* Win rate
* Average points
* Score difference

Ranking logic:

1. Wins
2. Win rate
3. Score difference
4. Matches played

Low match count players can be marked as “Provisional”.

⸻

7. Player View

Purpose:

* Read-only link for players

Shows:

* Current round
* Court assignment
* Team A vs Team B
* Session leaderboard

Players cannot edit anything.

⸻

4. Database Schema V1

clubs

id uuid primary key
name text not null
sport_type text
created_at timestamp default now()

⸻

players

id uuid primary key
club_id uuid references clubs(id)
name text not null
tier text check (tier in ('A', 'B', 'C', 'D'))
rating numeric default 3.0
total_matches integer default 0
total_wins integer default 0
total_losses integer default 0
total_points_for integer default 0
total_points_against integer default 0
created_at timestamp default now()
updated_at timestamp default now()

⸻

sessions

id uuid primary key
club_id uuid references clubs(id)
sport_type text
session_date date
number_of_courts integer default 1
status text check (status in ('active', 'completed', 'cancelled')) default 'active'
current_round integer default 0
created_at timestamp default now()
updated_at timestamp default now()

⸻

session_players

id uuid primary key
session_id uuid references sessions(id)
player_id uuid references players(id)
status text check (status in ('active', 'left', 'bench')) default 'active'
matches_played integer default 0
wins integer default 0
losses integer default 0
points_for integer default 0
points_against integer default 0
score_diff integer default 0
created_at timestamp default now()

⸻

matches

id uuid primary key
session_id uuid references sessions(id)
round_number integer not null
court_number integer not null
match_type text check (match_type in ('balanced', 'same-tier', 'fun'))
status text check (status in ('pending', 'completed', 'cancelled')) default 'pending'
team_a_score integer
team_b_score integer
winner_team text check (winner_team in ('A', 'B'))
created_at timestamp default now()
updated_at timestamp default now()

⸻

match_players

id uuid primary key
match_id uuid references matches(id)
player_id uuid references players(id)
team text check (team in ('A', 'B'))
position integer
created_at timestamp default now()

⸻

rating_history

id uuid primary key
player_id uuid references players(id)
session_id uuid references sessions(id)
match_id uuid references matches(id)
rating_before numeric
rating_after numeric
created_at timestamp default now()

⸻

partner_history

id uuid primary key
club_id uuid references clubs(id)
player_1_id uuid references players(id)
player_2_id uuid references players(id)
times_partnered integer default 0
updated_at timestamp default now()

⸻

opponent_history

id uuid primary key
club_id uuid references clubs(id)
player_1_id uuid references players(id)
player_2_id uuid references players(id)
times_opposed integer default 0
updated_at timestamp default now()

⸻

5. API / Backend Functions V1

Player APIs

createPlayer

Input:

* club_id
* name
* tier
* rating optional

Output:

* created player

⸻

updatePlayer

Input:

* player_id
* name optional
* tier optional
* rating optional

Output:

* updated player

⸻

getPlayersByClub

Input:

* club_id

Output:

* player list

⸻

Session APIs

createSession

Input:

* club_id
* sport_type
* session_date
* number_of_courts
* selected_player_ids

Actions:

* create session
* create session_players rows

Output:

* session

⸻

getActiveSession

Input:

* club_id

Output:

* active session with players and current matches

⸻

markPlayerLeft

Input:

* session_id
* player_id

Action:

* update session_players.status = left

Output:

* updated session player

⸻

Match APIs

generateRound

Input:

* session_id

Actions:

* get active session players
* get player tiers and ratings
* get current session history
* get global partner/opponent history
* decide match type
* generate valid matches
* save matches
* save match_players
* increment session current_round

Output:

* generated round matches

⸻

regenerateRound

Input:

* session_id
* round_number

Actions:

* delete pending matches for that round
* generate again

Output:

* regenerated matches

⸻

swapPlayers

Input:

* match_id
* player_a_id
* player_b_id

Action:

* swap players between teams or courts

Output:

* updated match

⸻

saveScore

Input:

* match_id
* team_a_score
* team_b_score

Actions:

* update match status to completed
* determine winner
* update session player stats
* update global player stats
* update rating
* update partner history
* update opponent history

Output:

* completed match result

⸻

Leaderboard APIs

getSessionLeaderboard

Input:

* session_id

Output:
Sorted player stats by:

1. Wins
2. Win rate
3. Score difference
4. Matches played

Include:

* player name
* matches
* wins
* losses
* win rate
* avg points
* score diff
* provisional flag

⸻

6. Matchmaking Engine V1

The engine should use a penalty-based system.

For every possible group of 4 players, evaluate all 3 possible team combinations.

Factors

Partner repetition penalty

If two players have partnered before in the same session, add penalty.

Suggested:

penalty += sessionPartnerRepeatCount * 100;

⸻

Opponent repetition penalty

If same group of 4 players already played together, add penalty.

Suggested:

penalty += opponentRepeatCount * 150;

⸻

Skill balance penalty

Compare total rating of Team A vs Team B.

const skillDiff = Math.abs(teamAScore - teamBScore);
penalty += skillDiff * 5;

⸻

Playtime fairness penalty

Prioritize players with fewer matches.

penalty += totalMatchesPlayedByGroup * 2;

⸻

Tier mismatch penalty

Avoid extreme mismatch.

Example:

* A + A vs D + D = high penalty
* A + C vs A + C = low penalty
* B + D vs B + D = low penalty

⸻

Beginner protection penalty

If a Tier D player is placed in a match where they are heavily outmatched, add penalty.

⸻

Streak bias penalty

If a player has had too many difficult or too easy matches in a row, add penalty.

This can be added later after the basic engine works.

⸻

7. Match Type Selection

Each round should have a match type.

Target distribution:

* Balanced: 60%
* Same-tier: 25%
* Fun: 15%

Simple implementation:

const pattern = [
  'balanced',
  'balanced',
  'same-tier',
  'balanced',
  'fun'
];

Then choose:

matchType = pattern[(roundNumber - 1) % pattern.length];

This keeps the session varied and predictable.

⸻

8. Match Type Logic

Balanced Match

Preferred combinations:

* A + C vs A + C
* A + D vs A + D
* B + D vs B + D
* B + C vs B + C

Goal:

* fair
* playable
* beginner-safe

⸻

Same-Tier Match

Preferred combinations:

* A + A vs A + A
* B + B vs B + B
* C + C vs C + C
* D + D vs D + D only sometimes

Goal:

* competitive moment
* players feel evenly matched

⸻

Fun Match

More flexible.

Lower repetition penalties slightly.

Allow more variety.

Goal:

* social reset
* avoid robotic feeling

⸻

9. Rating Update V1

Use simple ELO-like update.

Default rating:

3.0

Expected score:

expectedA = 1 / (1 + Math.pow(10, (avgB - avgA) / 2));

Actual:

actualA = teamAScore > teamBScore ? 1 : 0;

K-factor:

K = 0.5

For new players:

K = 1.2

Update:

newRating = oldRating + K * (actual - expected)

Rating is mostly for matchmaking, not public ego.

⸻

10. Leaderboard Logic V1

Session Stats

For each player:

matches = wins + losses
winRate = wins / matches
avgPoints = pointsFor / matches
scoreDiff = pointsFor - pointsAgainst

Ranking Sort

sort by:
1. wins desc
2. winRate desc
3. scoreDiff desc
4. matches desc

Provisional Rule

If player has fewer than minimum matches, mark:

Provisional

Recommended minimum:

minMatches = 4

For early small sessions, this can be flexible.

⸻

11. UI Design Principles

Mobile-first

The app should be designed for phone usage first.

Important:

* large buttons
* clean cards
* minimal typing
* no complex tables during live session
* quick score input
* easy player checklist

⸻

Host View Priority

The host is the main user.

The app should reduce host stress.

Every important action should be easy to do with one hand.

⸻

Player View Simplicity

Players only need:

* who they play with
* which court
* current leaderboard

No unnecessary complexity.

⸻

12. Build Phases

Phase 0 — Static Prototype

Goal:
Test the UX.

Build:

* static mobile UI
* mock players
* mock session
* mock generated matches

No database yet.

⸻

Phase 1 — Local MVP

Goal:
Core app works locally.

Build:

* player CRUD with mock/local state
* session setup
* generate round with mock data
* input score
* session leaderboard

⸻

Phase 2 — Database MVP

Goal:
Persistent data.

Build:

* Supabase tables
* player database
* session database
* save matches
* save scores
* leaderboard from DB

⸻

Phase 3 — Internal Club Test

Goal:
Use at Pukul Pickle session.

Test:

* can host run full session from phone?
* is generate round fast enough?
* are manual overrides easy?
* do players understand player view?

⸻

Phase 4 — Private Beta

Goal:
Let 1–3 other clubs test.

Add:

* basic club login
* read-only player links
* better manual override
* export session result

⸻

13. First Codex Task

When ready, the first Codex task should be small.

Prompt:

Build a mobile-first Next.js prototype for a racquet sports club matchmaking app.
Use mock data only.
Create these screens:
1. Home
2. Players
3. New Session
4. Active Session
5. Leaderboard
The Active Session screen should allow:
- viewing current players
- generating a mock round
- showing court assignments
- entering scores
- moving to the next round
Use Tailwind CSS with clean card-based mobile-first UI.
Do not connect a database yet.
Do not build auth yet.
Do not build payment, booking, chat, or social feed.

⸻

14. Product Principle

The technical system should support the club experience.

The goal is not to create mathematically perfect matches.

The goal is to help the host create sessions that feel:

* fair
* playable
* fun
* social
* smooth

Final principle:

The app should make the host feel in control without making the session feel robotic.