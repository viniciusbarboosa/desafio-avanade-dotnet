# Instalação e Configuração

Siga os passos abaixo para rodar o projeto localmente

## 1. Configuração do Banco de Dados
Certifique-se de ter o **MYSQL** rodando.

1. Crie um banco de dados vazio chamado **`estoquedb`**.
2. Aplique as Migrations para criar as tabelas (Autenticação,Estoque e Vendas).  
   No terminal, dentro da pasta de cada serviço rode (Importante ser na ordem acima Autenticação,Estoque e Vendas):
```bash
dotnet ef database update 
```

## 2. Executando o Backend (DOTNET E DOCKER)
Certifiuqe-se de esta na pasta backend no terminal e rode um restore

```bash
dotnet restore
```

agora rode um docker para o RabbitMQ para comunicação dos microserviços

```bash
docker run -d --name rabbitmqavanade -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Com o docker aberto abra cada serviço indo em cada pasta do 

Terminal 1 - Gateway

```bash
cd src/Gateway.API
dotnet run
```

Terminal 2 - Autenticação

```bash
cd src/Servicos/Autenticacao.API
dotnet run
```

Terminal 3 - Estoque

```bash
cd src/Servicos/Estoque.API
dotnet run
```
Terminal 4 - Vendas

```bash
cd src/Servicos/Vendas.API
dotnet run
```

## 3. Crie o primeiro usuário usando o postman ou semelhante
 O Front end optei por não colocar tela de cadastro
- Rota: POST http://localhost:5188/api/autenticacao/registrar

Corpo da requisição
```bash
{
  "email": "avanade@admin.com",
  "password": "avanade2026"
}
```

## 4. Executando o Frontend (NEXT.JS)
Abra um novo terminal na pasta de front end e instale as dependências

```bash
npm install
# DEPOIS DE INSTALADO PODE RODAR O SISTEMA
npm run dev
```

O sistema estará acessível em: http://localhost:3000
