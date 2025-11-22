public interface IMessageProducer
{
    void PublishMessage<T>(T message, string queueName);
}