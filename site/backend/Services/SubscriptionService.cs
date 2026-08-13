using SitePlatform.Api.Data;
using SitePlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace SitePlatform.Api.Services;

public class SubscriptionService(AppDbContext db)
{
    public static SubscriptionTier GetTier(int apartmentCount) => apartmentCount switch
    {
        <= 10 => SubscriptionTier.Free,
        <= 50 => SubscriptionTier.Starter,
        <= 200 => SubscriptionTier.Professional,
        _ => SubscriptionTier.Enterprise
    };

    public static int GetApartmentLimit(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 10,
        SubscriptionTier.Starter => 50,
        SubscriptionTier.Professional => 200,
        SubscriptionTier.Enterprise => int.MaxValue,
        _ => 10
    };

    public static decimal GetMonthlyPrice(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 0,
        SubscriptionTier.Starter => 500,
        SubscriptionTier.Professional => 1500,
        SubscriptionTier.Enterprise => 0,
        _ => 0
    };

    public async Task RefreshSiteTierAsync(int siteId)
    {
        var count = await db.Apartments.CountAsync(a => a.SiteId == siteId);
        var site = await db.Sites.FindAsync(siteId);
        if (site is null) return;
        site.Tier = GetTier(count);
        await db.SaveChangesAsync();
    }
}
