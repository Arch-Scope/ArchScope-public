# ArchScope Query Language (AQL)

> **Status:** Partial Implementation — v0.1

AQL is a declarative-imperative domain-specific language for defining, configuring, and querying system architectures entirely from the command line. Currently supports architecture manipulation and configuration management.

---

## Implementation Status

### ✅ **Fully Implemented**
- **Configuration Commands** (`set`, `config`, `reset config`) with full validation and error handling
- **Basic Architecture Commands** (`add`, `remove`, `connect`, `disconnect`, `rename`)
- **Query Commands** (`show_nodes`, `show_connections`)
- **Simulation Commands** (`sim_set`, `sim_config`, `sim_run`, `sim_stop`, `sim_reset`) with validation
- **Simulation Query Commands** (`show_sim`, `show_metrics`, `show_bottlenecks`) with result display
- **Preset Commands** (`load_preset`, `save_preset`, `delete_preset`, `list_preset`) with DB integration
- **Help System** (`help`, `--help` flags) for all implemented commands including simulation and presets
- **Terminal Management** (`clear` terminal command)
- **Property Aliases** - supports multiple naming conventions (e.g., `max_rps`, `max-rps` → `maxrps`)
- **Strict Validation** - rejects invalid values, enforces ranges, validates algorithms
- **Simulation State Management** - maintains configuration, results, and history

