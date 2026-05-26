# RACQUET CLUB MATCHMAKING APP — MVP PRODUCT SPEC V1

## 1. Product Vision

Build a mobile-first web app that helps racquet sports club organizers run fair, fun, and smooth doubles sessions without manually stressing over matchmaking.

The app is designed for sports like:

* Pickleball
* Padel
* Tennis doubles
* Badminton doubles

The first real testing ground will be Pukul Pickle Club.

---

## 2. Core Problem

Club organizers often struggle to create fair and enjoyable match pairings during live sessions.

Manual matchmaking is stressful because the host needs to consider:

* Player skill levels
* New players
* Avoiding repeated partners
* Avoiding repeated opponents
* Balancing competitiveness and fun
* Keeping beginners from feeling left out
* Keeping stronger players challenged
* Making sure everyone gets enough playtime

This is especially difficult during live sessions when players are waiting and the host does not want to use a laptop.

---

## 3. Core Value Proposition

The app helps organizers:

> Run better sessions with less chaos.

For hosts:

* Reduce mental load
* Generate matches faster
* Track player history automatically
* Avoid random guessing

For players:

* Get fairer matches
* Experience more variety
* Feel recognized through stats and leaderboard
* Stay motivated to come back

---

## 4. Product Positioning

This is not primarily a booking app.

This is a:

> Doubles session engine for racquet sports clubs.

The app focuses on:

* Matchmaking
* Session flow
* Player data
* Leaderboard
* Club experience

Booking, payment, and social feed are not part of the MVP.

---

## 5. Target User

### Primary user:

Club organizer / session host

Example:

* Pickleball club host
* Padel community organizer
* Tennis doubles coordinator
* Badminton mabar organizer

### Secondary user:

Players who join the session and view match pairings or leaderboard.

---

## 6. MVP Platform

The MVP should be:

> Mobile-first web app / PWA

Reason:

* Host should be able to run the full session from a phone
* No laptop needed
* No App Store / Play Store required
* Easy to access via browser
* Can be added to mobile home screen

---

# 7. MVP Feature Scope

## 7.1 Player Management

Host can create and manage players.

Each player should have:

* Player name
* Club
* Sport type
* Tier: A / B / C / D
* Rating score
* Total matches
* Total wins
* Total losses
* Win rate
* Created date

Tier meaning:

* Tier A = advanced / top performer
* Tier B = upper intermediate
* Tier C = intermediate / casual
* Tier D = beginner / new player

New players default to Tier C unless manually assigned.

---

## 7.2 Session Setup

Host can create a new session.

Session fields:

* Club
* Sport type
* Session date
* Number of courts
* Selected players attending the session
* Session status: active / completed

Host should be able to select players from the saved player database.

---

## 7.3 Match Generation

Host can tap:

> Generate Round

The app generates doubles matches based on:

* Player tier
* Player rating
* Partner history
* Opponent history
* Match count in the current session
* Previous round participation
* Match type distribution

The app should output:

* Round number
* Court number
* Team A
* Team B
* Match type

Example:

Round 1
Court 1
Galih + Diana vs Henhun + Anggi
Match Type: Balanced

---

## 7.4 Match Types

Each session should include a healthy mix of match types.

### Balanced Match — around 60%

Default match type.

Examples:

* A + C vs A + C
* B + D vs B + D
* A + D vs A + D

Purpose:

* Keep matches fair
* Protect beginners
* Keep session playable

---

### Same-Tier Competitive Match — around 25%

Examples:

* A + A vs A + A
* B + B vs B + B
* C + C vs C + C

Purpose:

* Give players a “fair fight”
* Create competitive moments
* Let players feel evenly matched

Tier D same-tier matches are allowed, but should not be too frequent.

---

### Fun / Flexible Match — around 15%

More relaxed and flexible.

Purpose:

* Social reset
* Reduce monotony
* Keep the session fun and less robotic

---

# 8. Matchmaking Rules

## Rule 1 — Balance is the default

Most matches should feel balanced and playable.

Avoid extreme mismatch such as:

* A + A vs D + D

Prefer balanced combinations such as:

* A + C vs A + C
* B + D vs B + D
* A + D vs A + D

---

## Rule 2 — Same-tier matches are allowed

The system should not force every match to be mixed-tier.

Same-tier matches are useful because players sometimes want to feel:

> “This is a balanced fight.”

Same-tier competitive matches should be intentionally included, but not dominate the session.

---

## Rule 3 — Protect beginners without isolating them

Tier D players should not constantly face high-tier stacked matches.

Avoid situations where a beginner feels they have no chance to contribute.

However, Tier D players should still get variety and should not be locked only with other beginners.

---

## Rule 4 — Avoid repeated partners

The app should avoid repeating the same partner too often in one session.

Recommended:

* Same partner max 1 time if possible
* Repetition allowed only if player count makes it unavoidable

---

## Rule 5 — Avoid repeated opponents

The app should avoid the same four-player combination or same opponent groups too often.

Repetition is allowed only if unavoidable.

---

## Rule 6 — Fair playtime

The app should prioritize players with fewer matches in the current session.

No player should sit out too long compared to others.

---

## Rule 7 — Avoid streak bias

The app should avoid giving a player:

* Too many very hard matches in a row
* Too many easy matches in a row
* Too many same match types in a row

