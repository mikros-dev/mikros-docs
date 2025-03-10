# Mikros

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/146955355" alt="Mikros Logo" width="200">
</p>

<p align="center">
  <strong>Service Orchestration Made Simple</strong>
</p>

<p align="center">
  A lightweight microservices framework for modern applications
</p>

<p align="center">
  <a href="https://github.com/mikros-dev/mikros/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/mikros-dev/mikros" alt="License">
  </a>
  <a href="https://github.com/mikros-dev/mikros/releases">
    <img src="https://img.shields.io/github/v/release/mikros-dev/mikros" alt="Latest Release">
  </a>
  <a href="https://github.com/mikros-dev/mikros/stargazers">
    <img src="https://img.shields.io/github/stars/mikros-dev/mikros" alt="GitHub stars">
  </a>
</p>

## Overview

Mikros is an API built to facilitate and standardize the creation of applications that need to run for an indefinite period, typically running continuously, performing specific operations. It serves as an SDK that simplifies microservices development, providing a consistent approach to building and deploying services.

### Key Features

- **🚀 Easy Deployment** - Deploy your microservices with a single command. Mikros handles the complexity so you can focus on building your application.
- **🔌 Service Discovery** - Automatic service discovery and registration. No need to manually configure service connections.
- **🔒 Built-in Security** - Secure communication between services with built-in authentication and encryption.
- **🔄 Load Balancing** - Intelligent load balancing ensures optimal resource utilization and high availability.
- **📊 Monitoring & Observability** - Comprehensive monitoring tools provide insights into your microservices ecosystem.
- **⚡ High Performance** - Designed for speed and efficiency, Mikros minimizes overhead to maximize your application's performance.

## Service Types

Mikros supports the following service types:

- **gRPC Services**: Applications with APIs defined from a **protobuf** file.
- **HTTP Services**: HTTP server applications with APIs defined from a **protobuf** file.
- **Native Services**: General-purpose applications without a defined API, with the flexibility to execute any code.

## Getting Started

### Prerequisites

- Go 1.18+
- Basic understanding of microservices architecture

### Installation

```bash
go get github.com/mikros-dev/mikros
```

### Basic Usage

Create a simple gRPC service:

```go
package main

import (
    "context"

    "github.com/mikros-dev/mikros/v2"
    "github.com/mikros-dev/mikros/v2/components/options"
)

type server struct {
    *mikros.Service
}

func (s *server) YourMethod(ctx context.Context, req *yourpb.Request) (*yourpb.Response, error) {
    // Your implementation here
    return &yourpb.Response{}, nil
}

func main() {
    svc := mikros.NewService(&mikros.ServiceOptions{
        Service: map[string]options.ServiceOptions{
            "grpc": &options.GrpcServiceOptions{
                ProtoServiceDescription: &yourpb.YourService_ServiceDesc,
            },
        },
    })

    svc.Start(&server{})
}
```

### Configuration

Mikros uses a `service.toml` file for configuration. Example:

```toml
name = "your-service"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "your-product"

[features.tracing]
enabled = true
```

## Documentation

For complete documentation, visit our [official documentation site](https://mikros-dev.github.io/mikros-docs/).

Available in:
- [English](https://mikros-dev.github.io/mikros-docs/)
- [Portuguese](https://mikros-dev.github.io/mikros-docs/pt/)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Mikros team and all contributors
- The open-source community for their invaluable tools and libraries

---

<p align="center">Built with ❤️ by the Mikros team</p> 