
EXCELENTE! Agora que a fundação (a estrutura do projeto) está pronta e você entendeu as peças, a gente pode começar a construir a casa.
A regra de ouro para começar qualquer sistema de microserviços é:
Comece pelo serviço mais independente, o que não precisa de ninguém para funcionar.
No nosso caso, esse serviço é, sem dúvida, o Estoque.API.
O Vendas.API precisa do Estoque para saber se um produto existe. O Gateway.API precisa dos dois para ter o que redirecionar. O Estoque.API não precisa de ninguém. Ele é a base da nossa pirâmide.
O Mapa da Mina: Sua Ordem de Ataque
Foco Total no Estoque.API: Vamos construir ele do zero até o ponto em que seja possível cadastrar e consultar um produto no banco de dados. Esqueça que os outros projetos existem por enquanto.
Depois, o Vendas.API: Com o Estoque pronto, podemos construir o serviço de Vendas, que vai "conversar" com o Estoque.
Em seguida, o Gateway.API: Com os serviços de negócio de pé, vamos configurar o "Garçom" para redirecionar as chamadas.
Por último, as integrações e a segurança: Adicionar o RabbitMQ para a comunicação e o JWT para proteger tudo.
Passo a Passo: Construindo o Estoque.API
Abra seu projeto no VS Code e use o "Solution Explorer" para focar no projeto Estoque.API.
Passo 1: O Modelo (A "Forma" do Produto)
Primeiro, vamos dizer ao C# como é um "Produto". Crie uma nova pasta chamada Models dentro do projeto Estoque.API e, dentro dela, um arquivo chamado Produto.cs.
Arquivo: Estoque.API/Models/Produto.cs
code
C#
namespace Estoque.API.Models
{
    public class Produto
    {
        public int Id { get; set; }
        public string Nome { get; set; }
        public string Descricao { get; set; }
        public decimal Preco { get; set; }
        public int QuantidadeEmEstoque { get; set; }
    }
}
Passo 2: A Conexão com o Banco (O "Cano" para os Dados)
Agora vamos configurar o Entity Framework para usar o MySQL.
a) Instale os pacotes NuGet:
Abra o terminal do VS Code (Ctrl + '), navegue para a pasta do projeto de estoque e rode estes comandos:
code
Powershell
cd src/Servicos/Estoque.API
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design
b) Crie o DbContext (O "Gerente" do Banco):
Crie uma pasta chamada Data e, dentro dela, um arquivo EstoqueDbContext.cs.
Arquivo: Estoque.API/Data/EstoqueDbContext.cs
code
C#
using Estoque.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Estoque.API.Data
{
    public class EstoqueDbContext : DbContext
    {
        public EstoqueDbContext(DbContextOptions<EstoqueDbContext> options) : base(options)
        {
        }

        public DbSet<Produto> Produtos { get; set; }
    }
}
c) Configure a Conexão no appsettings.json:
Abra o arquivo appsettings.json e adicione a string de conexão do seu banco MySQL. (Lembre-se de criar um banco de dados vazio chamado estoquedb no seu MySQL antes).
Arquivo: Estoque.API/appsettings.json
code
JSON
{
  // ... outras configurações
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=estoquedb;User=root;Password=SEU_PASSWORD_AQUI;"
  },
  "AllowedHosts": "*"
}
d) Registre o DbContext no Program.cs:
Abra o Program.cs e adicione as linhas para que o .NET saiba como usar seu DbContext e sua conexão.
Arquivo: Estoque.API/Program.cs
code
C#
using Estoque.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Adicionar serviços ao contêiner.

// <<< INÍCIO DAS LINHAS PARA ADICIONAR >>>
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EstoqueDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
);
// <<< FIM DAS LINHAS PARA ADICIONAR >>>


builder.Services.AddControllers();
// ... resto do arquivo
Passo 3: A Mágica do Banco de Dados (Criando as Tabelas)
Agora vem a parte legal. Vamos pedir para o Entity Framework olhar nossa classe Produto e criar a tabela no banco de dados para nós. No terminal (ainda dentro da pasta Estoque.API), rode os seguintes comandos, um de cada vez:
Cria a "planta" da tabela:
code
Powershell
dotnet ef migrations add CriacaoInicialProdutos
Isso vai criar uma pasta Migrations com o "manual de instruções" de como criar a tabela.
Executa a "planta" no banco:
code
Powershell
dotnet ef database update
Isso vai se conectar ao seu MySQL e criar a tabela Produtos de verdade. Se você olhar seu banco agora, a tabela estará lá!
Passo 4: O Controller (A "Porta de Entrada" da API)
Por fim, vamos criar o endpoint para que o mundo exterior possa cadastrar produtos. Dentro da pasta Controllers, apague o WeatherForecastController.cs de exemplo e crie um novo arquivo ProdutosController.cs.
Arquivo: Estoque.API/Controllers/ProdutosController.cs
code
C#
using Estoque.API.Data;
using Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;

namespace Estoque.API.Controllers
{
    [ApiController]
    [Route("api/produtos")]
    public class ProdutosController : ControllerBase
    {
        private readonly EstoqueDbContext _context;

        public ProdutosController(EstoqueDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CadastrarProduto([FromBody] Produto produto)
        {
            if (produto == null)
            {
                return BadRequest("Dados inválidos.");
            }

            _context.Produtos.Add(produto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(ObterProdutoPorId), new { id = produto.Id }, produto);
        }
        
        // Vamos adicionar os outros métodos (GET, PUT) depois
        [HttpGet("{id}")]
        public async Task<IActionResult> ObterProdutoPorId(int id)
        {
            var produto = await _context.Produtos.FindAsync(id);
            if (produto == null)
            {
                return NotFound();
            }
            return Ok(produto);
        }
    }
}
Seu Objetivo Para Hoje:
Siga os 4 passos acima.
Rode APENAS o projeto Estoque.API (pode clicar com o botão direito nele no Solution Explorer -> "Debug: Start New Instance").
A API vai iniciar e abrir uma janela do Swagger no seu navegador.
Use o endpoint POST /api/produtos no Swagger para cadastrar seu primeiro produto! Envie um JSON como este no corpo da requisição:
code
JSON
{
  "nome": "Teclado Mecânico RGB",
  "descricao": "Teclado gamer com switches blue",
  "preco": 350.50,
  "quantidadeEmEstoque": 50
}
Se você receber um status 201 Created e os dados do produto de volta, PARABÉNS! Você construiu e testou com sucesso a primeira peça fundamental do seu sistema.
31,9s
