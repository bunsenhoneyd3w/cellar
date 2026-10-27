# Cellar: Project Brief

Owner: Seth
Created: October 26, 2026
Status: Planned, not started

## 1. Vision

A single-user lab notebook for a basement room that holds a hydroponic tower, canning shelves, mushroom grow bins, and a pepper and flower seedling station. Every grow, ferment, and preserve is logged the same way: what was intended, what was observed over time with photos and measurements, and how it turned out. The dashboard shows what needs attention today and where every batch stands. Over time, batches of the same strain or recipe are compared side by side.

Cellar does not replace a recipe manager or a grocery app. It owns the record of what was made, what happened, and what is on the shelf.

## 2. Users and access

| Item | Decision |
|---|---|
| Users | Seth only. No login in v1 (A1). |
| Devices | Phone in the basement for capture; Mac laptop for review and setup. |
| Network | Home network only. |
| Hosting | Mac laptop during build; Raspberry Pi home server later (D2, section 6). |

## 3. Data model (field level)

All tables carry `id` (short readable id), `created_at`, `updated_at`. Timestamps in ISO 8601 with timezone.

### 3.1 space
| Field | Type | Notes |
|---|---|---|
| name | text | "Basement lab", "Boomr Bin 1", "Shelf B", "Chest freezer" |
| kind | enum | room, container, shelf, appliance, outdoor |
| parent_space_id | fk space | Nesting: Boomr Bin 1 lives in Basement lab |
| notes | text | |

### 3.2 equipment
| Field | Type | Notes |
|---|---|---|
| name | text | "Presto 01781 pressure canner" |
| kind | enum | grow_container, canner, light, fan, humidifier, controller, meter, fermenter, other |
| model | text | |
| specs_json | json | Free-form specs, e.g. tank liters, max psi |
| space_id | fk space | Where it normally lives |
| notes | text | |

### 3.3 protocol
A reusable method: a recipe, a grow tek, a seed-start procedure.
| Field | Type | Notes |
|---|---|---|
| name | text | |
| batch_type | enum | ferment, mushroom, hydroponic, seedling, preserve |
| version | int | Increments on edit; old versions kept |
| source | text | "Paprika import", "North Spore tek guide", "own" |
| body_json | json | Ingredients, steps, target ranges, expected duration |
| notes | text | |

### 3.4 batch
| Field | Type | Notes |
|---|---|---|
| name | text | "Ferment 004 Hot sauce", "Grow 001 Blue Oyster" |
| batch_type | enum | Same enum as protocol |
| protocol_id | fk protocol | Which protocol and version it came from |
| protocol_snapshot_json | json | Full copy of the protocol body at batch creation. Never updated. |
| space_id | fk space | Current location |
| started_at | datetime | Day 0 |
| ended_at | datetime | Null while active |
| status | enum | planned, active, done, failed |
| phase | text | Free text per batch type, e.g. "colonization", "primary ferment" |
| notes | text | |

`batch_equipment` is a join table (batch_id, equipment_id).

### 3.5 observation
A dated check-in on a batch. Holds a note, any number of readings, any number of photos.
| Field | Type | Notes |
|---|---|---|
| batch_id | fk batch | |
| observed_at | datetime | |
| phase | text | Phase at the time, copied from batch |
| note | text | |

### 3.6 reading
| Field | Type | Notes |
|---|---|---|
| observation_id | fk observation | |
| kind | text | From the reading kinds list (3.7) |
| value | real | |
| unit | text | Stored, never assumed |
| taken_at | datetime | Defaults to observation time; sensors supply their own |
| source | enum | manual, sensor, import |

### 3.7 Reading kinds (starting list, Seth to confirm)
| Kind | Unit | Used by |
|---|---|---|
| temp_air | °F | all |
| temp_substrate | °F | mushroom, ferment |
| rh | % | mushroom, seedling |
| ph | pH | ferment, hydroponic |
| brix | °Bx | ferment |
| salinity | % | ferment |
| ec | mS/cm | hydroponic |
| water_level | in | hydroponic |
| height | in | hydroponic, seedling |
| weight | g | mushroom (harvest), ferment |
| light_hours | h | mushroom, seedling, hydroponic |
| co2 | ppm | mushroom (future sensor) |

### 3.8 photo
| Field | Type | Notes |
|---|---|---|
| observation_id | fk observation | |
| path | text | Relative path in the photos folder |
| caption | text | |
| taken_at | datetime | From EXIF when present |

### 3.9 outcome
One per batch, written when status becomes done or failed.
| Field | Type | Notes |
|---|---|---|
| batch_id | fk batch | |
| yield_value | real | |
| yield_unit | text | |
| rating | int | 1 to 5 |
| summary | text | What happened |
| would_change | text | What to do differently next time |

