# Criando serviços

Para construir um novo serviço, algumas regras e padrões precisam ser seguidas
conforme a sua categoria.

Contudo, para todas as categorias, um serviço deve possuir pelo menos os
seguintes arquivos em seu diretório:

```
service
       \_go.mod
       \_go.sum
       \_service.toml
       \_main.go
```

* Os arquivos **go.mod** e **go.sum** são da própria linguagem go, para controle de
  nome do módulo e suas dependências.

* O arquivo **service.toml** contém informações pertinentes ao serviço, como nome,
  versão, linguagem de programação utilizada por ele, variáveis de ambiente, etc.
  Este arquivo é obrigatório para a inicialização correta de um serviço, além
  de sofrer validações durante a execução do _pipeline_ de CI/CD em um _merge
  request_.

* O arquivo **main.go** deve conter todo código responsável pela inicialização
  do serviço, seja utilizando a API correta conforme a sua categoria, bem
  como inicializando componentes externos particulares para o funcionamento do
  próprio serviço, como a inicialização de um recurso externo, por exemplo.

Um serviço pode também possuir outros arquivos fonte. Contudo, estes variam
conforme a sua categoria.

Adicionalmente, para os serviços do Somatech, todo serviço também precisa
possuir os seguintes arquivos:

* Um arquivo **README.md** é um arquivo texto, com sintaxe [Markdown](https://www.markdownguide.org/)
  descrevendo brevemente o próprio serviço, com informações relevantes para
  conhecimento, além de ser possível detalhar mais a seu respeito, inserindo
  _badges_, para exibir informações relevantes sobre o mesmo, como _code coverage_
  nos testes unitários, versão, entre outras.

* Um arquivo **Dockerfile** é o arquivo necessário para a construção da imagem docker
  do serviço para o seu deploy (ou eventual teste local, se necessário).

Ficando assim com o seguinte layout:

```
service
       \_README.md
       \_go.mod
       \_go.sum
       \_Dockerfile
       \_service.toml
       \_main.go
```

**IMPORTANTE**: É possível criar esta estrutura inicial de um serviço através
da ferramenta [soma-cli](https://github.com/somatech1/soma-cli). Consulte-a
para mais detalhes.

## Layouts opcionais

### Configurações

Para o caso de um serviço possuir configurações, ou seja, uma estrutura do
tipo **Settings** declarada num arquivo **.proto**, ele deve possuir todo
o código relacionado ao tratamento desta informação reunido num arquivo
específico, de nome **settings.go**. Desta forma a estrutura básica seria
a seguinte:

```
service
       \_README.md
       \_go.mod
       \_go.sum
       \_Dockerfile
       \_service.toml
       \_main.go
       \_settings.go
```

### Lifecycle

Toda inicialização de componentes externos, necessários para o funcionamento
do serviço, deve ser realizada utilizando a interface de _Lifecycle_ do
Mikros. Isso permite que membros da estrutura principal do serviço sejam
inicializados corretamente. Assim como a liberação de algum recurso necessário.

A especificação desta API pode ser consultada no [arquivo](container/lifecycle.go).

Sendo assim, um serviço que possua esta necessidade deverá ter a seguinte estrutura
de arquivos, com o arquivo **lifecycle.go** sendo utilizado especificamente
para inicializações e liberação de recursos do serviço:

```
service
       \_README.md
       \_go.mod
       \_go.sum
       \_Dockerfile
       \_service.toml
       \_main.go
       \_lifecycle.go
```

### Serviços gRPC ou HTTP

Um serviço da categoria `gRPC` ou um servidor `HTTP` parte da premissa de que um arquivo
**protobuf** também existe para ele, com definições de APIs (RPCs) e entidades. Isto
implica que o serviço precisa "implementar" o suporte para esta API definida.

Assim, toda a implementação referente a API gerada pelo **protobuf** deve ficar
reunida num único arquivo fonte, de nome **server.go**. E a estrutura de um serviço
desta categoria ficaria da seguinte maneira:

```
service
       \_README.md
       \_go.mod
       \_go.sum
       \_Dockerfile
       \_service.toml
       \_main.go
       \_server.go
```

### Serviços subscriber ou database-subscriber

Serviços da categoria `subscriber` ou `database-subscriber` devem possuir um
arquivo fonte com o nome **subscriber.go** onde a declaração de sua _struct_
principal deve ser feita, bem como qualquer código em comum entre os eventos
manipulados.

Além disso, o serviço também deve possuir um arquivo fonte específico para
cada um dos eventos ouvidos. O nome destes arquivos deve seguir o padrão:

* Ter o mesmo nome do evento (somente o seu sufixo), em caixa baixa e em `snake_case`.

Cada arquivo deve tratar especificamente um evento, com pelo menos uma função
que devolva um _handler_ do tipo [types/event.EventHandler](types/event.go).
Ele também deve conter métodos da _struct_ principal que sejam utilizados
somente pelo seu _handler_.

A criação de um _handler_ deve possuir ao menos as seguintes características:

* Uma função específica para "criar" e devolver o handler, para ser chamada
  na API de inicialização do SDK. O nome desta função deve seguir a regra:
  
  * Iniciar com o prefixo `New`, seguida do nome do evento (somente o seu
    sufixo), em `CamelCase`, com o prefixo `Handler`.

Exemplo para o caso de um evento de nome `FILE_CREATED`:

```go
package main

import (
  "context"

  "github.com/somatech1/mikros/types/event"
)

func NewFileCreatedHandler(service *subscriber) event.EventHandler {
  return func(ctx context.Context, e *event.Event) error {
    // Trata evento
    if err := doSomething(); err != nil {
      return event.Skip()
    }

    return event.Ack()
  }
}
```

A estrutura de código de um repositório para esta categoria de serviço deve
conter no mínimo o seguinte (utilizando o evento `FILE_CREATED` citado previamente):

```
service
       \_README.md
       \_go.mod
       \_go.sum
       \_Dockerfile
       \_service.toml
       \_main.go
       \_subscriber.go
       \_file_created.go
```

### Serviços consumer

Assim como um subscriber, um serviço do tipo consumer também não possui nenhum
tipo de especificação formal para sua construção a não ser a necessidade de que
o código implemente a _interface_ específica para a sua categoria.

A estrutura de código de um repositório para esta categoria de serviço deve
conter no mínimo o seguinte:

```
service
       \_consumer.go
```

O arquivo **consumer.go** deve conter a implementação da _interface_
**ConsumptionRegister**, bem como os métodos que farão o tratamento dos registros
recebidos.

### Serviços cronjob

### Serviços nativos (native)