### ❌ **Not Yet Implemented**
- **Advanced Query Commands** (`describe`, `show_cost`, `show_latency`, `show_timeseries`, `show_services`)
- **Output Commands** (`report`, `export`, `import`, `assert`, `compare`)
- **Advanced Architecture Features** (`using <service_id>`, `label "<label>"` in add commands)

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Conventions](#conventions)
3. [Command Reference](#command-reference)
   - [Architecture Commands](#architecture-commands)
   - [Configuration Commands](#configuration-commands)
   - [Simulation Commands](#simulation-commands)
   - [Query Commands](#query-commands)
   - [Preset Commands](#preset-commands)
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

### Simulation Commands

These commands configure and run performance simulations on the architecture.

---

#### `sim_set`

Sets a single simulation parameter with validation.

```
sim_set <property> = <value>
```

**✅ Properties:**
- `duration` - Simulation duration in seconds (must be > 0)
- `load_per_user` - Requests per second per user (must be > 0)
- `clients` - Number of concurrent clients (must be > 0)
- `rampup` - Ramp-up time in seconds (must be > 0)
- `algorithm` - Load pattern: `random`, `uniform`, or `burst`

**Examples:**
```aql
sim_set duration = 300
sim_set load_per_user = 10
sim_set clients = 100
sim_set rampup = 30
sim_set algorithm = random
```

---

#### `sim_config`

Sets multiple simulation parameters in a single block with validation.

```
sim_config {
  <property>: <value>,
  <property>: <value>
  ...
}
```

**✅ Features:**
- **Batch Updates**: Sets multiple properties in one command
- **Validation**: Each property is validated before applying
- **Partial Success**: Applies valid properties even if some are invalid

**Example:**
```aql
sim_config {
  duration: 600,
  load_per_user: 10,
  clients: 500,
  rampup: 60,
  algorithm: uniform
}
```

---

#### `sim_run`

Executes a simulation with current configuration or optional overrides.

```
sim_run [property=value ...]
```

**✅ Features:**
- **Architecture Validation**: Requires nodes to be defined
- **Override Support**: Temporarily override config for this run
- **Results Storage**: Saves results in history for analysis

**Examples:**
```aql
sim_run                    -- Run with current settings
sim_run duration=300       -- Override duration for this run
sim_run load_per_user=5 algorithm=burst  -- Multiple overrides
```

---

#### `sim_stop`

Stops a currently running simulation.

```
sim_stop
```

---

#### `sim_reset`

Resets simulation configuration to defaults.

```
sim_reset
```

**Default Configuration:**
- Duration: 300 seconds
- Load per user: 10 RPS
- Clients: 100
- Payload size: 0.001 MB
- Load profile: constant
- Spike frequency: 3
- Spike intensity: 2

---

### Query Commands

Inspect the current state of the architecture and simulation results.

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

#### `show_sim` 

Displays current simulation configuration or status.

```
show_sim [status|config]
```

**✅ Features:**
- **Configuration Display**: Shows current simulation parameters
- **Status Information**: Shows running state and last run time
- **State Management**: Displays current simulation state

**Examples:**
```aql
show_sim                   -- Show current configuration
show_sim status            -- Show running status
show_sim config            -- Show configuration (default)
```

**Sample Output:**
```
Simulation Configuration:
  Duration: 300s
  Load: 1000 RPS
  Clients: 100
  Ramp-up: 30s
  Algorithm: random
```

---

#### `show_metrics` 

Displays simulation results and performance metrics.

```
show_metrics [latency|throughput|errors]
```

**✅ Features:**
- **Comprehensive Metrics**: Latency, throughput, error rates
- **Filtered Views**: Show specific metric categories
- **Historical Data**: Access results from previous runs

**Examples:**
```aql
show_metrics               -- Show all metrics
show_metrics latency       -- Show latency metrics only
show_metrics throughput    -- Show throughput metrics only
show_metrics errors        -- Show error metrics only
```

**Sample Output:**
```
Simulation Results Summary:
  Duration: 300s
  Total requests: 300000
  Successful: 285000
  Failed: 15000
  Error rate: 5.00%
  Average latency: 45.23ms
  95th percentile: 125.50ms
  99th percentile: 289.75ms
  Throughput: 950.00 RPS
```

---

#### `show_bottlenecks` 

Identifies and displays performance bottlenecks from simulation results.

```
show_bottlenecks
```

**✅ Features:**
- **Bottleneck Detection**: Identifies high-utilization and high-latency nodes
- **Severity Classification**: Low, medium, high, critical severity levels
- **Detailed Analysis**: Shows specific metrics and thresholds

**Sample Output:**
```
Performance Bottlenecks:
  1. api1 (HIGH)
     High utilization detected
     utilization: 0.92 (threshold: 0.8)
  2. redis1 (MEDIUM)
     High latency detected
     latency: 85.3ms (threshold: 50.0ms)
```

---

#### `clear` 

Clears the terminal output.

```
clear
```

---

### Preset Commands

These commands manage architecture presets for saving, loading, and organizing reusable designs.

**✅ Implementation Note:** Fully implemented with DB integration. Built-in presets are stored in `src/data/presets.ts` (read-only), while user-created presets are stored in the database via `/api/designs`. Requires authentication (token) for user preset operations.

---

#### `load_preset`

Loads a saved architecture preset and replaces the current architecture.

```
load_preset <preset_name>
```

- `<preset_name>` — Name or ID of the preset to load (case-insensitive, can contain spaces)

**Examples:**
```aql
load_preset demo
load_preset Url Shortener
load_preset my_custom_preset
```

**Expected Output:**
- Success: `"Loaded preset "<preset_name>" with X nodes and Y connections"`
- Error: `"Preset "<preset_name>" not found. Available presets: <list>"`

**Side Effects:**
- Replaces current architecture with the preset's nodes and edges
- Updates simulation parameters to preset's configuration
- Updates the current design name displayed in the UI
- Clears any existing simulation results
- Updates the React Flow canvas with new nodes/edges

---

#### `save_preset`

Saves the current architecture as a new preset to the database.

```
save_preset <preset_name> [as "<description>"]
```

- `<preset_name>` — Name for the new preset (alphanumeric, underscores, hyphens only)
- `<description>` — Optional description in quotes

**Examples:**
```aql
save_preset my_api_arch
save_preset production_setup as "Production API architecture with caching"
save_preset microservices_demo as "Demo microservices pattern"
```

**Expected Output:**
- Success: `"Saved preset "<preset_name>" with X nodes and Y connections"`
- Error: `"Preset "<preset_name>" already exists. Use delete_preset first or choose a different name"`
- Error: `"Invalid preset name. Use alphanumeric characters, underscores, or hyphens only"`
- Error: `"No architecture to save. Add nodes and connections first"`

**Side Effects:**
- Saves current architecture (nodes, edges) as a new preset
- Saves current simulation parameters
- Stores in database via `/api/designs` (requires authentication)
- Preset becomes available for future `load_preset` commands

---

#### `delete_preset`

Deletes a user-created preset with confirmation prompt.

```
delete_preset <preset_name>
```

- `<preset_name>` — Name or ID of the preset to delete (case-insensitive)

**Confirmation Flow:**
1. First output: `"Are you sure you want to delete preset "<preset_name>"? (Y to confirm, any other key to cancel)"`
2. Wait for user input
3. If user enters 'Y' or 'y': proceed with deletion
4. If user enters any other key: cancel deletion

**Examples:**
```aql
delete_preset my_custom_preset
```

**Expected Output:**
- After confirmation (Y): `"Deleted preset "<preset_name>""`
- After cancellation: `"Deletion cancelled"`
- Error: `"Preset "<preset_name>" not found"`
- Error: `"Cannot delete built-in preset "<preset_name>". Only user-created presets can be deleted"`
- Error: `"Please login to delete presets"`

**Side Effects:**
- Removes preset from database via `/api/designs` (only if confirmed, requires authentication)
- Preset no longer available for loading
- Does not affect current architecture

---

#### `list_preset`

Lists all available presets with detailed information.

```
list_preset
```

**Examples:**
```aql
list_preset
```

**Expected Output:**
```
Available Presets:
  demo (built-in)
    Demo architecture with rate limiter, message queue, and workers
    Nodes: 12 | Connections: 13
  
  Url Shortener (built-in)
    Shorten long URLs and redirect via short codes
    Nodes: 8 | Connections: 9
  
  my_custom_preset (user-created)
    My custom architecture
    Nodes: 5 | Connections: 4
```

**Side Effects:**
- None (read-only query)

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

### Example 3 — Performance Simulation and Analysis

```aql
-- Set up a simple API architecture
add client as users
add load_balancer as lb
add api_server as api1
add api_server as api2
add cache as redis
add database as db

-- Connect the components
connect users to lb
connect lb to api1 animated
connect lb to api2 animated
connect api1 to redis
connect api2 to redis
connect redis to db

-- Configure cache performance
config redis {
  hitrate: 0.85,
  ttl: 300
}

-- Configure database capacity
set db maxrps = 10000

-- Configure simulation parameters
sim_config {
  duration: 600,
  load_per_user: 10,
  clients: 200,
  rampup: 60,
  algorithm: uniform
}

-- Run the simulation
sim_run

-- Analyze results
show_metrics
show_bottlenecks
show_sim status
```

---

## Current Limitations

1. **Limited Service Selection:** Cannot specify `USING <service_id>` or custom `LABEL` in ADD commands
2. **No Advanced Queries:** Cannot view detailed node information (`describe`), cost analysis (`show_cost`), or time series data (`show_timeseries`)
3. **No Export/Import:** Cannot save architectures to files or import scripts
4. **No Performance Validation:** Cannot assert performance requirements or compare designs
5. **No Filtering:** Cannot filter queries (e.g., `show_nodes WHERE type = api_server`)
6. **No Service Management:** Cannot show available services (`show_services`)

---

## Next Steps

To reach the full AQL specification, the following features need to be implemented:

1. **Advanced Queries** - `describe`, `show_cost`, `show_latency`, `show_timeseries`, `show_services`
2. **Output Commands** - `report`, `export`, `import`, `assert`, `compare`
3. **Enhanced Architecture** - `using <service_id>`, `label "<label>"` in ADD commands
4. **Advanced Filtering** - `show_nodes WHERE type = api_server`
5. **Performance Validation** - Enhanced bottleneck detection and performance assertions
6. **Real-time Simulation** - Live simulation updates and interactive monitoring
