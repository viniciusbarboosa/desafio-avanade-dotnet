using Autenticacao.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Autenticacao.API.Data
{
    public class AutenticacaoDbContext : DbContext
    {
        public AutenticacaoDbContext(DbContextOptions<AutenticacaoDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
    }
}