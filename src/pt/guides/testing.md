# Testes unitários usando o Mikros

## Introdução

O Mikros fornece um pacote **testing** especificamente para auxiliar a escrita
de testes unitários dentro de serviços (ou alguma outra aplicação). Este pacote
permite construir testes substituindo ("_mockando_") funcionalidades internas com
abrangendo ao máximo a cobertura de código possível.

## Funcionalidades possíveis de serem simuladas

Todo serviço **gRPC** ou **HTTP** possuem sua definição de API declarada via
arquivo protobuf (.proto). Isso faz com que, durante o processo de geração de
código a partir destes arquivos, toda uma camada que permite substituir sua a API
também seja gerada, os _mocks_. Estes _mocks_ são utilizados para simular chamadas
de API entre serviços dentro dos testes unitários.

Além destes _mocks_ gerados pelo protobuf, o Mikros permite simular as
seguintes funcionalidades:

* _Records_ enviados para um serviço do tipo **consumer**;
* Eventos enviados para um serviço do tipo **subscriber**;
* _Mock_ para a API de configurações (_Settings_) de um serviço;
* _Mock_ para a API de banco de dados de um serviço.

> A API de _mock_ fornecida pelo pacote `testing` permite simular qualquer outra
> API que tenha _mocks_ gerados desde que suas funções recebam como primeiro
> argumento um valor do tipo `context.Context`.

## Recomendações

