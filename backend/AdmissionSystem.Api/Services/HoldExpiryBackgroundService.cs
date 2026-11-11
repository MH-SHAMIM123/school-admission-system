using Microsoft.EntityFrameworkCore;
using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.Models;

namespace AdmissionSystem.Api.Services;

public class HoldExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HoldExpiryBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(10);

    public HoldExpiryBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<HoldExpiryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("HoldExpiryBackgroundService started. Checking every {Interval}s.", _checkInterval.TotalSeconds);

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ExpireOverdueHoldsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while running hold expiry worker.");
            }
        }

        _logger.LogInformation("HoldExpiryBackgroundService stopped.");
    }

    private async Task ExpireOverdueHoldsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        var overdueHolds = await context.SeatHolds
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAtUtc <= now)
            .ToListAsync(cancellationToken);

        if (overdueHolds.Count > 0)
        {
            foreach (var hold in overdueHolds)
            {
                hold.Status = HoldStatus.Expired;
            }

            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Expired {Count} overdue seat holds at {Timestamp}", overdueHolds.Count, now);
        }
    }
}
