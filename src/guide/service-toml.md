# Service definitions

Every Mikros service declares its identity and runtime configuration in a
`service.toml` file. This file, written in TOML, tells the framework: 

* who the service is (name, version, language, product)
* what kind of service it is (gRPC, HTTP, native worker, script, or custom)
* how it should run (logging, environment variables, features, client endpoints)
* optional custom settings that belong only to that service

If service.toml is missing, malformed, or invalid, Mikros will fail fast at
startup.

## Required fields

At minimum, a service definition must include:

* **name** – logical service identifier (e.g. user, alert)
* **types** – one or more service kinds (grpc, http, native, script, …)
* **version** – service version string, must follow SemVer
* **language** – implementation language (go or rust)
* **product** – product or domain the service belongs to

Example:
```toml
name     = "alert"
types    = [ "grpc" ]
version  = "0.1.0"
language = "go"
product  = "SDS"
```

> Note: For grpc and http types, mikros supports port biding (http:8080)

## Environment variables (envs)

Some services require environment variables to be set. Listing them in
`service.toml` allows Mikros to validate their presence on startup.

```toml
envs = [ "DATABASE_URL", "REDIS_HOST" ]
```

## Logging (log)

The log section controls initial logging behavior.

* Go:
  ```toml
  [log]
  level            = "debug" # one of: info, debug, error, warn, internal
  error_stacktrace = true
  ```

* rust:
  ```toml
  [log]
  level           = "info"
  local_timestamp = true
  display_errors  = true
  ```

If omitted, Mikros applies sensible defaults (info, timestamps on, errors shown).

## Features ([features.*])

Features extend a service with optional behavior (e.g. tracing, metrics). All
features are **disabled by default** and must be explicitly enabled.

```toml
[features.tracing]
enabled = true

[features.simple_api]
enabled     = true
collections = ["users", "addresses"]
```

## Per-service settings ([services.*])

Each declared service kind may have its own settings block:

```toml
types = [ "http", "native" ]

[services.http]
port = 8080
use_tls = true

[services.native]
workers = 4
```

Custom kinds (e.g. cronjob, websocket) are also supported, if
whitelisted at load time.

## Outbound clients ([clients.*])

Define endpoints of coupled services the current service depends on:

```toml
[clients.user]
host = "localhost"
port = 7070

[clients.address]
host = "127.0.0.1"
port = 7071
```

## Custom service settings ([service])

The `[service]` table is a free-form block for service-specific options. It is
loaded by Mikros but only visible to that service.

```toml
[service]
custom_definition_1 = "Hello World!"
custom_definition_2 = 42
```

* Go:
  ```go
  type Definitions struct {
      Foo string `toml:"custom_definition_1"`
      Bar int    `toml:"custom_definition_2"`
  }
  
  type service struct {
      Definitions *Definitions `mikros:"definitions"`
  }
  ```

  By using the `mikros:"definitions"` struct tag, mikros automatically loads
  TOML settings into the `Definitions` structure at startup.

  It is possible to load it "manually":
  ```go
  type CustomCfg struct {
    Foo string
    Bar int
  }

  var cfg CustomCfg
  _ = defs.LoadCustomServiceDefinitions(&cfg)
  ```

* rust
  ```rust
  #[derive(Deserialize)]
  struct CustomCfg {
      foo: String,
      bar: i32,
  }

  let defs = Definitions::new(None, None)?;
  let cfg: Option<CustomCfg> = defs.custom_settings();
  ```

## Hybrid services

You can declare multiple kinds in one service:
```toml
types = [ "http", "native" ]
```

This allows, for example, an HTTP API and a background worker running together.
Validation ensures they don’t conflict.

## Reference schema

The table below lists all supported keys in service.toml:

## Reference schema

The table below lists all supported keys in `service.toml`:

| Key        | Type                                         | Required    | Description                                                                        | Go                                                                                              | Rust                                                                                                    |
|------------|----------------------------------------------|-------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `name`     | string                                       | ✅           | Logical name of the service (e.g. `user`, `alert`).                                | Stored as `Definitions.Name`.                                                                   | Stored as `ServiceName`.                                                                                |
| `types`    | array\<string\> / array\<table\>             | ✅           | Declares one or more service kinds: `grpc`, `http`, `native`, `script`, or custom. | Supports `type:port` (e.g. `http:8080`). Validated: no duplicates, only one `script`.           | Deserialized as `Vec<Service>`. Custom kinds require `CustomServiceInfo`.                               |
| `version`  | string (SemVer)                              | ✅           | Service version in [SemVer](https://semver.org) format.                            | Validated with `version` rule.                                                                  | Plain string, validated by `validator`.                                                                 |
| `language` | string                                       | ✅           | Implementation language.                                                           | `"go"` or `"rust"`.                                                                             | Typically `"rust"`, but kept as free string.                                                            |
| `product`  | string                                       | ✅           | Product or domain this service belongs to.                                         | Required string.                                                                                | Required string.                                                                                        |
| `envs`     | array\<string\>                              | ❌           | Environment variables required at startup.                                         | Must be uppercase ASCII.                                                                        | Presence validated, values not parsed.                                                                  |
| `log`      | table                                        | ❌           | Logging configuration.                                                             | Keys: `level` (one of `info`, `debug`, `error`, `warn`, `internal`), `error_stacktrace` (bool). | Keys: `level` (string), `local_timestamp` (bool), `display_errors` (bool). Defaults applied if omitted. |
| `features` | table\<string, any\>                         | ❌           | Feature flags and settings.                                                        | Managed via `ExternalFeatureEntry`. Must implement `Enabled()` and `Validate()`.                | Deserialized into typed structs with `Definitions::load_feature<T>()`.                                  |
| `services` | table\<kind, any\>                           | ❌           | Per-service-kind configuration (e.g. `[services.http]`).                           | Access via `LoadService(serviceType)`.                                                          | Access via `load_service::<T>(ServiceKind)`.                                                            |
| `clients`  | table\<string, { host: string, port: int }\> | ❌           | Outbound service endpoints keyed by name.                                          | `map[string]GrpcClient`.                                                                        | `Option<Client>` via `defs.client("name")`.                                                             |
| `service`  | table (free-form)                            | ❌           | Custom service-specific settings.                                                  | Loaded with `LoadCustomServiceDefinitions()`.                                                   | Deserialized via `custom_settings::<T>()`.                                                              |
| `tests`    | table                                        | ❌ (Go only) | Test-related options.                                                              | Keys: `execute_lifecycle` (bool), `discard_log_messages` (bool).                                | N/A.                                                                                                    |
