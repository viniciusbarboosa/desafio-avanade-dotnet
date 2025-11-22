using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Autenticacao.API.Models
{
    public class UsuarioLogin
    {
        public string Email { get; set; } = string.Empty; 
        public string Senha { get; set; } = string.Empty;
    }
}