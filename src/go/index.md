# Mikros for Go

[Mikros](https://github.com/mikros-dev/mikros) is an **opinionated framework
for Go services**.  

It defines a consistent way to **declare, run, extend, and test** microservices
in Go—so teams can focus on business logic instead of boilerplate.

Mikros brings a common foundation for:

- **Service definitions** – every service describes itself in a `service.toml` (name, type, version, product, features, clients).
- **Lifecycle management** – standardized start, run, and shutdown flow across gRPC, HTTP, native, and script services.
- **Extensibility** – a first-class plugin system for features (logging, tracing, metrics, etc.) and even new service kinds.
- **Consistency** – unified logging, error handling, and environment validation.
- **Testability** – built-in testing helpers to run services in-process with predictable behavior.

## Why Mikros?

Without Mikros, every Go service tends to reinvent:

- how to wire gRPC and HTTP servers,
- how to manage config and environment validation,
- how to structure logging and errors,
- how to gracefully shut down,
- how to bolt on cross-cutting features like tracing or metrics.

Mikros standardizes these patterns.  

The result: **every service looks and behaves the same**—making them easier to
run in production, reason about in code review, and evolve over time.

## Service kinds

Mikros supports four built-in kinds of services:

- **gRPC** – API-first services defined with Protocol Buffers.
- **HTTP** – Services exposing HTTP endpoints.
- **Native** – Long-running background workers without an external API.
- **Script** – One-shot tasks that run once and exit.

You can also [create your own service kinds](/go/new-service-type).

## Features

Features are **optional modules** that can be enabled or disabled per service
in `service.toml`.  

They cover concerns like logging, tracing, and error wrapping.  

You can also [build custom features](/go/features) that plug directly into the
service lifecycle.

## Reference

- **Code reference:** [pkg.go.dev/github.com/mikros-dev/mikros](https://pkg.go.dev/github.com/mikros-dev/mikros)
- **Source repository:** [GitHub: mikros-dev/mikros](https://github.com/mikros-dev/mikros)
