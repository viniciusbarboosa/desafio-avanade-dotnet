dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer

Não vamos misturar a lógica de usuários com a de produtos. Vamos criar um novo microserviço, especialista SÓ em autenticação, como pede a boa prática.
Criar o Autenticacao.API: Um novo projeto, nossa "Portaria".
Instalar os Pacotes JWT: Nos lugares certos.
Criar o Endpoint de Login: No Autenticacao.API, vamos criar o POST /login que, se o usuário e senha estiverem corretos, devolve o "crachá" (token JWT).
Proteger um Endpoint no Estoque.API: Vamos trancar a porta do ProdutosController e dizer que só entra quem apresentar um "crachá" válido.
Testar o Fluxo Completo: Pegar o crachá na portaria e usar para entrar no bar.
Passo a Passo da Construção
Passo 1: Criar o Microserviço de Autenticação
No terminal, na pasta raiz do seu projeto (DesafioMicroservicos), rode estes comandos:
code
Powershell
# Cria o projeto da API de Autenticação
dotnet new webapi -n Autenticacao.API -o src/Servicos/Autenticacao.API -f net9.0

# Adiciona o novo projeto à nossa Solução
dotnet sln add src/Servicos/Autenticacao.API/Autenticacao.API.csproj
Passo 2: Instalar o Pacote de Autenticação JWT
Precisamos instalar o pacote que sabe criar e validar os tokens. Rode este comando para CADA UM dos projetos (Autenticacao.API, Estoque.API, Vendas.API e Gateway.API), pois todos eles precisarão lidar com o token de alguma forma.
code
Powershell
# Entre na pasta de cada projeto e rode o comando abaixo
cd src/Servicos/Autenticacao.API
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
cd ../../../ # volta para a raiz
# Repita para Estoque.API, Vendas.API e Gateway.API
Passo 3: Criar o Endpoint de Login (em Autenticacao.API)
É aqui que vamos gerar o token.
a) Crie um Modelo de Usuário Simples:
Em Autenticacao.API, crie uma pasta Models e um arquivo UsuarioLogin.cs.
code
C#
public class UsuarioLogin
{
    public string Usuario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
b) Configure os "Segredos" do Token no appsettings.json:
O token precisa de uma chave secreta para ser assinado. NUNCA coloque isso direto no código.
Abra o appsettings.json do Autenticacao.API e adicione a seção Jwt.
code
JSON
{
  // ...
  "Jwt": {
    "Key": "MINHA_CHAVE_SECRETA_SUPER_LONGA_E_SEGURA_PARA_O_DESAFIO_DIO",
    "Issuer": "MeuApp",
    "Audience": "MeuAppUsuarios"
  }
}
c) Crie o AutenticacaoController.cs:
Apague o controller de exemplo e crie este. Por enquanto, vamos "fingir" que o usuário e senha corretos são "dio" e "123".
code
C#
using Autenticacao.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/autenticacao")]
public class AutenticacaoController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AutenticacaoController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] UsuarioLogin usuarioLogin)
    {
        // Lógica de validação - AQUI VOCÊ IRIA NO BANCO DE DADOS
        if (usuarioLogin.Usuario == "dio" && usuarioLogin.Senha == "123")
        {
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("Id", Guid.NewGuid().ToString()),
                    new Claim(JwtRegisteredClaimNames.Sub, usuarioLogin.Usuario),
                    new Claim(JwtRegisteredClaimNames.Email, usuarioLogin.Usuario + "@email.com"),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                }),
                Expires = DateTime.UtcNow.AddMinutes(5), // Token expira em 5 minutos
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha512Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var stringToken = tokenHandler.WriteToken(token);

            return Ok(new { token = stringToken });
        }

        return Unauthorized();
    }
}
```*   **Não se esqueça de ajustar o `Program.cs` do `Autenticacao.API`** para ter `AddControllers()`, `MapControllers()`, etc., igual fizemos no de Estoque.
Passo 4: Proteger o Estoque.API
Agora vamos para o Estoque.API e trancar a porta.
a) Adicione a mesma seção Jwt no appsettings.json do Estoque.API. A Chave, Issuer e Audience precisam ser IDÊNTICOS ao do Autenticacao.API.
b) Configure a Validação do Token no Program.cs do Estoque.API:
code
C#
// ... outros usings
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
// ... DbContext, AddControllers(), AddSwaggerGen()...

// <<< INÍCIO DA CONFIGURAÇÃO DE AUTENTICAÇÃO >>>
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});
// <<< FIM DA CONFIGURAÇÃO DE AUTENTICAÇÃO >>>

var app = builder.Build();
// ...
app.UseHttpsRedirection();

// <<< ADICIONE ESTAS DUAS LINHAS, NESTA ORDEM! >>>
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
c) Tranque o Controller:
Abra o ProdutosController.cs e adicione [Authorize] em cima da classe.
code
C#
using Microsoft.AspNetCore.Authorization; // Adicione este using

[ApiController]
[Route("api/produtos")]
[Authorize] // <-- A MÁGICA ACONTECE AQUI
public class ProdutosController : ControllerBase
{
    // ... resto do código
}
Passo 5: O Teste Final (A Festa Completa)
Rode as duas APIs ao mesmo tempo: Estoque.API e Autenticacao.API.
Vá para o Swagger do Autenticacao.API.
Use o endpoint POST /api/autenticacao/login com o corpo:
code
JSON
{ "usuario": "dio", "senha": "123" }
Ele vai te devolver uma resposta com o token. Copie essa string gigante do token.
Agora vá para o Swagger do Estoque.API.
No canto superior direito, você verá um botão "Authorize". Clique nele.
Na janelinha que abrir, digite a palavra Bearer, dê um espaço, e cole o token que você copiou. Ficará assim: Bearer eyJhbGciOiJIUzI1NiIsIn...
Clique em "Authorize" e feche a janela. Agora você está "logado" no Swagger.
Tente usar o POST /api/produtos. Ele vai funcionar!
Faça o teste final: Clique no botão "Authorize" de novo e em "Logout". Tente usar o POST /api/produtos de novo. Você receberá um erro 401 Unauthorized.
PARABÉNS! Você acabou de implementar um fluxo de autenticação e autorização completo com JWT em uma arquitetura de microserviços.
42,4s




SWAG

dotnet add package Swashbuckle.AspNetCore


CONECTEI O BANCO SACA 
o banco, vamos rodar a migration, e vamos fazer o login funcionar de verdade. Mas faremos isso no banco de dados próprio do serviço de autenticação, do jeito certo.
Plano de Jogo: Conectando a Autenticação ao Banco de Dados
Passo 1: O Modelo Usuario (Para o Banco de Dados)
Dentro do Autenticacao.API, na pasta Models, crie um novo arquivo Usuario.cs. Este modelo representa a tabela de usuários no banco.
Arquivo: Autenticacao.API/Models/Usuario.cs
code
C#
namespace Autenticacao.API.Models
{
    public class Usuario
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        
        // Em um projeto real, NUNCA guarde a senha em texto.
        // Guarde um HASH da senha. Por agora, vamos manter simples.
        public string Senha { get; set; } = string.Empty; 
    }
}
Passo 2: Configurar o Entity Framework no Autenticacao.API
a) Instale os pacotes NuGet (se ainda não fez para este projeto):
No terminal, dentro da pasta src/Servicos/Autenticacao.API:
code
Powershell
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design
b) Crie o DbContext para Autenticação:
Crie uma pasta Data no Autenticacao.API e, dentro dela, o arquivo AutenticacaoDbContext.cs.
Arquivo: Autenticacao.API/Data/AutenticacaoDbContext.cs
code
C#
using Autenticacao.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Autenticacao.API.Data
{
    public class AutenticacaoDbContext : DbContext
    {
        public AutenticacaoDbContext(DbContextOptions<AutenticacaoDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
    }
}
c) Configure a Conexão no appsettings.json:
Abra o appsettings.json do Autenticacao.API e adicione a string de conexão para o novo banco de dados autenticacaodb.
Arquivo: Autenticacao.API/appsettings.json
code
JSON
{
  // ...
  "ConnectionStrings": {
    // Banco de dados SEPARADO para autenticação
    "DefaultConnection": "Server=localhost;Database=autenticacaodb;User=root;Password=SEU_PASSWORD_AQUI;"
  },
  "Jwt": { // Mantenha a configuração do JWT
    "Key": "MINHA_CHAVE_SECRETA_SUPER_LONGA_E_SEGURA_PARA_O_DESAFIO_DIO",
    "Issuer": "MeuApp",
    "Audience": "MeuAppUsuarios"
  }
}
d) Atualize o Program.cs para registrar o DbContext:
Arquivo: Autenticacao.API/Program.cs (Atualizado)
code
C#
// Adicione os usings necessários no topo
using Autenticacao.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ...

// <<< ADICIONE ESTA SEÇÃO DE CONFIGURAÇÃO DO BANCO >>>
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AutenticacaoDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
);

builder.Services.AddControllers();
// ... resto do arquivo
Passo 3: Rodar a Migration!
Agora sim! No terminal, na pasta src/Servicos/Autenticacao.API:
code
Powershell
# Cria a migration para a tabela Usuarios
dotnet ef migrations add CriacaoTabelaUsuarios

# Aplica a migration e cria a tabela no banco autenticacaodb
dotnet ef database update
Se você olhar no seu MySQL, um novo banco autenticacaodb com uma tabela Usuarios foi criado!
Passo 4: Inserir um Usuário de Teste no Banco
Para podermos testar o login, precisamos de um usuário no banco. Use uma ferramenta como DBeaver, HeidiSQL ou o MySQL Workbench e execute este comando SQL no seu banco autenticacaodb:
code
SQL
INSERT INTO Usuarios (Email, Senha) VALUES ('dio@teste.com', '123');
Passo 5: Alterar o AutenticacaoController para Usar o Banco
Finalmente, vamos mudar a lógica do controller para buscar o usuário no banco de dados em vez de usar o if "fake".
Arquivo: Autenticacao.API/Controllers/AutenticacaoController.cs (VERSÃO FINAL)
code
C#
using Autenticacao.API.Data; // <-- Adicionar using do Data
using Autenticacao.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // <-- Adicionar using do EF
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/autenticacao")]
public class AutenticacaoController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly AutenticacaoDbContext _context; // <-- Injetar o DbContext

    public AutenticacaoController(IConfiguration configuration, AutenticacaoDbContext context)
    {
        _configuration = configuration;
        _context = context; // <-- Atribuir o DbContext
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UsuarioLogin usuarioLogin) // <-- Mudar para async Task
    {
        // Lógica de validação AGORA VAI NO BANCO DE DADOS
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email == usuarioLogin.Email);

        // Verifica se o usuário existe e se a senha bate
        if (usuario != null && usuario.Senha == usuarioLogin.Senha) // TODO: Comparar a senha com HASH!
        {
            // O resto do código para gerar o token é EXATAMENTE O MESMO
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("Id", usuario.Id.ToString()), // Usar o ID do banco
                    new Claim(JwtRegisteredClaimNames.Sub, usuario.Email),
                    new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                }),
                Expires = DateTime.UtcNow.AddMinutes(5),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha512Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var stringToken = tokenHandler.WriteToken(token);

            return Ok(new { token = stringToken });
        }

        return Unauthorized("Usuário ou senha inválidos.");
    }
}
PRONTO!
Agora seu serviço de autenticação está robusto:
Ele tem seu próprio banco de dados (autenticacaodb).
Ele busca as credenciais do usuário nesse banco.
Ele gera o token JWT com base nos dados reais do usuário.
A proteção no Estoque.API continua exatamente a mesma. O fluxo de pegar o token e usar para acessar os produtos não mudou nada. O que mudou foi a "inteligência" por trás da geração do token.