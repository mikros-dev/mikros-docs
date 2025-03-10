# Mikros

O Mikros é uma API construída para facilitar e padronizar a criação de aplicações
que precisem executar por um tempo indeterminado, geralmente executando indefinidamente,
realizando alguma operação específica.

A ideia principal dele é permitir que o usuário consiga criar (ou implementar) uma
aplicação, escritas em Go, das seguintes categorias:

* gRPC: uma aplicação com uma API definida a partir de um arquivo **protobuf**.

* HTTP: uma aplicação do tipo servidor HTTP, com sua API definida a partir de um
arquivo **protobuf**.

* native: uma aplicação de propósito geral, sem API definida, com a possibilidade
de executar qualquer código.

## Serviço

Serviço é considerado uma aplicação que pode ou não ficar em execução por tempo
indeterminado, realizando algum tipo de tarefa ou esperando comandos para ativá-las.

O Mikros consiste num SDK que facilita a criação destas aplicações de um
modo a padronizar o seu código, para que todos executem tarefas com o mesmo
comportamento e escritos de uma forma muito semelhante. Além de possuir uma
flexibilidade, permitindo que essas aplicações também possam ser customizadas
quando necessário.

A construção de um serviço usando o SDK do Mikros deve obedecer os seguintes
pontos:

* Possuir uma _struct_ onde métodos obrigatórios conforme a sua categoria devem ser implementados;

* Inicializar o SDK corretamente;

* Possuir um arquivo de configuração, chamado de `service.toml`, contendo informações suas e de suas funcionalidades.

Exemplo de um serviço gRPC:

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