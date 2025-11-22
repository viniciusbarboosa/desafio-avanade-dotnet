using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace Vendas.API.Services;
public class RabbitMQProducer : IMessageProducer
{
    private readonly IConfiguration _configuration;

    public RabbitMQProducer(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void PublishMessage<T>(T message, string queueName)
    {
        // Pega as configurações do appsettings.json
        // =======================================================================
        // AQUI ESTÁ A CORREÇÃO -> Usando o nome completo da classe
        // =======================================================================
        var factory = new RabbitMQ.Client.ConnectionFactory
        {
            HostName = _configuration["RabbitMQ:Host"],
            Port = int.Parse(_configuration["RabbitMQ:Port"]),
            UserName = _configuration["RabbitMQ:Username"],
            Password = _configuration["RabbitMQ:Password"]
        };

        // Cria a conexão e o canal de comunicação
        using (var connection = factory.CreateConnection())
        using (var channel = connection.CreateModel())
        {
            // Declara a fila. Se ela não existir, será criada.
            // durable: true -> A fila sobrevive se o RabbitMQ reiniciar.
            channel.QueueDeclare(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            // Serializa o objeto da mensagem para JSON
            var jsonMessage = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(jsonMessage);

            // Publica a mensagem na fila especificada
            channel.BasicPublish(
                exchange: "", // Exchange padrão
                routingKey: queueName,
                basicProperties: null,
                body: body);
        }
    }
}