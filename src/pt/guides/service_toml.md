# Arquivo service.toml

Um arquivo de configuração de um serviço é um arquivo texto utilizando a
sintaxe [TOML](https://toml.io/en/) para ajustar diversas informações relacionadas a ele.

Atualmente ele deve conter, pelo menos, as seguintes informações:

* nome do serviço
* categoria do serviço
* versão (no formato [semver](https://semver.org))
* linguagem do serviço
* produto ao qual o serviço pertence

Exemplo:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
```

## Variáveis de ambiente

Serviços podem precisar de variáveis de ambiente específicas a ele. Essas
variáveis devem ser declaradas também neste arquivo de configuração, e
permitir que seja possível validar a existência delas ou não durante a
inicialização do serviço.

Essas variáveis são declaradas no objeto `envs`, da seguinte maneira:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
envs = [ "VARIABLE_1", "VARIABLE_2" ]
```

## Nível inicial das mensagens de log

É possível ajustar o nível inicial das mensagens de log exibidas por um
serviço. O objeto **log_level** permite ajustar essa informação da seguinte
maneira:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
log_level = "debug"
```

Atualmente, os seguintes valores são suportados:

* debug
* info
* warn
* error

## Configurações customizadas de um serviço

Uma seção especial com o nome **service** está disponível para adição de
configurações customizadas de um serviço, que são acessíveis somente dentro
dele.

Essas configurações são carregadas pelo **Mikros**, sendo disponibilizadas
através da API `Service.CustomDefinitions`, sendo devolvidas no formato
`map[string]interface{}`.

Exemplo:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[service]
custom_definition_1 = "Hello World!"
custom_definition_2 = 42
```

Essas informações estarão disponíveis ao serviço da seguinte maneira:

```go
type server struct {
	*mikros.Service
}

func (s *server) Foo() {
	cfg := s.Service.CustomDefinitions()
	customDefinition1 := cfg["custom_definition_1"].(string)
	customDefinition2 := cfg["custom_definition_2"].(int)
}
```

## Alterando host e porta de destino de serviços acoplados

Eventualmente pode surgir a necessidade de que seja necessário ter um _hostname_ e
uma porta customizadas para acessar determinado serviço acoplado ao próprio
serviço. Por padrão, o **Mikros** utiliza valores fixos para estas informações
(que podem ser alteradas via variáveis de ambiente).

Para sobrepor estes valores e permitir estabelecer conexão de forma customizada,
o arquivo de configurações do serviço fornece a seção **clients** com este
objetivo. Internamente, por se tratar um objeto do tipo **mapa**, ele pode ser
utilizado da seguinte maneira:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[clients.service_name]
host = "localhost"
port = 10942
```

## Features

Por padrão, toda _feature_ fornecida pelo **Mikros** é inicializada desabilitada
no serviço. Desta maneira, é necessário que elas sejam "ligadas" explícitamente
para utilização.

Toda _feature_ é sempre acessada por um objeto principal chamado de **features**.
O exemplo a seguir mostra como "ligar" a _feature_ de **tracing** de um determinado
serviço:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[features.tracing]
enabled = true
```
