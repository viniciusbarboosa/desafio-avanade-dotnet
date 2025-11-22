using Xunit;
using Microsoft.EntityFrameworkCore;
using Estoque.API.Controllers;
using Estoque.API.Data;
using Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Vendas.Tests
{
    public class ProdutosControllerTests
    {
        //CRIACAO DE UM BANCO DE DADOS FAKE
        private EstoqueDbContext GetDatabaseContext()
        {
            var options = new DbContextOptionsBuilder<EstoqueDbContext>()
                .UseInMemoryDatabase(databaseName: System.Guid.NewGuid().ToString())
                .Options;

            var databaseContext = new EstoqueDbContext(options);
            databaseContext.Database.EnsureCreated();
            return databaseContext;
        }

        [Fact]
        public async Task ListarProdutos_DeveRetornarListaDeProdutos()
        {
            //prepara o teste
            var context = GetDatabaseContext();
            context.Produtos.Add(new Produto { Id = 1, Nome = "mouse gamer", Preco = 50, QuantidadeEmEstoque = 10 });
            context.Produtos.Add(new Produto { Id = 2, Nome = "teclado mecanico", Preco = 150, QuantidadeEmEstoque = 5 });
            await context.SaveChangesAsync();

            var controller = new ProdutosController(context);

            //ACT = executa 
            var resultado = await controller.ListarProdutos();

            //ASSET = CONFERE SE DEU CERTO
            var okResult = Assert.IsType<OkObjectResult>(resultado);
            var lista = Assert.IsType<List<Produto>>(okResult.Value);

            Assert.Equal(2, lista.Count);
            Assert.Equal("mouse gamer", lista[0].Nome);
        }
    }
}