The goal is a good experience curve.

---

## Rule 8 — Manual override is required

The system should help the host, not force the host.

Host must be able to:

* Swap players
* Edit teams
* Regenerate round
* Skip a player
* Mark player as leaving early

Manual adjustment is part of the product, not a failure.

---

# 9. Score Input

After each match, host can input:

* Team A score
* Team B score

The app should determine:

* Winner
* Loser
* Points scored
* Score difference

The result should update:

* Player session stats
* Player total stats
* Leaderboard
* Rating score

---

# 10. Session Leaderboard

The MVP should include a simple leaderboard.

Metrics:

* Matches
* Wins
* Losses
* Win rate
* Average points
* Score difference

Leaderboard should reward both:

* Strong performance
* Enough participation

Avoid ranking players purely by win rate because a player with only a few matches can appear unfairly high.

Recommended ranking logic:

1. Wins
2. Win rate
3. Score difference
4. Matches played

Optional:

* Mark players with low match count as “Provisional”

---

# 11. Recognition Layer

The MVP can include basic recognition to make players feel appreciated.

Initial recognition features:

* Session MVP
* Most Improved
* Most Active
* Top 3 Session Leaders

Purpose:

> Make more players feel seen, not only the strongest players.

This supports the club’s social and retention goals.

---

# 12. Player Rating

Each player should have a rating score.

Initial default rating:

* 3.0

New player adjustment:

* New players should adjust faster after their first few matches.

Rating is mainly used for matchmaking, not necessarily displayed publicly.

Purpose:

* Improve future match quality
* Help assign tiers
* Reduce random guessing

---

# 13. Tier Assignment

Tier can be assigned manually or semi-automatically.

Base structure:

* A = advanced
* B = upper intermediate
* C = intermediate / casual
* D = beginner

New players:

* Default to Tier C
* Adjust after 2–3 matches based on observation and performance

The host can manually override tier if the system does not reflect real skill.

System principle:

> Tier is a matchmaking guide, not a permanent label.

---

# 14. Host View

The host should be able to manage everything from mobile.

Main host screens:

## Home

* Active session
* New session button
* Recent sessions

## Players

* Player list
* Add player
* Edit tier
* View stats

## Session Setup

* Select attending players
* Set number of courts
* Start session

## Match Generator

* Generate round
* View court assignments
* Swap players
* Regenerate round

## Score Input

* Input score per court
* Save result
* Move to next round

## Leaderboard

* Session leaderboard
* Top players
* Recognition

---

# 15. Player View

Players can open a read-only link.

Player view should show:

* Current round
* Court assignment
* Team A vs Team B
* Session leaderboard

Players should not be able to edit matches or scores.

Optional later:

* QR code for session view

---

# 16. Database Entities

Core entities:

## Clubs

* id
* name
* sport_type
* created_at

## Players

* id
* club_id
* name
* tier
* rating
* total_matches
* total_wins
* total_losses
* created_at

## Sessions

* id
* club_id
* sport_type
* date
* number_of_courts
* status
* created_at

## Session Players

* id
* session_id
* player_id
* matches_played
* wins
* losses
* points_for
* points_against
* score_diff

## Matches

* id
* session_id
* round_number
* court_number
* match_type
* status

## Match Players

* id
* match_id
* player_id
* team
* position

## Match Results

* id
* match_id
* team_a_score
* team_b_score
* winner_team
* saved_at

## Rating History

* id
* player_id
* session_id
* match_id
* rating_before
* rating_after

## Partner History

* id
* club_id
* player_1_id
* player_2_id
* times_partnered

## Opponent History

* id
* club_id
* player_1_id
* player_2_id
* times_opposed

---

# 17. What MVP Should NOT Include Yet

Do not build these in MVP:

* Payment system
* Booking system
* Chat
* Social feed
* Tournament bracket
* Native mobile app
* Public player profiles
* Advanced AI assistant
* Multi-role permission complexity
* Complex ELO display
* Ads
* Marketplace

Reason:

> MVP should focus only on helping the host run better sessions.

---

# 18. Success Metrics

The MVP is successful if:

* Host can run a session fully from mobile
* Match generation takes less than 1 minute
* Manual pairing stress is reduced
* Players feel the matches are fair enough
* Players feel the session has better flow
* Host wants to use it again next session
* At least one other club organizer wants to try it

---

# 19. MVP Development Phases

## Phase 1 — Internal Prototype

Use Pukul Pickle Club only.

Build:

* Player database
* Session setup
* Match generator
* Score input
* Simple leaderboard

Goal:

* Replace spreadsheet during live session

---

## Phase 2 — Private Beta

Test with 1–3 other clubs.

Add:

* Club login
* Cleaner player view
* Better manual override
* More stable leaderboard

Goal:

* Validate if other organizers feel the same pain

---

## Phase 3 — Early Paid Version

Add:

* Subscription per club
* Custom club branding
* Export session report
* Advanced leaderboard
* Sport-specific settings

Goal:

* See if organizers are willing to pay

---

# 20. Product Principle

The app should not try to create mathematically perfect matches.

The app should create sessions that feel:

* Fair
* Playable
* Fun
* Social
* Smooth

Final principle:

> The goal is not perfect matchmaking. The goal is a better club experience.
