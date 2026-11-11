using System.Collections.Concurrent;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using AdmissionSystem.Api.Common;
using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Models;

namespace AdmissionSystem.Api.Services;

public class AdmissionService : IAdmissionService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _classLocks = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _holdLocks = new();

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdmissionService> _logger;

    public AdmissionService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<AdmissionService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ServiceResult<ClassResponse>> CreateClassAsync(CreateClassRequest request)
    {
        var schoolClass = new SchoolClass
        {
            Id = "c_" + Guid.NewGuid().ToString("N")[..8],
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.SchoolClasses.Add(schoolClass);
        await _context.SaveChangesAsync();

        var response = new ClassResponse
        {
            Id = schoolClass.Id,
            Name = schoolClass.Name,
            TotalSeats = schoolClass.TotalSeats,
            HeldSeats = 0,
            ConfirmedSeats = 0,
            AvailableSeats = schoolClass.TotalSeats
        };

        _logger.LogInformation("Created new class {ClassId} with {TotalSeats} seats", schoolClass.Id, schoolClass.TotalSeats);
        return ServiceResult<ClassResponse>.Success(response, 201);
    }

    public async Task<ServiceResult<List<ClassResponse>>> GetAllClassesAsync()
    {
        var now = DateTime.UtcNow;
        var classes = await _context.SchoolClasses
            .Include(c => c.Holds)
            .AsNoTracking()
            .OrderBy(c => c.CreatedAtUtc)
            .ToListAsync();

        var response = classes.Select(c =>
        {
            var confirmedSeats = c.Holds.Count(h => h.Status == HoldStatus.Confirmed);
            var heldSeats = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAtUtc > now);
            var availableSeats = Math.Max(0, c.TotalSeats - (confirmedSeats + heldSeats));

            return new ClassResponse
            {
                Id = c.Id,
                Name = c.Name,
                TotalSeats = c.TotalSeats,
                HeldSeats = heldSeats,
                ConfirmedSeats = confirmedSeats,
                AvailableSeats = availableSeats
            };
        }).ToList();

        return ServiceResult<List<ClassResponse>>.Success(response, 200);
    }

    public async Task<ServiceResult<ClassResponse>> GetClassByIdAsync(string classId)
    {
        var now = DateTime.UtcNow;
        var schoolClass = await _context.SchoolClasses
            .Include(c => c.Holds)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classId);

        if (schoolClass == null)
        {
            return ServiceResult<ClassResponse>.NotFound($"Class with ID '{classId}' not found.");
        }

        var confirmedSeats = schoolClass.Holds.Count(h => h.Status == HoldStatus.Confirmed);
        var heldSeats = schoolClass.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAtUtc > now);
        var availableSeats = Math.Max(0, schoolClass.TotalSeats - (confirmedSeats + heldSeats));

        var response = new ClassResponse
        {
            Id = schoolClass.Id,
            Name = schoolClass.Name,
            TotalSeats = schoolClass.TotalSeats,
            HeldSeats = heldSeats,
            ConfirmedSeats = confirmedSeats,
            AvailableSeats = availableSeats
        };

        return ServiceResult<ClassResponse>.Success(response, 200);
    }

    public async Task<ServiceResult<HoldResponse>> CreateSeatHoldAsync(string classId, string studentId)
    {
        var classLock = _classLocks.GetOrAdd(classId, _ => new SemaphoreSlim(1, 1));
        await classLock.WaitAsync();

        IDbContextTransaction? transaction = null;
        if (_context.Database.IsRelational())
        {
            transaction = await _context.Database.BeginTransactionAsync();
        }

        try
        {
            SchoolClass? schoolClass = null;

            if (_context.Database.IsNpgsql())
            {
                // Acquire row-level pessimistic lock for PostgreSQL
                schoolClass = await _context.SchoolClasses
                    .FromSqlInterpolated($"SELECT * FROM \"SchoolClasses\" WHERE \"Id\" = {classId} FOR UPDATE")
                    .FirstOrDefaultAsync();
            }
            else
            {
                schoolClass = await _context.SchoolClasses.FirstOrDefaultAsync(c => c.Id == classId);
            }

            if (schoolClass == null)
            {
                if (transaction != null) await transaction.RollbackAsync();
                return ServiceResult<HoldResponse>.NotFound($"Class with ID '{classId}' not found.");
            }

            var now = DateTime.UtcNow;

            // Rule 3: Check if student already has active hold or confirmed admission in this class
            var existingActiveOrConfirmed = await _context.SeatHolds
                .AnyAsync(h => h.ClassId == classId &&
                               h.StudentId == studentId &&
                               (h.Status == HoldStatus.Confirmed || (h.Status == HoldStatus.Held && h.ExpiresAtUtc > now)));

            if (existingActiveOrConfirmed)
            {
                if (transaction != null) await transaction.RollbackAsync();
                _logger.LogWarning("Student {StudentId} already has an active hold or admission in class {ClassId}", studentId, classId);
                return ServiceResult<HoldResponse>.Conflict("Student already has an active hold or confirmed admission in this class.");
            }

            // Calculate current seat counts
            var confirmedSeats = await _context.SeatHolds
                .CountAsync(h => h.ClassId == classId && h.Status == HoldStatus.Confirmed);

            var heldSeats = await _context.SeatHolds
                .CountAsync(h => h.ClassId == classId && h.Status == HoldStatus.Held && h.ExpiresAtUtc > now);

            // Rule 1: Check seat availability
            if ((confirmedSeats + heldSeats) >= schoolClass.TotalSeats)
            {
                if (transaction != null) await transaction.RollbackAsync();
                _logger.LogWarning("No seats available for class {ClassId}. Total: {Total}, Held: {Held}, Confirmed: {Confirmed}",
                    classId, schoolClass.TotalSeats, heldSeats, confirmedSeats);
                return ServiceResult<HoldResponse>.Conflict("No seats available for this class.");
            }

            var holdDurationSeconds = _configuration.GetHoldDurationSeconds();
            var expiresAt = now.AddSeconds(holdDurationSeconds);

            var hold = new SeatHold
            {
                HoldId = "h_" + Guid.NewGuid().ToString("N")[..8],
                ClassId = classId,
                StudentId = studentId,
                Status = HoldStatus.Held,
                CreatedAtUtc = now,
                ExpiresAtUtc = expiresAt
            };

            _context.SeatHolds.Add(hold);
            await _context.SaveChangesAsync();

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            _logger.LogInformation("Successfully held seat {HoldId} in class {ClassId} for student {StudentId}. Expires at {ExpiresAt}",
                hold.HoldId, classId, studentId, expiresAt);

            var response = new HoldResponse
            {
                HoldId = hold.HoldId,
                ClassId = hold.ClassId,
                StudentId = hold.StudentId,
                Status = hold.Status,
                ExpiresAt = hold.ExpiresAtUtc.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
            };

            return ServiceResult<HoldResponse>.Success(response, 201);
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
            }
            classLock.Release();
        }
    }

    public async Task<ServiceResult<HoldStatusResponse>> GetHoldByIdAsync(string holdId)
    {
        var hold = await _context.SeatHolds
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.HoldId == holdId);

        if (hold == null)
        {
            return ServiceResult<HoldStatusResponse>.NotFound($"Hold with ID '{holdId}' not found.");
        }

        var now = DateTime.UtcNow;
        var currentStatus = hold.Status;

        if (currentStatus == HoldStatus.Held && hold.ExpiresAtUtc <= now)
        {
            currentStatus = HoldStatus.Expired;
            try
            {
                var trackedHold = await _context.SeatHolds.FirstOrDefaultAsync(h => h.HoldId == holdId);
                if (trackedHold != null && trackedHold.Status == HoldStatus.Held)
                {
                    trackedHold.Status = HoldStatus.Expired;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to asynchronously mark hold {HoldId} as expired in DB", holdId);
            }
        }

        var response = new HoldStatusResponse
        {
            HoldId = hold.HoldId,
            ClassId = hold.ClassId,
            Status = currentStatus,
            ExpiresAt = hold.ExpiresAtUtc.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
        };

        return ServiceResult<HoldStatusResponse>.Success(response, 200);
    }

    public async Task<ServiceResult<ConfirmHoldResponse>> ConfirmHoldAsync(string holdId, string studentId)
    {
        var holdLock = _holdLocks.GetOrAdd(holdId, _ => new SemaphoreSlim(1, 1));
        await holdLock.WaitAsync();

        IDbContextTransaction? transaction = null;
        if (_context.Database.IsRelational())
        {
            transaction = await _context.Database.BeginTransactionAsync();
        }

        try
        {
            SeatHold? hold = null;

            if (_context.Database.IsNpgsql())
            {
                hold = await _context.SeatHolds
                    .FromSqlInterpolated($"SELECT * FROM \"SeatHolds\" WHERE \"HoldId\" = {holdId} FOR UPDATE")
                    .FirstOrDefaultAsync();
            }
            else
            {
                hold = await _context.SeatHolds.FirstOrDefaultAsync(h => h.HoldId == holdId);
            }

            if (hold == null)
            {
                if (transaction != null) await transaction.RollbackAsync();
                return ServiceResult<ConfirmHoldResponse>.NotFound($"Hold with ID '{holdId}' not found.");
            }

            // Rule 4: Verify studentId matches hold.StudentId
            if (!string.Equals(hold.StudentId, studentId, StringComparison.Ordinal))
            {
                if (transaction != null) await transaction.RollbackAsync();
                _logger.LogWarning("Student {StudentId} unauthorized to confirm hold {HoldId} owned by {OwnerId}",
                    studentId, holdId, hold.StudentId);
                return ServiceResult<ConfirmHoldResponse>.Forbidden("You are not authorized to confirm this hold.");
            }

            // Idempotency: If already confirmed, return 200 OK without failing or modifying seat counts
            if (hold.Status == HoldStatus.Confirmed)
            {
                if (transaction != null) await transaction.CommitAsync();
                return ServiceResult<ConfirmHoldResponse>.Success(new ConfirmHoldResponse
                {
                    HoldId = hold.HoldId,
                    Status = HoldStatus.Confirmed
                }, 200);
            }

            var now = DateTime.UtcNow;

            // Check if hold is not in HELD status or has expired
            if (hold.Status != HoldStatus.Held || hold.ExpiresAtUtc <= now)
            {
                if (hold.Status == HoldStatus.Held && hold.ExpiresAtUtc <= now)
                {
                    hold.Status = HoldStatus.Expired;
                    await _context.SaveChangesAsync();
                }
                if (transaction != null) await transaction.CommitAsync();

                _logger.LogWarning("Hold {HoldId} cannot be confirmed because status is {Status} and expires at {ExpiresAt}",
                    holdId, hold.Status, hold.ExpiresAtUtc);
                return ServiceResult<ConfirmHoldResponse>.BadRequest("Hold has expired or is not in HELD status.");
            }

            hold.Status = HoldStatus.Confirmed;
            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Hold {HoldId} confirmed for student {StudentId}", holdId, studentId);

            return ServiceResult<ConfirmHoldResponse>.Success(new ConfirmHoldResponse
            {
                HoldId = hold.HoldId,
                Status = HoldStatus.Confirmed
            }, 200);
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
            }
            holdLock.Release();
        }
    }

    public async Task<ServiceResult> CancelHoldAsync(string holdId, string studentId)
    {
        var holdLock = _holdLocks.GetOrAdd(holdId, _ => new SemaphoreSlim(1, 1));
        await holdLock.WaitAsync();

        IDbContextTransaction? transaction = null;
        if (_context.Database.IsRelational())
        {
            transaction = await _context.Database.BeginTransactionAsync();
        }

        try
        {
            SeatHold? hold = null;

            if (_context.Database.IsNpgsql())
            {
                hold = await _context.SeatHolds
                    .FromSqlInterpolated($"SELECT * FROM \"SeatHolds\" WHERE \"HoldId\" = {holdId} FOR UPDATE")
                    .FirstOrDefaultAsync();
            }
            else
            {
                hold = await _context.SeatHolds.FirstOrDefaultAsync(h => h.HoldId == holdId);
            }

            if (hold == null)
            {
                if (transaction != null) await transaction.RollbackAsync();
                return ServiceResult.NotFound($"Hold with ID '{holdId}' not found.");
            }

            // Rule 4: Verify studentId matches hold.StudentId
            if (!string.Equals(hold.StudentId, studentId, StringComparison.Ordinal))
            {
                if (transaction != null) await transaction.RollbackAsync();
                _logger.LogWarning("Student {StudentId} unauthorized to cancel hold {HoldId} owned by {OwnerId}",
                    studentId, holdId, hold.StudentId);
                return ServiceResult.Forbidden("You are not authorized to cancel this hold.");
            }

            // Cannot cancel a confirmed admission
            if (hold.Status == HoldStatus.Confirmed)
            {
                if (transaction != null) await transaction.RollbackAsync();
                return ServiceResult.BadRequest("Cannot cancel a confirmed admission.");
            }

            hold.Status = HoldStatus.Cancelled;
            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Hold {HoldId} cancelled by student {StudentId}", holdId, studentId);
            return ServiceResult.Success(204);
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
            }
            holdLock.Release();
        }
    }

    public async Task<ServiceResult<List<StudentHoldSummaryResponse>>> GetStudentHoldsAsync(string studentId)
    {
        var now = DateTime.UtcNow;
        var holds = await _context.SeatHolds
            .Include(h => h.SchoolClass)
            .AsNoTracking()
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync();

        var response = holds.Select(h =>
        {
            var status = h.Status;
            if (status == HoldStatus.Held && h.ExpiresAtUtc <= now)
            {
                status = HoldStatus.Expired;
            }

            return new StudentHoldSummaryResponse
            {
                HoldId = h.HoldId,
                ClassId = h.ClassId,
                ClassName = h.SchoolClass?.Name ?? string.Empty,
                Status = status,
                ExpiresAt = h.ExpiresAtUtc.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
            };
        }).ToList();

        return ServiceResult<List<StudentHoldSummaryResponse>>.Success(response, 200);
    }
}
