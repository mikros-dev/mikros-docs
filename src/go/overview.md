# Overview

Mikros for Go is designed to make services **predictable, consistent, and
extensible**.

This page explains the core concepts and architecture of the framework.

## Core principles

Mikros is built on a few simple rules:

1. **Every service describes itself**  
   All services carry a `service.toml` that defines their identity, kind(s), 
features, and clients. No hidden defaults, no magic.

2. **Lifecycle is standardized**  
   Services start, run, and shut down the same way—whether they’re gRPC APIs,
HTTP servers, background workers, or scripts.

3. **Features are pluggable**  
   Cross-cutting concerns (logging, tracing, metrics, error handling, etc.)
are implemented once and reused everywhere.

4. **Extensions are first-class**  
   If the built-ins don’t fit, you can define a new service kind or feature
that looks and behaves like a native one.

5. **Fail fast, recover gracefully**  
   Invalid configuration stops a service at boot. Once running, Mikros ensures
clean shutdowns and predictable error paths.

## Service anatomy

A Mikros service has three main parts:

- **Definition** – loaded from `service.toml`. Declares name, type(s), version, product, envs, features, clients, and optional custom settings.
- **Lifecycle** – standardized phases: configure → build → start → run → shutdown.
- **Extensions** – optional features or custom service kinds that plug into the lifecycle.

```text
service.toml → Definitions → Lifecycle (configure → run → shutdown) → Extensions
```

## Service kinds

Built-in kinds cover the most common shapes:

* gRPC – strongly typed APIs using Protocol Buffers.
* HTTP – services exposing HTTP endpoints (Go requires protobuf contracts).
* Native – long-running background processes without a public API.
* Script – one-shot tasks that run once and exit.

Need something else? Mikros supports [new service types](/go/new-service-type).

## Features

A feature is a pluggable module that extends a service. Examples:

* logger – consistent, structured logging API.
* errors – framework-aware error handling.
* env – environment variable loading and validation.

Features live under [features.*] in service.toml. They’re disabled by default
and only run when explicitly enabled.

## Lifecycle in practice

Every Mikros service follows the same lifecycle:

1. Configure – load service.toml and validate.
2. Build – initialize features, logger, error API, envs, clients.
3. Start – bind servers, schedule workers, prepare scripts.
4. Run – enter the main loop (serving requests or executing tasks).
5. Shutdown – triggered by signals, service drain work and exit cleanly.

## Why adopt Mikros?

* **Consistency across services** – all your Go services look the same, making onboarding and code reviews easier. 
* **Reduced boilerplate** – no need to rewrite lifecycle, config loading, logging, error handling for every service.
* **Extensibility** – plug in company-wide features (auth, telemetry, rate-limiting) without copy/paste. 
* **Safer operations** – validated configs, structured logs, predictable shutdowns. 
* **Language parity** – the same model exists in Rust, allowing mixed-language systems with one set of standards.