* Manter como variáveis globais um contexto (context.Context) e um objeto da
_struct_ principal do serviço.
* Nomes dos arquivos testes.
* Inicializar valores globais do teste em uma função para testar o `main` do
serviço.
* Possuir uma função específica para testar cada API do serviço, sendo esta
API uma chamada RPC, um endpoint HTTP, um handler de um evento ou de um registro
em um _datastream_.
* Não escrever um teste que simule todas as possibilidades de um código em uma
única função. Utilizar [_subsets_](https://go.dev/blog/subtests) em cada função de teste
para abranger ao máximo a cobertura no código testado, sendo que, cada _subtest_
deve testar até um determinado ponto dentro deste código.
* A API de um teste _subtest_ do go permite incluir um texto descritivo sobre si
e isto deve ser utilizado para descrever o que deve acontecer no teste, escrito
em inglês.
* **Não** utilizar testes para execução em modo paralelo.

## Exemplos de testes

### Teste unitário da função `main` de um serviço
```go
func TestMain(m *testing.M) {
    os.Exit(func() int {
        ctx := context.TODO()
        svc := mikros.NewService()
        s = &server {
            Service: svc,
        }

        // If the service uses database
        defer s.Database().DropCollection(ctx)

        return m.Run()
    }())
}
```

### Teste unitário sem utilizar nenhum tipo de _mock_
```go
func TestFoo(t *testing.T) {
    t.Run("some descriptive text about the test", func(t *testing.T) {
        test := ftesting.New(t, nil)
        res, err := s.SomeCallToFoo(ctx, &args)
        test.Assert().NoError(err)
        test.Assert().NotNil(res)
        test.Assert().Contains("some expected value", res)
    })
}
```

### Teste unitário _mockando_ uma API de um serviço externo
```go
func TestMethod(t *testing.T) {
    t.Run("should succeed calling the method", func(t *testing.T) {
        test := ftesting.New(t, nil)
        mock := ftesting.NewMock[examplemock.MockExampleServiceClientMockRecorder](test, examplemock.NewMockExampleSericeClient)
        mock.Mock(&ftesting.MockOptions{
            Call: mock.Recorder().ExternalCall,
            Times: 1,
            Error: nil,
            Return: &example.ExternalCallResponse{
                Example: &example.ExampleProto{
                    Id: id.NewID("ex"),
                },
            },
        })

        // Substitui o serviço externo com o mock criado.
        s.ExampleServiceClient = mock.Client()
        res, err := s.Method(ctx, &args)
        test.Assert().NoError(err)
        test.Assert().NotNil(res)
    })
}
```

### Teste unitário _mockando_ uma _collection_ no banco de dados
```go
func TestFoo(t *testing.T) {
    t.Run("should return an error on FindMany call", func(t *testing.T) {
        dbmock := ftesting.NewMock[fmockdb.MockDatabaseServiceOperationsMockRecorder](t, fmockdb.NewMockDatabaseServiceOperations)
        dbmock.Mock(&ftesting.MockOptions{
            Call: dbmock.Recorder().FindMany,
            Error: s.Errors().Internal(ctx, errors.New("internal database error")),
            Times: 1,

            // Deixamos como true aqui pois neste exemplo o código testado está utilizando
            // o argumento variadic da API (uma opção de paginação por exemplo).
            UseVaridicArgument: true,

            // Esta flag indica que a chamada testada retorna um único valor (no caso um
            // error). Geralmente a maioria das APIs testadas são de RPCs de serviços e
            // elas possuem sempre dois valores retornados, o dado e um erro.
            SingleErrorReturned: true,
        })

        test := ftesting.New(t, &ftesting.Options{
            Database: dbmock.Client()
        })
		
        // Inicializa o modo de teste substituindo funcionalidades internas
        // do framework.
        //
        // IMPORTANTE: Lembrar de finalizar este modo com a chamada defer.
        s.SetupTest(ctx, test)
        defer s.TeardownTest(ctx)
                
        res, err := s.CallToServiceMethod(ctx, &args)
        test.Assert().Nil(res)
        test.Assert().Error(err)
        test.Assert().Contains("internal database error", err.Error())
    })
}
```

### Teste unitário substituindo a _collection_ do serviço
```go
func TestFoo(t *testing.T) {
    t.Run("should succeed in this call", func (t *testing.T) {
        test := ftesting.New(t, &ftesting.Options{
            // Substitui a collection do serviço, que neste exemplo possui
            // o nome 'service' por um novo.
            Collections: map[string]string{
                "service": "novo_nome_da_collection",
            },
        })

        // Inicializa o modo de teste substituindo funcionalidades internas
        // do framework.
        //
        // IMPORTANTE: Lembrar de finalizar este modo com a chamada defer.
        s.SetupTest(ctx, test)
        defer s.TeardownTest(ctx)

        // Como a collection pertence somente ao teste, ela está vazia e
        // precisa de dados para validação. Desta forma inserimos um registro
        // para o teste.
        record := entries["completed"]
        _ = s.Database().Insert(ctx, record)
		
        res, err := s.GetRecord(ctx, &example.GetRecordRequest{
            Id: record.Id,
        })

        test.Assert().NoError(err)
        test.Assert().NotNil(res)
    })
}
```

### Teste unitário de uma API HTTP
```go
func TestAPI(t *testing.T) {
    t.Run("should succeed with valid input", func(t *testing.T) {
        test := ftesting.New(t, &ftesting.Options{
            // Deve-se inicializar teste `httpHandler` dentro do TestMain
            Handler: httpHandler.HttpHandler(),
        })

        res, err := test.Post(&ftesting.RequestOptions{
            Path: "/alert-input/v2/vehicle",
            Headers: map[string]string{
                "contract_code": sharedpb.ContractCode_CONTRACT_CODE_HORTO_0001.ValueWithoutPrefix(),
            },
            ContentType: "application/json",
            Body: &alert_inputpb.CreateAlertInputVehicleRequest{
                Alerts: []*alert_inputpb.AlertInputRequest{
                    {
                        Origin:      sharedpb.Origin_ORIGIN_ENGEBRAS,
                        PassageId:   "092834a02d932",
                        Latitude:    "-23.453",
                        Longitude:   "-46.533",
                        CaptureTime: "2021-06-11T11:04:47-03:00",
                        Plate:       "ABC1234",
                        FileUrl:     "s3://some.valid.url/image.jpg",
                        Issues: []*alert_inputpb.CreateAlertInputIssueRequest{
                            {
                                Code:        "42",
                                Description: "Licenciamento em atraso",
                            },
                        },
                    },
                },
            },
        })

        test.Assert().NoError(err)
        test.Assert().NotNil(res)

        // Vale lembrar aqui que o retorno de um teste de API HTTP sempre
        // retorna um `[]byte`. Desta forma é necessário convertê-lo para o
        // formato desejado caso seja preciso validá-lo.
        var response *alert_inputpb.CreateAlertInputPersonalResponse
        marshal := marshaler.ProtoMarshaler
        err = marshal.Decode(res, &response)
        test.Assert().NoError(err)
        test.Assert().Equal("OK", response.GetStatus().ValueWithoutPrefix())
    })	
}
```

### Teste unitário de um serviço **consumer**
```go
func TestConsumer(t *testing.T) {
    t.Run("should succeed with valid alert input PERSONAL", func (t *testing.T) {
        test := ftesting.New(t, nil)
        ali := alertInputs["all-info-personal"].ProtoResponse()
		
        // Cria um consumer com um registro (`Records`) na fila para leitura.
        consumer, err := ftesting.NewDatastreamConsumption(&ftesting.DatastreamConsumptionOptions{
            StreamName: "ALERT_INPUT_CHANNEL",
            Records:    []proto.Message{ali},
        })

        test.Assert().NoError(err)
        test.Assert().NotNil(consumer)
		
        err := s.callConsumerHandler(ctx, consumer)
        test.Assert().NoError(err)
    })
}
```

### Teste unitário de um serviço **subscriber**
```go
func TestSubscriber(t *testing.T) {
    t.Run("should succeed", func(t *testing.T) {
        test := ftesting.New(t, nil)
		
        // Cria um evento para ser enviado diretamente ao seu handler.
        event, err := ftesting.NewPubsubEvent(&ftesting.PubsubEventOptions{
            Type: sharedpb.EventType_EVENT_TYPE_FILE_CREATED,
            Data: files["image"].ProtoResponse(),
        })

        test.Assert().NoError(err)
        test.Assert().NotNil(event)

        f := NewFileCreatedHandler(s)
        err = f(ctx, event)
        test.Assert().NoError(err)
    })	
}
```

## Testando migrações

O Mikros fornece uma API específica para o teste de _scripts_ de migração. Ela
permite selecionar quais _scripts_ serão executados, além de utilizar o recurso de
poder ser executada sobre uma _collection_ "alternativa", isto é, com um nome
diferente do padrão. Também é possível determinar a origem destes _scripts_ que
serão executados, se pertencem ao diretório de migração comum ou de um ambiente
de _deploy_ específico.

> Importante: Para os testes de migração recomenda-se utilizar o recurso de
> **subsets** de testes para abranger e testar todos os _scripts_ presentes atualmente
> no serviço, um a um, ou seja, cada subset deve testar até um _script_
> específico (`UpTo`).

Exemplo:
```go
func TestDatabaseMigrations(t *testing.T) {
    t.Run("some important test is happening", func(t *testing.T) {
        test := ftesting.New(t, &ftesting.Options{
            Collections: map[string]string{
                "address": "test_migration_1",
            },
            Migration: &ftesting.MigrationOptions{
                // The last migration that will execute in this test, i.e.,
                // scripts 001 and 002 will also execute.
                UpTo: "003_add_new_field_uf.up.json",
            },
        })

        srv.SetupTest(ctx, test)
        defer srv.TeardownTest(ctx)

        // Insert some data to migrate
        adr := addresses["completed1"]
        _ = srv.Database().Insert(ctx, adr)

        err := test.Migrate(srv.ServiceName())
        test.Assert().NoError(err)

        // Validate migrated data
        // TODO
    })
}
```
