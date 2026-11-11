namespace AdmissionSystem.Api.Models;

public class SchoolClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<SeatHold> Holds { get; set; } = new List<SeatHold>();
}
