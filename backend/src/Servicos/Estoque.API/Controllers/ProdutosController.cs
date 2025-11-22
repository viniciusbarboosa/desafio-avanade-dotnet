using Estoque.API.Data;
using Estoque.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

public class EstatisticasEstoqueDto
{
    public int TotalProdutos { get; set; }
    public int QuantidadeTotalEmEstoque { get; set; }
}

namespace Estoque.API.Controllers
{
    [ApiController]
    [Route("api/produtos")]
    [Authorize]
    public class ProdutosController : ControllerBase
    {
        private readonly EstoqueDbContext _context;

        public ProdutosController(EstoqueDbContext context)
        {
            _context = context;
        }

        [HttpGet("estatisticas")]
        public async Task<IActionResult> GetEstatisticasDeEstoque()
        {
            // Conta o número de linhas na tabela Produtos
            var totalProdutos = await _context.Produtos.CountAsync();

            // Soma a coluna QuantidadeEmEstoque de todos os produtos
            var quantidadeTotal = await _context.Produtos.SumAsync(p => p.QuantidadeEmEstoque);

            var estatisticas = new EstatisticasEstoqueDto
            {
                TotalProdutos = totalProdutos,
                QuantidadeTotalEmEstoque = quantidadeTotal
            };

            return Ok(estatisticas);
        }

        [HttpPost]
        public async Task<IActionResult> CadastrarProduto([FromBody] Produto produto)
        {
            if (produto == null)
            {
                return BadRequest("Dados invalidos");
            }

            _context.Produtos.Add(produto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(ObterProdutoPorId), new { id = produto.Id }, produto);
        }

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

        [HttpGet]
        public async Task<IActionResult> ListarProdutos()
        {
            var produtos = await _context.Produtos.ToListAsync();
            return Ok(produtos);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarProduto(int id, [FromBody] Produto produtoAtualizado)
        {
            if (id != produtoAtualizado.Id)
            {
                return BadRequest("O ID da rota não corresponde ao ID do produto.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            //TEm que marcar como modificada pra entender que precisa modificar
            _context.Entry(produtoAtualizado).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Produtos.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        [HttpPatch("{id}/dar-baixa")]
        public async Task<IActionResult> DarBaixaEstoque(int id, [FromBody] BaixaEstoqueRequest request)
        {
            if (request.Quantidade <= 0)
            {
                return BadRequest("A quantidade para dar baixa deve ser maior que zero.");
            }

            var produto = await _context.Produtos.FindAsync(id);

            if (produto == null)
            {
                return NotFound($"Produto com ID {id} não encontrado.");
            }

            if (produto.QuantidadeEmEstoque < request.Quantidade)
            {
                return BadRequest($"Estoque insuficiente para o produto '{produto.Nome}'. Solicitado: {request.Quantidade}, Disponível: {produto.QuantidadeEmEstoque}.");
            }

            produto.QuantidadeEmEstoque -= request.Quantidade;

            _context.Produtos.Update(produto);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }


}