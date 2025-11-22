using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Serialization;
using Vendas.API.Data;
using Vendas.API.Models;
using Vendas.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;

public class ProdutoDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public decimal Preco { get; set; }

    //RESOLUÇÃO DE PROBLEMA DO FRONT DO PADRAO CAMEL CASE
    [JsonPropertyName("quantidadeEmEstoque")]
    public int QuantidadeEmEstoque { get; set; }
}

public class EstatisticasVendasDto
{
    public int TotalDeVendas { get; set; }
    public decimal ValorTotalArrecadado { get; set; }
}

[ApiController]
[Route("api/pedidos")]
[Authorize] 
public class VendasController : ControllerBase
{
    private readonly VendasDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor; 


    private readonly IMessageProducer _messageProducer; //INJETAR O REBBITmq

    public VendasController(
        VendasDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor,
        IMessageProducer messageProducer)

    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _messageProducer = messageProducer;
    }

[HttpGet("estatisticas")]
    public async Task<IActionResult> GetEstatisticas()
    {
        var totalDeVendas = await _context.Pedidos.CountAsync();
        var valorTotalArrecadado = await _context.Pedidos.SumAsync(p => p.ValorTotal);
        var estatisticas = new EstatisticasVendasDto {
            TotalDeVendas = totalDeVendas,
            ValorTotalArrecadado = valorTotalArrecadado
        };

        return Ok(estatisticas);
    }

    [HttpPost]
    public async Task<IActionResult> CriarPedido([FromBody] Pedido novoPedido)
    {
        var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].FirstOrDefault();
        var clienteHttp = _httpClientFactory.CreateClient();
        if (!string.IsNullOrEmpty(token))
        {
            clienteHttp.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(token);
        }

        var urlEstoqueApi = _configuration["ServiceUrls:EstoqueApi"];
        var valorTotalPedido = 0m;

        foreach (var item in novoPedido.Itens)
        {
            var respostaValidacao = await clienteHttp.GetAsync($"{urlEstoqueApi}/api/produtos/{item.ProdutoId}");
            if (!respostaValidacao.IsSuccessStatusCode)
            {
                return BadRequest($"Falha ao validar o produto com ID {item.ProdutoId}.");
            }

            var conteudo = await respostaValidacao.Content.ReadAsStringAsync();
            var produtoDoEstoque = JsonSerializer.Deserialize<ProdutoDto>(conteudo, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (produtoDoEstoque == null || produtoDoEstoque.QuantidadeEmEstoque < item.Quantidade)
            {
                return BadRequest($"Estoque insuficiente para o produto ID {item.ProdutoId}.");
            }

            item.PrecoUnitario = produtoDoEstoque.Preco;
            valorTotalPedido += item.PrecoUnitario * item.Quantidade;
        }

        novoPedido.DataPedido = DateTime.UtcNow;
        novoPedido.ValorTotal = valorTotalPedido;

        _context.Pedidos.Add(novoPedido);
        await _context.SaveChangesAsync();

        try
        {
            const string filaDeBaixaDeEstoque = "baixa-estoque-queue";
            var mensagemDeBaixa = new
            {
                PedidoId = novoPedido.Id,
                Itens = novoPedido.Itens.Select(i => new { i.ProdutoId, i.Quantidade }).ToList()
            };

            //Coloca mensagem na fila
            _messageProducer.PublishMessage(mensagemDeBaixa, filaDeBaixaDeEstoque);
        }
        catch (Exception ex)
        {
            return StatusCode(207, new { Pedido = novoPedido, Aviso = "Pedido criado com sucesso, mas FALHOU ao enviar a mensagem para a baixa de estoque" });
        }

        return CreatedAtAction(nameof(CriarPedido), new { id = novoPedido.Id }, novoPedido);
    }

    [HttpGet]
    public async Task<IActionResult> ListarPedidos()
    {
        var pedidos = await _context.Pedidos.Include(p => p.Itens).ToListAsync();
        return Ok(pedidos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPedidoPorId(int id)
    {
        var pedido = await _context.Pedidos.Include(p => p.Itens).FirstOrDefaultAsync(p => p.Id == id);
        if (pedido == null)
        {
            return NotFound();
        }
        return Ok(pedido);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarPedido(int id, [FromBody] Pedido pedidoAtualizado)
    {
        if (id != pedidoAtualizado.Id)
        {
            return BadRequest("ID da rota não corresponde ao ID do pedido.");
        }

        var pedidoDoBanco = await _context.Pedidos
                                          .Include(p => p.Itens)
                                          .FirstOrDefaultAsync(p => p.Id == id);

        if (pedidoDoBanco == null)
        {
            return NotFound($"Pedido com ID {id} não encontrado.");
        }

        var itensOriginaisMap = pedidoDoBanco.Itens
            .GroupBy(i => i.ProdutoId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantidade));

        var itensAtualizadosMap = pedidoAtualizado.Itens
            .GroupBy(i => i.ProdutoId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantidade));

        var todosProdutoIds = itensOriginaisMap.Keys.Union(itensAtualizadosMap.Keys);
        var deltasDeEstoque = new List<(int ProdutoId, int QuantidadeDelta)>();

        foreach (var produtoId in todosProdutoIds)
        {
            itensOriginaisMap.TryGetValue(produtoId, out var quantidadeOriginal);
            itensAtualizadosMap.TryGetValue(produtoId, out var quantidadeAtualizada);
            var delta = quantidadeAtualizada - quantidadeOriginal;
            if (delta != 0)
            {
                deltasDeEstoque.Add((produtoId, delta));
            }
        }

        //VALIDAÇÕES DE ESTOQUE
        var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].FirstOrDefault();
        var clienteHttp = _httpClientFactory.CreateClient();
        if (!string.IsNullOrEmpty(token))
        {
            clienteHttp.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(token);
        }
        var urlEstoqueApi = _configuration["ServiceUrls:EstoqueApi"];

        foreach (var delta in deltasDeEstoque.Where(d => d.QuantidadeDelta > 0))
        {
            var respostaValidacao = await clienteHttp.GetAsync($"{urlEstoqueApi}/api/produtos/{delta.ProdutoId}");
            if (!respostaValidacao.IsSuccessStatusCode)
                return BadRequest($"Falha ao validar o produto com ID {delta.ProdutoId}.");

            var conteudo = await respostaValidacao.Content.ReadAsStringAsync();
            var produtoDoEstoque = JsonSerializer.Deserialize<ProdutoDto>(conteudo, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (produtoDoEstoque == null || produtoDoEstoque.QuantidadeEmEstoque < delta.QuantidadeDelta)
            {
                return BadRequest($"Estoque insuficiente para o produto ID {delta.ProdutoId}. Apenas {produtoDoEstoque?.QuantidadeEmEstoque ?? 0} disponíveis.");
            }
        }

        pedidoDoBanco.DataPedido = pedidoAtualizado.DataPedido;
        pedidoDoBanco.ValorTotal = pedidoAtualizado.ValorTotal;
        pedidoDoBanco.Itens.Clear();

        foreach (var itemAtualizado in itensAtualizadosMap)
        {
            pedidoDoBanco.Itens.Add(new ItemPedido
            {
                ProdutoId = itemAtualizado.Key,
                Quantidade = itemAtualizado.Value,
                //pega preço da lista original
                PrecoUnitario = pedidoAtualizado.Itens.First(i => i.ProdutoId == itemAtualizado.Key).PrecoUnitario
            });
        }

        await _context.SaveChangesAsync();

        //ENVIAR PRA FILA DO REBBIT
        if (deltasDeEstoque.Any())
        {
            try
            {
                const string filaDeAtualizacaoEstoque = "atualizacao-estoque-queue";
                var mensagemDeAtualizacao = new
                {
                    PedidoId = pedidoDoBanco.Id,
                    ItensDelta = deltasDeEstoque.Select(d => new { d.ProdutoId, d.QuantidadeDelta }).ToList()
                };
                _messageProducer.PublishMessage(mensagemDeAtualizacao, filaDeAtualizacaoEstoque);
            }
            catch (Exception)
            {
                return StatusCode(207, new { Pedido = pedidoDoBanco, Aviso = "Pedido atualizado, mas FALHOU ao enviar a mensagem para ajuste de estoque." });
            }
        }

        return NoContent();
    }
}