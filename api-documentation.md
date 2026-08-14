# BreatheSafe API Documentation

All endpoints are Next.js App Router route handlers under `src/app/api/`, running on the
Node runtime. Responses are JSON.

## Conventions

**Authentication.** Every endpoint except `POST /api/auth/signup`, the NextAuth handler,
and `GET /api/aqi/*` requires a valid NextAuth session cookie. Protected handlers call
`requireUserId()` and return `401 {"error":"Unauthorized"}` before touching the database.
All user-owned queries are filtered by the session `userId` — a user can never read or
mutate another user's locations, alerts, or profile.

**Errors.** Always `{"error": "<human-readable message>"}` with an appropriate status.
Messages are safe to render directly in the UI.

| Status | Meaning |
| --- | --- |
| `400` | Missing or malformed parameters |
| `401` | No session |
| `404` | Resource not found, or not owned by this user |
| `409` | Conflict (e.g. email already registered) |
| `502` | Upstream provider (Google / Groq) failed or has no data for this location |

**AQI scale.** Every `aqi` value is on the US EPA 0–500 scale (higher = worse). See the
README's "scale trap" section for why this is not the same as Google's Universal AQI.

---

## Authentication

### `POST /api/auth/signup`

Creates an account. Public.

```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "atleast8chars" }
```

**`201`** `{ "user": { "id": "...", "name": "Asha Rao", "email": "asha@example.com" } }`

**`400`** invalid email or password under 8 characters · **`409`** email already registered

Passwords are hashed with bcrypt and never returned by any endpoint.

### `POST|GET /api/auth/[...nextauth]`

NextAuth credentials provider. Handles `signin`, `signout`, `session`, and `csrf`.
Sessions are JWTs carrying `healthProfile` and `language` so personalised rendering needs
no extra round trip.

---

## Air quality

### `GET /api/aqi/current`

The primary read. Live conditions, pollutants, risk classification, Google's health
recommendations, and the 48-hour forecast in both daily and hourly form.

| Param | Required | Notes |
| --- | --- | --- |
| `city` | one of | Free-text place name, forward-geocoded |
| `lat` + `lng` | one of | Coordinates; the display name is reverse-geocoded |

```
GET /api/aqi/current?city=Delhi
GET /api/aqi/current?lat=28.6139&lng=77.2090
```

**`200`**

```json
{
"aqi": 121,
"dominantPollutant": "pm10",
"city": { "name": "Delhi, India", "geo": [28.6139, 77.209] },
"updatedAt": "2026-08-14T09:00:00Z",
"pollutants": { "pm25": 48, "pm10": 148, "o3": 22, "no2": 31, "so2": 6, "co": 700 },
"forecast": {
"daily": { "pm25": [{ "day": "2026-08-14", "avg": 118, "min": 84, "max": 163 }] },
"hourly": [{ "dateTime": "2026-08-14T09:00:00Z", "aqi": 121 }]
},
"risk": {
"level": "unhealthy_sensitive",
"label": "Unhealthy for Sensitive Groups",
"color": "#f97316",
"bgColor": "#ffedd5",
"emoji": "",
"description": "Sensitive groups may experience health effects..."
},
"healthRecommendations": { "generalPopulation": "...", "children": "..." }
}
```

`forecast.hourly` is the raw 48-point series that feeds clean-air-window detection
(`src/lib/clean-air-windows.ts`); `forecast.daily` is the collapsed shape the forecast
board renders. If the forecast call fails, `hourly` is `[]` and `daily.pm25` is `[]` —
current conditions still return `200`.

**`400`** neither `city` nor `lat`/`lng` · **`502`** geocoding failed, or no coverage

### `GET /api/aqi/forecast?city=<name>`

Forecast only, without the current-conditions round trip.

**`200`** `{ "forecast": { "pm25": [{ "day": "2026-08-14", "avg": 118, "min": 84, "max": 163 }] } }`

### `GET /api/aqi/history?locationId=<id>&days=<7|30>`

Stored snapshots for a saved location, oldest first. Requires auth and ownership.

