using Autenticacao.API.Data;
using Autenticacao.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/autenticacao")]
public class AutenticacaoController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly AutenticacaoDbContext _context;

    public AutenticacaoController(IConfiguration configuration, AutenticacaoDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    //SE EU QUISER CRIAR UM USUARIO NO POSTMAN(nao tem tela no front de cadastro)
    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar([FromBody] UsuarioLogin novoUsuario)
    {

        if (await _context.Usuarios.AnyAsync(u => u.Email == novoUsuario.Email))
        {
            return BadRequest("E-mail já cadastrado.");
        }

        var senhaHash = BCrypt.Net.BCrypt.HashPassword(novoUsuario.Senha);

        var usuario = new Usuario
        {
            Email = novoUsuario.Email,
            Senha = senhaHash 
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Usuário registrado com sucesso!" });
    }


    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UsuarioLogin usuarioLogin)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email == usuarioLogin.Email);

        if (usuario == null || !BCrypt.Net.BCrypt.Verify(usuarioLogin.Senha, usuario.Senha))
        {
            return Unauthorized("Usuário ou senha inválidos.");
        }

        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        
        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrEmpty(jwtKey))
        {
            throw new InvalidOperationException("A chave JWT não foi configurada no appsettings.json.");
        }
        var key = Encoding.ASCII.GetBytes(jwtKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("Id", usuario.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Email),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            }),
            Expires = DateTime.UtcNow.AddMinutes(5),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var stringToken = tokenHandler.WriteToken(token);

        return Ok(new { token = stringToken });
    }
}