using System.ComponentModel.DataAnnotations;

namespace AdmissionSystem.Api.DTOs;

public class CreateClassRequest
{
    [Required(ErrorMessage = "Class name is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Class name must be between 1 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "TotalSeats must be greater than zero.")]
    public int TotalSeats { get; set; }
}

public class ClassResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public int HeldSeats { get; set; }
    public int ConfirmedSeats { get; set; }
    public int AvailableSeats { get; set; }
}

public class HoldResponse
{
    public string HoldId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public class HoldStatusResponse
{
    public string HoldId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public class ConfirmHoldResponse
{
    public string HoldId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class StudentHoldSummaryResponse
{
    public string HoldId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;

    public ErrorResponse() { }
    public ErrorResponse(string error) => Error = error;
}