**`200`** `{ "history": [{ "timestamp": "2026-08-13T10:00:00Z", "aqi": 96, "pollutants": {} }] }`

History is populated two ways: a one-time backfill from Google's `history:lookup` when a
location's series is sparse, then opportunistic hourly snapshots written whenever the
location is fetched. Neither requires a cron job.

### `GET /api/aqi/search?q=<query>`

Place autocomplete for the search box.

**`200`** `{ "places": [{ "name": "Delhi, India", "lat": 28.6139, "lng": 77.209 }] }`

### `GET /api/aqi/heatmap-tile/{mapType}/{z}/{x}/{y}`

Server-side proxy for Google's AQI raster tiles, so `GOOGLE_API_KEY` never reaches the
browser. `mapType` is a Google heatmap style such as `UAQI_INDIGO_PERSIAN` or `US_AQI`.
Returns `image/png`, cached at the edge.

---

## Locations

### `GET /api/locations`

All active saved locations for the session user, each enriched with live conditions. This
handler also drives two background behaviours per location: `maybeStoreSnapshot()` (writes
an hourly snapshot if the last one is stale) and `backfillHistoryIfSparse()` (pulls up to
30 days of real history on first sight). Alert evaluation runs here too.

**`200`**

```json
{
"locations": [
{
"_id": "66f...",
"name": "Home",
"city": "Delhi",
"lat": 28.6139,
"lng": 77.209,
"alertThreshold": 100,
"current": { "aqi": 121, "dominantPollutant": "pm10", "risk": { "label": "Unhealthy for Sensitive Groups" } }
}
]
}
```

A location whose upstream fetch fails is returned with `current: null` rather than failing
the whole request.

### `POST /api/locations`

```json
{ "name": "Child's school", "city": "Delhi", "lat": 28.6139, "lng": 77.209, "alertThreshold": 80 }
```

**`201`** the created location · **`400`** missing `name`/`lat`/`lng`

`alertThreshold` defaults to `100` (the top of the Moderate band).

### `PATCH /api/locations/{id}`

Updates `name`, `alertThreshold`, or `isActive`. **`404`** if not owned by the session user.

### `DELETE /api/locations/{id}`

Soft-deletes by setting `isActive: false`, preserving the snapshot history.

---

## Alerts

### `GET /api/alerts?severity=<level>&unread=<bool>`

Alerts for the session user, newest first, with `locationId` populated to `{ name }`.

**`200`**

```json
{
"alerts": [
{
"_id": "66f...",
"type": "threshold_exceeded",
"severity": "warning",
"title": "Home: AQI crossed your threshold",
"message": "AQI is 121, above your alert threshold of 100. Sensitive groups may experience health effects.",
"aqiValue": 121,
"read": false,
"createdAt": "2026-08-14T09:02:00Z",
"locationId": { "name": "Home" }
}
]
}
```

### `POST /api/alerts` — `{ "markAllRead": true }`

Marks every unread alert read. **`200`** `{ "updated": 4 }`

### `POST /api/alerts/{id}/read`

Marks one alert read.

### `POST /api/alerts/check`

Re-evaluates every saved location and creates any newly triggered alerts. Idempotent
within the cooldown window, so it's safe to call from a Vercel Cron entry.

**Alert rules** (`src/lib/alerts.ts`)

| Type | Trigger |
| --- | --- |
| `threshold_exceeded` | Current AQI ≥ the location's `alertThreshold` |
| `rapid_change` | AQI moved ≥ 50 points versus the previous snapshot, in either direction |
| `forecast_warning` | Reserved for forecast-driven warnings |

**Severity** is derived from the AQI value: `info` ≤ 100, `warning` > 100, `danger` > 200,
`emergency` > 300. A 3-hour per-(location, type) cooldown prevents alert spam — the single
most important property for a notification feed anyone will keep enabled.

---

## Community reports

### `GET /api/community?lat=<n>&lng=<n>&radius=<km>`

