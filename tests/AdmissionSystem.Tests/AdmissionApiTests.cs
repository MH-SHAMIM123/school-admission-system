using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.DTOs;

namespace AdmissionSystem.Tests;

public class AdmissionApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AdmissionApiTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ConcurrencyTest_MultipleSimultaneousHoldRequests_DoesNotExceedTotalSeats()
    {
        // Arrange
        var client = _factory.CreateClient();

        // 1. Create a class with TotalSeats = 5
        var createClassRequest = new CreateClassRequest
        {
            Name = "Concurrency Test Class - Morning Shift",
            TotalSeats = 5
        };

        var createClassResponse = await client.PostAsJsonAsync("/classes", createClassRequest);
        Assert.Equal(HttpStatusCode.Created, createClassResponse.StatusCode);

        var createdClass = await createClassResponse.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(createdClass);
        var classId = createdClass.Id;

        // 2. Fire 40 concurrent requests simultaneously using Task.WhenAll from 40 distinct 17-digit student IDs
        const int concurrentRequests = 40;
        var holdTasks = Enumerable.Range(1, concurrentRequests).Select(async i =>
        {
            var studentId = $"100000000000000{i:D2}"; // exactly 17 digits
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
            request.Headers.Add("X-Student-Id", studentId);

            var response = await client.SendAsync(request);
            return response.StatusCode;
        }).ToList();

        var results = await Task.WhenAll(holdTasks);

        // 3. Assert exactly 5 requests succeed (HTTP 201 Created)
        var successCount = results.Count(status => status == HttpStatusCode.Created);
        Assert.Equal(5, successCount);

        // 4. Assert that all remaining requests receive HTTP 409 Conflict
        var conflictCount = results.Count(status => status == HttpStatusCode.Conflict);
        Assert.Equal(concurrentRequests - 5, conflictCount);

        // 5. Call GET /classes/{classId} and assert heldSeats == 5, availableSeats == 0, and confirmedSeats == 0
        var classDetailsResponse = await client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, classDetailsResponse.StatusCode);

        var classDetails = await classDetailsResponse.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(classDetails);
        Assert.Equal(5, classDetails.TotalSeats);
        Assert.Equal(5, classDetails.HeldSeats);
        Assert.Equal(0, classDetails.AvailableSeats);
        Assert.Equal(0, classDetails.ConfirmedSeats);
    }

    [Fact]
    public async Task StudentRestrictionTest_SameStudentCannotHaveMultipleActiveHoldsInSameClass()
    {
        // Arrange
        var client = _factory.CreateClient();
        const string studentId = "20000000000000001"; // 17 digits

        // Create class
        var createResponse = await client.PostAsJsonAsync("/classes", new CreateClassRequest
        {
            Name = "Student Restriction Class",
            TotalSeats = 10
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var schoolClass = await createResponse.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(schoolClass);

        // First hold attempt by Student A -> Must succeed (201)
        using var request1 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        request1.Headers.Add("X-Student-Id", studentId);
        var response1 = await client.SendAsync(request1);
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);

        // Second hold attempt by same Student A for same class -> Must fail with 409 Conflict
        using var request2 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        request2.Headers.Add("X-Student-Id", studentId);
        var response2 = await client.SendAsync(request2);
        Assert.Equal(HttpStatusCode.Conflict, response2.StatusCode);

        var error = await response2.Content.ReadFromJsonAsync<ErrorResponse>(JsonOptions);
        Assert.NotNull(error);
        Assert.Contains("active hold or confirmed admission", error.Error);
    }

    [Fact]
    public async Task IdempotentConfirmTest_MultipleConfirmCalls_DoNotDoubleCountSeats()
    {
        // Arrange
        var client = _factory.CreateClient();
        const string studentId = "30000000000000001"; // 17 digits

        var createResponse = await client.PostAsJsonAsync("/classes", new CreateClassRequest
        {
            Name = "Idempotent Confirm Class",
            TotalSeats = 10
        });
        var schoolClass = await createResponse.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(schoolClass);

        // Student holds seat
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdResp = await client.SendAsync(holdReq);
        Assert.Equal(HttpStatusCode.Created, holdResp.StatusCode);
        var hold = await holdResp.Content.ReadFromJsonAsync<HoldResponse>(JsonOptions);
        Assert.NotNull(hold);

        // Confirm 1 -> 200 CONFIRMED
        using var confirmReq1 = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        confirmReq1.Headers.Add("X-Student-Id", studentId);
        var confirmResp1 = await client.SendAsync(confirmReq1);
        Assert.Equal(HttpStatusCode.OK, confirmResp1.StatusCode);
        var confirmResult1 = await confirmResp1.Content.ReadFromJsonAsync<ConfirmHoldResponse>(JsonOptions);
        Assert.NotNull(confirmResult1);
        Assert.Equal("CONFIRMED", confirmResult1.Status);

        // Confirm 2 (duplicate/idempotent) -> Must return 200 CONFIRMED without error
        using var confirmReq2 = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        confirmReq2.Headers.Add("X-Student-Id", studentId);
        var confirmResp2 = await client.SendAsync(confirmReq2);
        Assert.Equal(HttpStatusCode.OK, confirmResp2.StatusCode);
        var confirmResult2 = await confirmResp2.Content.ReadFromJsonAsync<ConfirmHoldResponse>(JsonOptions);
        Assert.NotNull(confirmResult2);
        Assert.Equal("CONFIRMED", confirmResult2.Status);

        // Verify class state: confirmedSeats == 1, heldSeats == 0, availableSeats == 9
        var classResp = await client.GetAsync($"/classes/{schoolClass.Id}");
        var updatedClass = await classResp.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(updatedClass);
        Assert.Equal(1, updatedClass.ConfirmedSeats);
        Assert.Equal(0, updatedClass.HeldSeats);
        Assert.Equal(9, updatedClass.AvailableSeats);
    }

    [Fact]
    public async Task AutoExpiryTest_ExpiredHolds_ReleaseAvailableSeats()
    {
        // Arrange
        var client = _factory.CreateClient();
        const string studentId = "40000000000000001"; // 17 digits

        var createResponse = await client.PostAsJsonAsync("/classes", new CreateClassRequest
        {
            Name = "Auto Expiry Test Class",
            TotalSeats = 3
        });
        var schoolClass = await createResponse.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(schoolClass);

        // Hold a seat
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdResp = await client.SendAsync(holdReq);
        Assert.Equal(HttpStatusCode.Created, holdResp.StatusCode);
        var hold = await holdResp.Content.ReadFromJsonAsync<HoldResponse>(JsonOptions);
        Assert.NotNull(hold);

        // Manually manipulate hold's ExpiresAtUtc to past in database
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var dbHold = await db.SeatHolds.FindAsync(hold.HoldId);
            Assert.NotNull(dbHold);
            dbHold.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-10);
            await db.SaveChangesAsync();
        }

        // Verify class status: heldSeats should be 0, availableSeats should be restored to 3
        var classResp = await client.GetAsync($"/classes/{schoolClass.Id}");
        var updatedClass = await classResp.Content.ReadFromJsonAsync<ClassResponse>(JsonOptions);
        Assert.NotNull(updatedClass);
        Assert.Equal(0, updatedClass.HeldSeats);
        Assert.Equal(3, updatedClass.AvailableSeats);

        // Attempting to confirm the expired hold must return 400 Bad Request
        using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentId);
        var confirmResp = await client.SendAsync(confirmReq);
        Assert.Equal(HttpStatusCode.BadRequest, confirmResp.StatusCode);
        var error = await confirmResp.Content.ReadFromJsonAsync<ErrorResponse>(JsonOptions);
        Assert.NotNull(error);
        Assert.Contains("expired", error.Error, StringComparison.OrdinalIgnoreCase);
    }
}
