# What is Mikros

Mikros is an **opinionated framework** for building microservices in **Go** and
**Rust**. It standardizes the way services are **defined, started, extended, and
shut down** — so that every service in your ecosystem behaves consistently.

Instead of reinventing boilerplate for logging, lifecycle management, or configuration,
Mikros gives you a unified foundation. The result: services are easier to write,
operate, and maintain across different teams and languages.

## Service Kinds

Every service in Mikros declares its type in a `service.toml` file and the
framework currently supports four service kinds:

- **gRPC** – API-first services defined with Protocol Buffers.  
  Common for core APIs shared across products.

- **HTTP** – Services exposing HTTP endpoints.  
  In Go, these usually map to protobuf contracts; in Rust, HTTP-first services are also supported.

- **Native** – Long-running background workers without a public API.  
  Useful for schedulers, consumers, or daemons.

- **Script** – One-shot tasks that run once and exit.  
  Ideal for migrations, batch jobs, or CLI-like utilities.
