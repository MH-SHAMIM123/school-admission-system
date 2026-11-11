using Microsoft.AspNetCore.Mvc;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Middleware;
using AdmissionSystem.Api.Services;

namespace AdmissionSystem.Api.Controllers;

[ApiController]
[Route("me")]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public MeController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    /// <summary>
    /// GET /me/holds - Get all holds/admissions for the authenticated student.
    /// Requires X-Student-Id header (17 digits).
    /// </summary>
    [HttpGet("holds")]
    [RequireStudentId]
    [ProducesResponseType(typeof(List<StudentHoldSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyHolds()
    {
        var studentId = HttpContext.GetStudentId();
        if (string.IsNullOrEmpty(studentId))
        {
            return BadRequest(new ErrorResponse("Invalid or missing X-Student-Id header. Must be a 17-digit numeric birth registration number."));
        }

        var result = await _admissionService.GetStudentHoldsAsync(studentId);
        return Ok(result.Data);
    }
}
