# ArchScope Query Language (AQL)

> **Status:** Partial Implementation — v0.1

AQL is a declarative-imperative domain-specific language for defining, configuring, and querying system architectures entirely from the command line. Currently supports architecture manipulation and configuration management.

---

## Implementation Status

### ✅ **Fully Implemented**
- **Configuration Commands** (`set`, `config`, `reset config`) with full validation and error handling
- **Basic Architecture Commands** (`add`, `remove`, `connect`, `disconnect`, `rename`) 
- **Query Commands** (`show_nodes`, `show_connections`)
- **Help System** (`help`, `--help` flags) for all implemented commands
- **Terminal Management** (`clear` terminal command)
- **Property Aliases** - supports multiple naming conventions (e.g., `max_rps`, `max-rps` → `maxrps`)
- **Strict Validation** - rejects invalid values, enforces ranges, validates algorithms

### ❌ **Not Yet Implemented**
- **Simulation Commands** (`sim_set`, `sim_config`, `sim_run`, etc.)
- **Advanced Query Commands** (`show_metrics`, `show_bottlenecks`, `describe`, `show_cost`, `show_latency`, `show_timeseries`, `show_sim`, `show_services`, `show_presets`)
- **Preset Commands** (`load_preset`, `save_preset`, `delete_preset`, `clear_all`)
- **Output Commands** (`report`, `export`, `import`, `assert`, `compare`)
- **Advanced Architecture Features** (`using <service_id>`, `label "<label>"` in add commands)

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Conventions](#conventions)
3. [Command Reference](#command-reference)
   - [Architecture Commands](#architecture-commands)
   - [Configuration Commands](#configuration-commands)
   - [Query Commands](#query-commands)
4. [Component Types](#component-types)
5. [Property Reference](#property-reference)
6. [Full Examples](#full-examples)

---

## Design Principles

- **Readable** — Commands read like English sentences. `add api_server as api1`
- **Scriptable** — A `.aql` file is a complete, reproducible architecture definition.
- **Incremental** — Build up a design step-by-step in a REPL, or run a full script at once.
- **Queryable** — Inspect any part of the simulation state or results with `SHOW` commands.
- **Idempotent** — Re-running a script from scratch produces the same result every time.

---

## Conventions

| Convention | Meaning |
|---|---|
| `lower_case` | AQL keyword (case-insensitive) |
| `<angle_brackets>` | Required argument |
| `[square_brackets]` | Optional argument |
| `"double_quotes"` | String literal |
| `--` | Line comment |
| `;` | Statement terminator (optional, newline also works) |
| `{ }` | Multi-property config block |

---

## Command Reference

### Architecture Commands

These commands define and modify the topology — nodes and edges.

---

#### `add` 

Adds a new component node to the architecture.

```
add <component_type> as <name>
```

- `<component_type>` — one of the 9 supported types (see [Component Types](#component-types))
- `as <name>` — display label for the node

**⚠️ Implementation Note:** Only supports basic `add <type> as <name>` syntax. Advanced features like `USING <service_id>` and `LABEL "<label>"` are not yet implemented. Uses default service for each component type.

**Examples:**
```aql
add client as user_client
add load_balancer as lb
add api_server as api1
add cache as redis1
add database as db1
add message_queue as mq
add worker as w1
add notification_service as notif
add rate_limiter as rl
```

---

#### `remove` 

Removes a node and all its connected edges.

```
remove <name>
```

**Example:**
```aql
remove api2
```

---

#### `connect` 

Creates a directed edge from one node to another.

```
connect <source> to <target> [animated]
```

- `animated` — renders the edge as animated in the UI (purely visual, no simulation effect)

**Examples:**
```aql
connect user_client to lb
connect lb to api1 animated
connect lb to api2 animated
connect api1 to redis1
connect redis1 to db1
```

---

#### `disconnect` 

Removes the edge between two nodes.

```
disconnect <source> from <target>
```

**Example:**
```aql
disconnect api2 from db2
```

---

#### `rename` 

Changes the display label of a node.

```
rename <name> to <new_name>
```

**Example:**
```aql
rename api1 to "Payment API"
```

---

### Configuration Commands

These commands configure properties on individual nodes.

---

#### `set` 

Sets a single property on a node with strict validation.

```
set <name> <property> = <value>
```

**✅ Validation Features:**
- **Numeric Validation**: Rejects non-numeric values for numeric properties
- **Range Validation**: Enforces valid ranges (e.g., latency > 0, hitrate 0-1)
- **Algorithm Validation**: Only accepts valid rate-limit algorithms
- **Error Messages**: Clear feedback for invalid inputs

**Examples:**
```aql
-- Override latency (must be > 0)
set api1 latency = 20

-- Override max RPS capacity (must be >= 0)
set db1 maxrps = 15000

-- Override cost (must be >= 0)
set ec2_worker cost = 0.45

-- Cache settings (hitrate 0-1, ttl >= 0)
set redis1 hitrate = 0.90
set redis1 ttl = 300

-- Message queue settings (must be >= 0)
set mq maxmessages = 50000
set mq processingtime = 150

-- Rate limiter settings
set rl algorithm = token_bucket
set rl bucketsize = 200
set rl refillrate = 50

set rl algorithm = fixed_window
set rl windowseconds = 60
set rl maxrequests = 100

set rl algorithm = sliding_window
set rl windowseconds = 30
set rl maxrequests = 500

set rl algorithm = leaky_bucket
set rl bucketsize = 100
set rl refillrate = 20

-- Redis counter TTL (must be >= 0)
set rl rediscounterttl = 60
```

**Error Examples:**
```aql
set api1 latency = abc     # Error: Invalid value for latency: abc
set api1 latency = -5      # Error: Invalid value for latency: -5
set rl algorithm = invalid # Error: Invalid value for algorithm: invalid
```

---

#### `config` 

Sets multiple properties on a node in a single block with validation.

```
config <name> {
  <property>: <value>,
  <property>: <value>
  ...
}
```

**✅ Features:**
- **Batch Updates**: Sets multiple properties in one command
- **Validation**: Each property is validated before applying
- **Partial Success**: Applies valid properties even if some are invalid
- **Error Reporting**: Lists unknown/invalid properties

**Example:**
```aql
config rl {
  algorithm: token_bucket,
  bucketsize: 500,
  refillrate: 100,
  rediscounterttl: 120
}

config redis1 {
  hitrate: 0.85,
  ttl: 600
}

config mq {
  maxmessages: 10000,
  processingtime: 100
}
```

**Error Handling Example:**
```aql
config rl {
  algorithm: invalid_algorithm,  # Invalid - will be ignored
  bucketsize: 500,               # Valid - will be applied
  unknown_prop: 123              # Unknown - will be ignored
}
# Result: "Updated 1 properties on node "rl" (ignored unknown: unknown_prop)"
```

---

#### `reset config` 

Resets a node's config to its service defaults using centralized defaults.

```
reset config <name>
```

**✅ Features:**
- **Centralized Defaults**: Uses service catalog defaults for each component type
- **Complete Reset**: Clears all custom configurations and applies defaults
- **Service ID Preservation**: Maintains the component's service assignment

**Example:**
```aql
reset config api1
```

**Result:** `Reset config for node "api1" to service defaults`

---

### Query Commands

Inspect the current state of the architecture.

---

#### `show_nodes` 

Lists all nodes and their current configuration.

```
show_nodes
```

**✅ Features:**
- **Node Listing**: Shows all nodes with their labels and component types
- **Configuration Display**: Shows current configuration for each node
- **Empty State**: Handles case when no nodes exist

**Example:**
```aql
show_nodes
```

**Sample Output:**
```
Nodes in architecture:
  api1 (api_server)
  redis1 (cache)
  db1 (database)
```

---

#### `show_connections` 

Lists all connections in the architecture.

```
show_connections
```

**✅ Features:**
- **Edge Listing**: Shows all directed connections between nodes
- **Animation Display**: Indicates which edges are animated
- **Empty State**: Handles case when no connections exist

**Example:**
```aql
show_connections
```

**Sample Output:**
```
Connections in architecture:
  lb -> api1 (animated)
  lb -> api2 (animated)
  api1 -> redis1
  redis1 -> db1
```

---

#### `help` 

Shows available commands or help for a specific command.

```
help
help <command>
<command> --help
```

**✅ Features:**
- **Command List**: Shows all available commands organized by category
- **Command-Specific Help**: Detailed usage and examples for each command
- **Component Types**: Lists available component types for add command
- **Property Reference**: Shows available properties for set/config commands

**Examples:**
```aql
help
help add
connect --help
```

**Sample Output:**
```
Available commands:
Architecture:
  add <type> as <name>
  remove <name>
  connect <source> to <target> [animated]
  disconnect <source> from <target>
  rename <name> to <new_name>
Configuration:
  set <label> <property> = <value>
  config <label> { <property>: <value>, ... }
  reset config <label>
Query:
  show_nodes - List all nodes
  show_connections - List all connections
Other:
  clear - Clear terminal
  help - Show this help
```

---

#### `clear` 

Clears the terminal output.

```
clear
```

---

## Component Types

| Type | Description |
|---|---|
| `client` | User-facing entry point (browser, mobile app) |
| `load_balancer` | Distributes traffic evenly across downstream nodes |
| `api_server` | Application logic layer |
| `cache` | In-memory key-value cache |
| `database` | Persistent data store |
| `message_queue` | Async message broker |
| `worker` | Background job processor (async, consumes from queue) |
| `notification_service` | Email / push / SMS dispatch |
| `rate_limiter` | Enforces per-user request rate policies |

---

## Property Reference

### Node Properties (used with `SET` / `CONFIG`)

| Property | Applies To | Type | Description |
|---|---|---|---|
| `latency` | All | number (ms) | Override base latency |
| `maxrps` | All | number | Override max requests/second capacity |
| `cost` | All | number ($/hr) | Override cost per hour |
| `hitrate` | `cache` | float (0–1) | Fraction of requests served from cache |
| `ttl` | `cache` | integer (seconds) | Cache entry time-to-live |
| `maxmessages` | `message_queue` | integer | Max queue depth before overflow |
| `processingtime` | `message_queue` | integer (ms) | Time per message consumed by a worker |
| `algorithm` | `rate_limiter` | enum | `token_bucket`, `fixed_window`, `sliding_window`, `leaky_bucket` |
| `bucketsize` | `rate_limiter` | integer | Token bucket max / leaky bucket capacity |
| `refillrate` | `rate_limiter` | number (tokens/sec) | Token refill rate (token_bucket, leaky_bucket) |
| `windowseconds` | `rate_limiter` | integer | Window size in seconds (fixed_window, sliding_window) |
| `maxrequests` | `rate_limiter` | integer | Max requests per window (fixed_window, sliding_window) |
| `rediscounterttl` | `rate_limiter` | integer (seconds) | How long before Redis counter resets |

**Property Aliases Supported:**
- `max_rps`, `max-rps` → `maxrps`
- `bucket_size`, `bucket-size` → `bucketsize`
- `processing_time`, `processing-time` → `processingtime`
- `window_seconds`, `window-seconds` → `windowseconds`
- `max_requests`, `max-requests` → `maxrequests`
- `redis_counter_ttl`, `redis-counter-ttl` → `rediscounterttl`
- `cache_ttl`, `cache-ttl` → `ttl`
- `cache_hit_rate`, `cache-hit-rate` → `hitrate`

---

## Full Examples

### Example 1 — Simple Read-Heavy API

```aql
-- Architecture
add client as users
add load_balancer as lb
add api_server as api1
add api_server as api2
add cache as cache1
add database as db

-- Connections
connect users to lb
connect lb to api1 animated
connect lb to api2 animated
connect api1 to cache1
connect api2 to cache1
connect cache1 to db

-- Cache config
set cache1 hitrate = 0.90
set cache1 ttl = 300

-- Show the architecture
show_nodes
show_connections
```

---

### Example 2 — Rate-Limited Checkout with Async Workers

```aql
-- Architecture
add client as users
add rate_limiter as rl
add load_balancer as lb
add api_server as api1
add api_server as api2
add cache as cart
add database as db
add message_queue as mq
add worker as w1
add worker as w2
add notification_service as notif

-- Connections
connect users to rl
connect rl to lb animated
connect lb to api1 animated
connect lb to api2 animated
connect api1 to cart
connect api2 to cart
connect cart to db
connect api1 to mq
connect mq to w1 animated
connect mq to w2 animated
connect w1 to notif
connect w2 to notif

-- Rate limiter: sliding window, 200 req/min per user
config rl {
  algorithm: sliding_window,
  windowseconds: 60,
  maxrequests: 200
}

-- Cache hit rate
set cart hitrate = 0.75

-- Queue: max 20k messages, 200ms processing time
config mq {
  maxmessages: 20000,
  processingtime: 200
}

-- Show the architecture
show_nodes
show_connections
```

---

## Current Limitations

1. **No Simulation Control:** Cannot run simulations or view results via AQL
2. **Limited Service Selection:** Cannot specify `USING <service_id>` or custom `LABEL` in ADD commands
3. **No Preset Management:** Cannot save/load architecture presets
4. **No Advanced Queries:** Cannot view metrics, bottlenecks, or detailed node information
5. **No Export/Import:** Cannot save architectures to files or import scripts
6. **No Performance Validation:** Cannot assert performance requirements or compare designs
7. **No Filtering:** Cannot filter queries (e.g., `show_nodes WHERE type = api_server`)

---

## Next Steps

To reach the full AQL specification, the following features need to be implemented:

1. **Simulation Commands** - `sim_set`, `sim_config`, `sim_run`, etc.
2. **Advanced Queries** - `show_metrics`, `show_bottlenecks`, `describe`
3. **Preset Management** - `load_preset`, `save_preset`, `delete_preset`
4. **Output Commands** - `report`, `export`, `import`, `assert`, `compare`
5. **Enhanced Architecture** - `using <service_id>`, `label "<label>"`, `clear_all`
6. **Advanced Filtering** - `show_nodes WHERE type = api_server`
7. **Time Series Data** - `show_timeseries`
