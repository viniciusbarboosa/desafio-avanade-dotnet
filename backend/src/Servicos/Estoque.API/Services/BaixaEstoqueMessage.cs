using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using Estoque.API.Data; // Para usar o DbContext
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace Estoque.API.Services
{
    // ========================================================================
    // DTOs: Modelos para entender as mensagens que chegam do RabbitMQ
    // ========================================================================

    // DTO para a mensagem de CRIAÇÃO de pedido (quando um pedido é novo)
    public class BaixaEstoqueMessage
    {
        public int PedidoId { get; set; }
        public List<ItemBaixa> Itens { get; set; } = new();
    }
    public class ItemBaixa
    {
        public int ProdutoId { get; set; }
        public int Quantidade { get; set; }
    }

    // DTO para a mensagem de ATUALIZAÇÃO de pedido (quando um pedido é editado)
    public class AtualizacaoEstoqueMessage
    {
        public int PedidoId { get; set; }
        public List<ItemDelta> ItensDelta { get; set; } = new();
    }
    public class ItemDelta
    {
        public int ProdutoId { get; set; }
        public int QuantidadeDelta { get; set; } // O campo chave! Pode ser positivo ou negativo.
    }


    // ========================================================================
    // A CLASSE DO CONSUMIDOR: O "OUVINTE" DO RABBITMQ
    // ========================================================================
    public class BaixaEstoqueConsumer : IHostedService
    {
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly IServiceProvider _serviceProvider;
        
        // Nomes das filas que vamos ouvir
        private const string FilaCriacao = "baixa-estoque-queue";
        private const string FilaAtualizacao = "atualizacao-estoque-queue";

        public BaixaEstoqueConsumer(IConfiguration configuration, IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
            
            var factory = new ConnectionFactory
            {
                HostName = configuration["RabbitMQ:Host"],
                Port = int.Parse(configuration["RabbitMQ:Port"]),
                UserName = configuration["RabbitMQ:Username"],
                Password = configuration["RabbitMQ:Password"]
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Garantimos que AMBAS as filas existem no RabbitMQ
            _channel.QueueDeclare(queue: FilaCriacao, durable: true, exclusive: false, autoDelete: false, arguments: null);
            _channel.QueueDeclare(queue: FilaAtualizacao, durable: true, exclusive: false, autoDelete: false, arguments: null);
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            var consumer = new EventingBasicConsumer(_channel);

            // Este é o "cérebro" que é ativado toda vez que uma mensagem chega
            consumer.Received += async (sender, eventArgs) =>
            {
                var body = eventArgs.Body.ToArray();
                var messageJson = Encoding.UTF8.GetString(body);

                try
                {
                    // LÓGICA DO "DETETIVE": Olhamos o texto da mensagem para decidir o que fazer
                    if (messageJson.Contains("ItensDelta", StringComparison.OrdinalIgnoreCase))
                    {
                        // Se a mensagem contém "ItensDelta", é uma ATUALIZAÇÃO de pedido
                        var mensagem = JsonSerializer.Deserialize<AtualizacaoEstoqueMessage>(messageJson);
                        if (mensagem != null)
                        {
                            await ProcessarAjuste(mensagem);
                        }
                    }
                    else
                    {
                        // Caso contrário, é uma CRIAÇÃO de pedido
                        var mensagem = JsonSerializer.Deserialize<BaixaEstoqueMessage>(messageJson);
                        if (mensagem != null)
                        {
                            await ProcessarBaixa(mensagem);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Se algo der errado, é importante logar o erro para não perdermos a mensagem.
                    // Idealmente, a mensagem seria enviada para uma "dead-letter queue".
                    // Console.WriteLine($"--> Erro ao processar mensagem: {ex.Message}");
                }
                finally
                {
                    // Confirma para o RabbitMQ que a mensagem foi processada (com sucesso ou falha)
                    // e pode ser removida da fila.
                    _channel.BasicAck(eventArgs.DeliveryTag, false);
                }
            };

            // Dizemos ao RabbitMQ para começar a ouvir AMBAS as filas usando o mesmo consumidor
            _channel.BasicConsume(FilaCriacao, false, consumer);
            _channel.BasicConsume(FilaAtualizacao, false, consumer);
            
            return Task.CompletedTask;
        }

        // Método para processar CRIAÇÃO (seu código original, sem alterações)
        private async Task ProcessarBaixa(BaixaEstoqueMessage mensagem)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EstoqueDbContext>();

            foreach (var item in mensagem.Itens)
            {
                var produto = await context.Produtos.FindAsync(item.ProdutoId);
                if (produto != null && produto.QuantidadeEmEstoque >= item.Quantidade)
                {
                    produto.QuantidadeEmEstoque -= item.Quantidade;
                }
                else
                {
                    // LOG_CRITICO: Falha ao dar baixa para o PedidoId {mensagem.PedidoId}
                }
            }
            await context.SaveChangesAsync();
        }
        
        // MÉTODO NOVO: para processar ATUALIZAÇÃO de um pedido
        private async Task ProcessarAjuste(AtualizacaoEstoqueMessage mensagem)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EstoqueDbContext>();

            foreach (var item in mensagem.ItensDelta)
            {
                var produto = await context.Produtos.FindAsync(item.ProdutoId);
                if (produto != null)
                {
                    // AQUI ESTÁ A MÁGICA:
                    // Se QuantidadeDelta for +2 (vendeu mais 2), ele faz: Estoque = Estoque - 2.
                    // Se QuantidadeDelta for -3 (devolveu 3), ele faz: Estoque = Estoque - (-3), que é Estoque = Estoque + 3.
                    produto.QuantidadeEmEstoque -= item.QuantidadeDelta;
                }
                 else
                {
                    // LOG_CRITICO: Produto não encontrado ao tentar ajustar o estoque para o PedidoId {mensagem.PedidoId}
                }
            }
            await context.SaveChangesAsync();
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _channel.Close();
            _connection.Close();
            return Task.CompletedTask;
        }
    }
}