// Services/ITokenService.cs
using ClinicPlatform.Api.Models;

namespace ClinicPlatform.Api.Services;

public interface ITokenService
{
    string CreateToken(User user);
    DateTime GetExpiryUtc();
}
