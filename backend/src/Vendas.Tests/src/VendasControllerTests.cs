using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using System.Net.Http;
using System.Threading.Tasks;
using Vendas.API.Data;
using Vendas.API.Models;
using Vendas.API.Services;
using System;

namespace Vendas.Tests
{
    public class VendasControllerTests
    {
        private VendasDbContext GetVendasContext()
        {
            var options = new DbContextOptionsBuilder<VendasDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new VendasDbContext(options);
        }

        [Fact]
        public async Task GetEstatisticas_DeveCalcularTotalCorretamente()
        {
            //ARRANGE = CRIA AMBIENTE 
            var context = GetVendasContext();
            context.Pedidos.Add(new Pedido { Id = 1, ValorTotal = 100 });
            context.Pedidos.Add(new Pedido { Id = 2, ValorTotal = 50 });
            await context.SaveChangesAsync();

            //CRTIA MOCK FALSO PQ O CONTROLLER LA PEDE 
            var mockHttp = new Mock<IHttpClientFactory>();
            var mockConfig = new Mock<IConfiguration>();
            var mockHttpContext = new Mock<IHttpContextAccessor>();
            var mockRabbit = new Mock<IMessageProducer>();

            var controller = new VendasController(
                context,
                mockHttp.Object,
                mockConfig.Object,
                mockHttpContext.Object,
                mockRabbit.Object
            );

            //ACT = RESULTADO
            var resultado = await controller.GetEstatisticas();

            //ASSERT = VER SE DEU CERTO
            var okResult = Assert.IsType<OkObjectResult>(resultado);
            var stats = Assert.IsType<EstatisticasVendasDto>(okResult.Value);

            Assert.Equal(2, stats.TotalDeVendas); 
            Assert.Equal(150, stats.ValorTotalArrecadado); 
        }
    }
}