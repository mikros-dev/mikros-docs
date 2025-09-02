# Service lifecycle

Every Mikros service follows the same **lifecycle**: it is configured, built, started, run, and gracefully shut down.  
The framework enforces this lifecycle across **Go** and **Rust**, ensuring services behave predictably and consistently.

## What lifecycle means

The lifecycle is the sequence of phases a service goes through:

```
Configure → Build → Start → Run → Shutdown
            ^                          |
            └────── errors → fail fast ┘
```

Some phases have well-defined hooks where your code or features can attach.

## Service kinds and responsibilities

Each service kind has specific runtime responsibilities:

| Service kind | What you provide                        | Go                                                                                                              | Rust                                                                                                     |
|--------------|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| **gRPC**     | A server implementation bound to a port | Implement the generated server interface and register handlers; Mikros wires port/context and graceful shutdown | Implement the generated service and register with the Mikros server; framework handles graceful shutdown |
| **HTTP**     | A router/endpoints                      | Provide handlers and middleware; Mikros integrates shutdown and common features                                 | Provide HTTP endpoints/routers; Mikros sets up serve loop and shutdown                                   |
| **Native**   | A long-running worker loop              | Implement start/stop pair that cooperates with context cancellation                                             | Implement a run loop that cooperates with a shutdown signal/watch                                        |
| **Script**   | A one-shot entrypoint                   | Implement a run/execute entry; exit with status                                                                 | Implement a run/execute entry; exit with status                                                          |

## Lifecycle phases

1. **Configure** – `service.toml` is loaded and validated; features and per-kind settings decoded.
2. **Build** – dependencies, clients, and features are constructed (logger, tracing, metrics, etc.).
3. **Start** – servers bind ports; workers schedule; scripts prepare execution.
4. **Run** – main loop serves requests or processes jobs.
5. **Shutdown** – triggered by signal/stop request; servers stop accepting new work; in-flight work drains; features flush/close; process exits cleanly.

## Lifecycle hooks

Mikros exposes hooks that services implement to run custom logic:

- **OnStart** – start servers, spawn loops.
- **OnShutdown** – stop accepting work, cancel contexts/signals.

| Conceptual hook | Go (interface)        | Rust (trait)                                                   |
|-----------------|-----------------------|----------------------------------------------------------------|
| OnStart         | `OnStart(ctx) error`  | `on_start(&mut self, ctx: Arc<Context>) -> errors::Result<()>` |
| OnShutdown      | `OnFinish(ctx) error` | `on_shutdown(&self) -> errors::Result<()>`                     |

## Graceful shutdown

- **Go** – Mikros propagates `context.Context` cancellation when the process
receives termination signals. Your code must honor cancellation, close listeners,
stop accepting new work, and drain with timeouts.

- **Rust** – Mikros exposes a cooperative shutdown signal (e.g. a `watch` channel
or atomic flag). Loops should check the signal and exit quickly. Close listeners,
stop accepting work, drain, then drop resources.

Best practices: use timeouts, make shutdown idempotent, don’t panic on normal
exit, and ensure background tasks are cancellable.

## Health, readiness, liveness

- **gRPC/HTTP** – Mikros can wire health endpoints or services after **OnStart**.
- **Native/Script** – signal readiness by successful start or exit code.
- Failing early in **OnStart** surfaces errors before the service starts.

## Features in the lifecycle

Features plug in primarily during the **Build** phase:

- They can read their `[features.*]` configuration from `service.toml`.
- Some wrap servers (logging, tracing, metrics).
- Others run background tasks and must honor shutdown.

## Configuration access

During the lifecycle, services can read:

- Common settings from `service.toml` (always before **start**).
- Per-kind settings under `[services.<kind>]` (ports, TLS, worker pools).
- Custom service settings under `[service]`.

## Cross-references

- [Quickstart (Go)](/go/quickstart) – minimal Go service showing lifecycle.
- [Quickstart (Rust)](/rust/quickstart) – minimal Rust service showing lifecycle.
