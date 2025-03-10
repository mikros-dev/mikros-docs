# Informações gerais

O **Mikros** foi pensado com o intuito de padronizar tanto o código de
aplicações e serviços quanto a API entre eles e o modo de acesso a recursos
comuns, tais como tracing, database, cache, etc.

Sua principal característica é fornecer este padrão impondo que essas
aplicações sigam somente algumas pequenas regras.

## Definições de funcionalidades via arquivo de configurações

Toda característica de uma aplicação bem como as funcionalidades que ela
faz uso, devem ser definidos num arquivo de configuração chamado `service.toml`.

Como informações obrigatórias, uma aplicação deve possuir ao menos:

* nome
* versão
* categoria(s)
* produto

Por padrão, toda funcionalidade fornecida pelo Mikros - as `features` -
vêm desabilitadas e devem ser ligadas quando desejado também por
configurações neste mesmo arquivo.

Para mais detalhes, consulte a sua própria [seção](/guides/service_toml.md).

## Definição da estrutura principal

Toda aplicação precisa ter ao menos **uma** estrutura (_struct_) responsável
por receber a implementação da API necessária para a sua categoria de serviço.

Essa estrutura, geralmente chamada de _struct_ principal do serviço, deve
possuir ao menos um membro obrigatório, do tipo `Service`. Usualmente, encontramos
sua declaração da seguinte maneira:

```go
type server struct {
	*mikros.Service
}
```

Também é comum utilizar esta mesma estrutura para quando existe o acoplamento
entre serviços e algum tipo de referência para a API deles deve ser mantida
(consulte a seção de 'Acoplamento entre serviços' para mais detalhes).

Por se tratar de uma estrutura, qualquer tipo de informação pode ser armazenada
ali dentro. Contudo, o **Mikros**, em seu processo de inicialização, realiza
uma validação nesta _struct_ verificando se todos os seus membros foram devidamente
inicializadas, visando evitar comportamentos inesperados durante a sua execução.

Para que um campo não passe por esta validação, pode-se utilizar a tag `mikros`
com uma opção específica para isso. Conforme o exemplo:

```go
type server struct {
	uncheckedField string `mikros:"skip"`
	*mikros.Service
}
```

## Inicializar corretamente o SDK conforme a categoria

A chamada de API `NewService` requer um argumento obrigatório `ServiceOptions`
onde informações necessárias em tempo de execução são passadas para o SDK,
visando inicializar corretamente a aplicação.

Dependendo da categoria de serviço, essas opções devem conter a sua definição
de API (seja gRPC ou HTTP). Contudo, isso pode variar muito devido ao suporte
para plugins de categorias de serviços suportados.

### Acoplamento entre serviços

Eventualmente ocorre a necessidade de um serviço ter de trocar informações com
outro por meio de sua API gRPC. Quando isso acontece, dizemos que existe pelo menos
um acoplamento para o determinado serviço.

O Mikros implementa uma maneira (quase) automática de inicializar estas
dependências ficando como responsabilidade do serviço somente indicar as
seguintes informações na inicialização do SDK:

* O nome do serviço dependente.
* A API para criação de um novo cliente deste serviço.

Além disso, na estrutura principal do serviço deve-se referenciar o serviço que
será inicializado com as informações prévias.

Exemplo:

A estrutura principal do serviço deve conter campos dos clientes desejados:
```go
type server struct {
  *mikros.Service
  servicepb.ServiceClient `mikros:"grpc_client=service"`
}
```

O valor da tag `grpc_client` deve ser o mesmo da chave utilizada na inicialização
do serviço, como mostrado no bloco a seguir:
```go
func main() {
  svc := mikros.NewService(&options.ServiceOptions{
    GrpcClients: map[string]*options.GrpcClient{
      "service": {
        ServiceName: mikros.ServiceName("service"),
        ServiceClient: servicepb.NewServiceClient,
      },
    },
  })

  svc.Start(&server{})
}
```
