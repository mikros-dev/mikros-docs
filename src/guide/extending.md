# Extending

Mikros is built to be extended. You can add **custom features** (cross-cutting
capabilities you can turn on/off per service) and **new service kinds** (runtime
shapes beyond the built-ins like `grpc`, `http`, `native`, `script`).

This section explains how extension points work and when to use each.

## What is a “feature”?

A **feature** is an optional module that plugs into the service lifecycle to
provide cross-cutting behavior (e.g., tracing, auditing, rate limits, background
schedulers, database, pubsub).

Features:
- read their configuration from `service.toml` under `[features.<name>]`;
- can initialize resources during startup and participate in shutdown;
- may expose a **public service API** to your handlers/loops;
- remain **disabled by default** until explicitly enabled in config.

### Benefits

- **Consistency** – common concerns implemented once, reused everywhere.
- **Isolation** – clear on/off switch per service, testable in isolation.
- **Observability** – standardized logging/errors integrated from the start.

## What is a “custom service kind”?

A **service kind** defines *how* a service runs (its runtime shape). Built-ins:
`grpc`, `http`, `native`, `script`. You can add **custom kinds** (e.g., `websocket`,
`cronjob`, `stream-gateway`, `worker`) when your process model doesn’t fit the
defaults.

Custom kinds:
- are declared in `service.toml` under `types = [ "your-kind" ]`;
- get their own settings under `[services.your-kind]`;
- implement lifecycle methods to **initialize**, **run**, and **stop** cleanly.

### Benefits

- **Exact fit** – model long-running or non-server processes precisely.
- **Composability** – mix multiple kinds (hybrid services) when needed.
- **First-class lifecycle** – consistent start/stop semantics, health, and logs.

## How features plug into the lifecycle

At a high level, features participate in these phases:

1. **Configure** – Mikros loads `service.toml`, including `[features.*]`.
2. **Build** – features are constructed and **initialized** (resources, clients, background tasks).
3. **Start/Run** – features may wrap servers, enrich handlers, or run loops.
4. **Shutdown** – features **cleanup** resources and stop background work.

| Lifecycle phase | Feature touchpoint                                                 |
|-----------------|--------------------------------------------------------------------|
| Configure       | Read `[features.<name>]` definitions                               |
| Build           | `initialize(...)` / `Initialize(...)` — create resources, validate |
| Start/Run       | Optional: wrap servers, expose public API, schedule jobs           |
| Shutdown        | `cleanup(...)` / `Cleanup(...)` — stop loops, flush/close          |

> Features should always be **idempotent to stop**, honor timeouts, and avoid
> panics during a normal shutdown.

## How custom service kinds plug into the lifecycle

Custom kinds follow the same lifecycle as built-ins; they just define their
**mode** and **run shape**:

1. **Initialize** – bind configuration from `[services.<kind>]`, prepare listeners/resources.
2. **Run** – start serving or processing; **Block** (typical servers) or **NonBlock** (supervised tasks).
3. **Stop** – accept a cooperative shutdown signal; drain in-flight work and release resources.

| Responsibility  | Custom service kind                                             |
|-----------------|-----------------------------------------------------------------|
| Identify itself | Returns its `kind` (e.g., `Custom("websocket")` / string name)  |
| Describe itself | `info()` / `Info()` for startup logs                            |
| Choose mode     | `Block` (servers) or `NonBlock` (supervised workers)            |
| Initialize      | Validate config, create sockets/clients, prepare internal state |
| Run             | Serve or process; honor cancellation/shutdown signal            |
| Stop            | Gracefully stop accepting work, drain, and cleanup              |

## Configuration model

All extension points use the **same** configuration surface:

- **Enable a feature**
  ```toml
  [features.tracing]
  enabled = true
  sample_rate = 0.2
  ```
  
* **Declare a custom service kind**
  ```toml
  types = ["websocket"]

  [services.websocket]
  port     = 8081
  use_tls  = true
  max_conn = 2000
  ```

* **Hybrid services**
  ```toml
  types = ["http", "cronjob"]

  [services.http]
  port = 8080

  [services.cronjob]
  frequency       = "weekly"
  scheduled_times = ["02:00", "14:00"]
  days            = ["monday"]
  ```

## Public APIs from features

Some features expose a public API that your service code can call (e.g., `simple_api.create("users", …)`).

The framework provides a uniform way to fetch and use that API at runtime:

* The feature advertises a typed API object.
* Services resolve the feature by name from the shared context and downcast to the typed API.
* If the feature is disabled or missing, callers receive a clear, uniform error.

This keeps service code decoupled from implementation details while allowing
strong typing where you use it.

> Note: Go version allows getting a feature public API using a struct tag int
> the service main structure.

## Choosing between a feature and a custom service kind

Use a feature when:

* You’re adding cross-cutting behavior that multiple services can reuse.
* You need to wrap existing servers/handlers or run background tasks alongside them.
* You want a simple on/off switch per service via `[features.\<name\>].enabled`.

Use a custom service kind when:

* Your service’s execution model doesn’t fit gRPC/HTTP/native/script (e.g., websocket hub, specialized scheduler). 
* You need to own the main loop and define whether it blocks the process or runs non-blocking under supervision. 
* You want dedicated settings under `[services.\<kind\>]`.

It’s also valid to do both: define a custom kind and offer a companion feature
that other services can enable to interact with it.

## What Mikros gives your extensions “for free”

* Unified logging & errors – extensions receive framework logger and error APIs, so logs and failure paths look the same across services.
* Validated configuration – definitions are parsed and validated before init; extensions can safely fail fast on bad config.
* Lifecycle wiring – clean initialize / run / cleanup hooks with cooperative shutdown.
* Testing hooks – test helpers to setup/teardown and mock behavior (Go only).
* Context access – a shared service context for resolving features, clients, and runtime tags/metadata.

## Best practices

* Keep features small and composable. One responsibility per feature; prefer configuration over flags in code.
* Treat shutdown as a first-class path. Make cleanup idempotent; ensure loops exit on the first signal. 
* Validate early, fail fast. Validate configuration during initialization; never defer config errors to runtime hot paths. 
* Document your API. If a feature exposes a public API, document it as an interface/trait, not an implementation. 
* Avoid hidden globals. Resolve dependencies through the provided context; keep testability in mind.
