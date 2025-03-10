# Mikros

Mikros is an API built to facilitate and standardize the creation of applications
that need to run for an indefinite period, typically running continuously,
performing specific operations.

The main idea is to allow users to create (or implement) an
application, written in Go, of the following categories:

* gRPC: an application with an API defined from a **protobuf** file.

* HTTP: an HTTP server application, with its API defined from a
**protobuf** file.

* native: a general-purpose application, without a defined API, with the possibility
to execute any code.

## Service

A service is considered an application that may or may not run for an indefinite
period, performing some type of task or waiting for commands to activate them.

Mikros consists of an SDK that facilitates the creation of these applications in a
way that standardizes their code, so that all execute tasks with the same
behavior and are written in a very similar way. Additionally, it offers
flexibility, allowing these applications to also be customized
when necessary.

Building a service using the Mikros SDK must follow these
points:

* Have a _struct_ where required methods according to its category must be implemented;

* Initialize the SDK correctly;

* Have a configuration file, called `service.toml`, containing information about itself and its functionalities.

Example of a gRPC service:

```go
package main

import (
	"context"

	"github.com/somatech1/mikros/v2/components/options"
	"github.com/somatech1/mikros/v2"
)

type server struct {
	*mikros.Service
}

func (s *server) GetBackoffice(ctx context.Context, req *backofficepb.GetBackofficeRequest) (*backofficepb.GetBackofficeResponse, error) {
	return nil, nil
}

func main() {
	svc := mikros.NewService(&mikros.ServiceOptions{
		Service: map[string]options.ServiceOptions{
			"grpc": &options.GrpcServiceOptions{
				ProtoServiceDescription: &backofficepb.BackofficeService_ServiceDesc,
			},
		},
	})

	svc.Start(&server{})
}