Active reports near a point, via a `$nearSphere` query on the `2dsphere` index. `radius`
defaults to 10 km. `CommunityReport.init()` is awaited first so the geo index is
guaranteed built before the query runs.

**`200`**

```json
{
"reports": [
{
"_id": "66f...",
"userName": "Asha",
"type": "burning_waste",
"severity": "high",
"description": "Open waste burning near the market",
"lat": 28.61,
"lng": 77.2,
"upvotes": 4,
"hasUpvoted": false,
"createdAt": "2026-08-14T08:00:00Z"
}
]
}
```

### `POST /api/community`

```json
{ "type": "smoke", "severity": "medium", "description": "Heavy smoke", "lat": 28.61, "lng": 77.2 }
```

`type` ∈ `smoke | burning_waste | industrial_emission | dust_storm | chemical_smell | other`,
`severity` ∈ `low | medium | high`, `description` ≤ 500 chars. Reports carry a 24-hour TTL
so the map reflects what's happening *now*.

### `POST /api/community/{id}/upvote`

Toggles the session user's upvote. **`200`** `{ "upvotes": 5, "hasUpvoted": true }`

---

## Route planning

### `POST /api/route/directions`

```json
{ "start": { "lat": 28.61, "lng": 77.2 }, "end": { "lat": 28.65, "lng": 77.25 }, "mode": "walking" }
```

Fetches a real route from Google Directions, decodes the polyline, samples AQI along the
actual road geometry (not a straight line), and scores each sample.

**`200`**

```json
{
"path": [[28.61, 77.2], [28.612, 77.203]],
"distanceKm": 5.4,
"durationMin": 62,
"samples": [{ "lat": 28.61, "lng": 77.2, "aqi": 118 }],
"worstAqi": 156,
"averageAqi": 124
}
```

If Directions is unavailable, the planner degrades to a straight-line sample set and the
UI draws a dashed line to signal the difference.

---

## Pollen

### `GET /api/pollen?lat=<n>&lng=<n>`

**`200`** `{ "types": [{ "code": "GRASS", "displayName": "Grass", "indexValue": 2, "category": "Low" }] }`

Google's Pollen product has real geographic gaps (India, among others). That case returns
`200` with `{"types": []}` rather than an error — an empty state in the UI, not a failure
banner. Genuine failures still return `502`.

---

## User profile

### `GET /api/user/profile` · `PATCH /api/user/profile`

```json
{
"healthProfile": {
"conditions": ["asthma", "children"],
"ageGroup": "adult",
"activityLevel": "active"
},
"language": "hi"
}
```

`conditions` ∈ `asthma | copd | heartDisease | allergies | pregnancy | elderly | children`,
`ageGroup` ∈ `child | adult | senior`, `activityLevel` ∈ `sedentary | moderate | active | athlete`.

This document is the input to every personalised output in the app: guidance thresholds,
mask class, inhaled-dose multipliers, and the clean-air-window AQI ceiling.

---

## AI assistant

### `POST /api/ai/chat`

```json
{
"message": "should I run this evening?",
"history": [{ "role": "user", "text": "hi" }, { "role": "model", "text": "Hi Asha!" }],
"context": { "cityName": "Delhi", "aqi": 121, "riskLabel": "...", "dominantPollutant": "pm10", "pollutants": {} },
"coords": { "lat": 28.61, "lng": 77.2 }
}
```

**`200`** `{ "reply": "...", "resolvedContext": { "cityName": "Bhopal", "aqi": 88, ... } }`

The handler grounds the model before calling it, resolving live AQI in this order:

1. `context` supplied by the client (a city already on screen)
2. A saved location or place name mentioned in `message` — matched, else geocoded
3. The browser `coords`, reverse-geocoded for a display name

Whatever it resolves is returned as `resolvedContext` so the UI can show which city the
assistant is actually talking about. The system prompt carries the user's name, health
profile, and saved locations, and explicitly forbids the model from saying it will
"simulate" or "try to find" data — if no location resolves, it must ask for one.

History is capped at 10 turns and `message` at 500 characters.

**`400`** missing or oversized message · **`502`** Groq unavailable
