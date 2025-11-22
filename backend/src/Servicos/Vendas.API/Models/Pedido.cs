using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Vendas.API.Models
{
    public class Pedido
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; } 
        public DateTime DataPedido { get; set; }
        public decimal ValorTotal { get; set; }
        public List<ItemPedido> Itens { get; set; } = new();
    }
}