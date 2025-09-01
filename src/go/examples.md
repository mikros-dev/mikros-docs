# Examples

This page is a **map**, not a mirror. The canonical, runnable examples live in
the repository.

We link to them here and explain what each demonstrates, why you’d use it, and
how to run it locally.

Examples can be found [here](https://github.com/mikros-dev/mikros/tree/main/examples/services).

## How to use these examples

- **Read here, run there.** The repo examples are tested and stay in sync with the codebase.
- **Copy intentionally.** Start from an example and delete what you don’t need—don’t paste random snippets from docs.
- **Compare with Quickstart.** Quickstart shows the shortest path; examples show real patterns with trade-offs.

### HTTP service (basic)

- **What:** Minimal HTTP service exposing a couple of endpoints.
- **Shows:** `service.toml` with `types=["http"]`, handler wiring, logging and errors feature, graceful shutdown.
- **Run:** `go build` && `./service-name`.

### gRPC service (basic)
- **What:** gRPC API defined via protobuf and registered with Mikros.
- **Shows:** `GrpcServiceOptions`, server registration, error shaping to gRPC status.
- **Run:** generate stubs, start service, call with a client test.

### Native worker
- **What:** Long-running worker with a cooperative loop (no public API).
- **Shows:** `types=["native"]`, honoring context cancellation, feature usage without listeners.

### Script (one-shot)
- **What:** Job that runs once and exits with status.
- **Shows:** `types=["script"]`, lifecycle wiring for single-run tasks.

## Running examples locally

- Ensure Go toolchain and protobuf/grpc plugins (if needed) are installed.
- From the example folder:
    - **Manual run:** `go build` && `./service-name`
- Configure environment variables the example requires (see its README or `service.toml` file).

## Contributing examples

- Keep examples **small and focused**; one idea per folder.
- Include a short **README** with: purpose, prerequisites, how to run, and what to look for.
- Prefer **table-driven subtests** for scenario coverage; avoid sleep and real networking.