### 3.10 inventory_item
| Field | Type | Notes |
|---|---|---|
| batch_id | fk batch | Null allowed for items not made in-house |
| name | text | "Dill pickles, pint" |
| quantity | real | |
| unit | text | jars, lb, bags |
| space_id | fk space | Shelf or freezer |
| packed_at | date | |
| use_by | date | |
| status | enum | in_stock, low, gone |

### 3.11 task
| Field | Type | Notes |
|---|---|---|
| batch_id | fk batch | Null allowed for general tasks |
| title | text | "Burp jar", "Check RH" |
| due_at | datetime | |
| done_at | datetime | |
| recurrence | text | Optional, e.g. "daily", "weekly" |

## 4. Screens (v1)

| Screen | Purpose | Mobile priority |
|---|---|---|
| Today | Due tasks, active batches with days elapsed and last observation | High |
| Batch list | Filter by type, status, space | Medium |
| Batch detail | Timeline of observations, readings chart, photos, outcome | High |
| New observation | Note, readings, photos, phase change, mark tasks done. One-handed. | Highest |
| Protocols | List, view versions, import from Paprika file | Low |
| Inventory | By space, by use-by date | Medium |
| Spaces and equipment | Setup and reference | Low |
| Settings | Export CSV/JSON, backup location | Low |

## 5. Phases

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Repo, Claude Code set up, CLAUDE.md, DECISIONS.md, framework chosen, empty app runs with one command | Empty Today screen loads on the laptop and the phone |
| 1 | Ferment batches end to end: spaces, equipment, protocols, batches, observations with readings and photos, outcome. Paprika file import to create a protocol. | Two ferments logged from a Paprika recipe through to an outcome, from the phone |
| 2 | Today screen and tasks, including recurring tasks (daily burp, weekly check) | Opening the app each morning tells Seth what to do |
| 3 | Mushroom batch type: phase list (spawn, colonization, fruiting setup, fruiting, harvest, cleanup), contamination event logging, multiple flushes per batch | Grow 001 Blue Oyster logged Day 0 to cleanup |
| 4 | Preserves: `preserve` batch type and inventory items linked to the batch; use-by view | Canning shelves match the app |
| 5 | Hydroponic and seedling batch types; batch comparison view and reading charts across batches of the same protocol | Two batches of one protocol side by side |
| 6 | Look and feel: a chosen visual direction applied through shared design tokens, a color and icon per batch type, dark mode, more photos on cards, real home-screen icons and an offline screen, better empty states. Folds in small loose ends: batch list filters by type and space, the seeds sown chart, stray photo cleanup | Seth has used it on his phone in the basement and likes how it looks, in light and dark |
| 7 | Always on: Cellar runs as a background service (on the Mac first, then the Raspberry Pi), nightly backups of the database and photos, `cellar.local` on the home network | App runs without the laptop, and last night's backup restores |
| 8 | Sensors and Mealie: sensor import if the controllers expose data (O4); Mealie as the recipe source in place of Paprika files | A reading arrives without typing it, and a protocol comes in from Mealie |

## 6. Raspberry Pi scoping (Phase 7)

Purpose: always-on home server so the phone app works any time, and a host for Mealie.

| Item | Default assumption | Flag |
|---|---|---|
| Board | Raspberry Pi 5, 8 GB | O3 in DECISIONS.md; confirm when buying |
| Storage | SSD, not SD card, for the database and photos | SD cards wear out under database writes; common practice, not a measured fact |
| OS | 64-bit Raspberry Pi OS or Debian | ARM64; all stack choices must run here |
| Runtime | Node LTS; optional Docker for Mealie | |
| Backup | Nightly copy of the SQLite file and photos folder to a second disk or cloud folder | |
| Access | Home network by hostname, e.g. `cellar.local`. No internet exposure in v1. | If remote access is ever wanted, add a VPN (Tailscale or similar), not a public port |
| Placement | Not in the grow room. Humidity and spores are bad for electronics. | |

Design constraints this imposes now: no native dependencies that lack ARM builds, no assumptions about macOS paths, photos resized on upload so the Pi is not serving 12 MB originals.

## 7. Working agreement for Claude Code

1. Plan mode for anything beyond a small fix. Seth approves before code.
2. One vertical slice per session. Commit when it works.
3. Stop and ask on any schema, library, or hosting choice. Record in DECISIONS.md.
4. Explain in plain English until Seth says to stop.
5. Test on the phone by the end of Phase 1.

## 8. Explicitly out of scope

- Grocery lists, AnyList, meal planning
- Rebuilding a full recipe manager
- Multi-user accounts
- Any wild mushroom identification

## Checklist: before Phase 0

- [ ] Reading kinds list (3.7) confirmed or edited
- [ ] Paprika export run once (`.paprikarecipes` file saved) for import testing
- [ ] Node LTS and Claude Code installed on the Mac
- [ ] GitHub repo `cellar` created, these three files committed
- [ ] First ferment picked so Phase 1 has a real batch to log
