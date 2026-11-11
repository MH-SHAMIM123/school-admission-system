using Microsoft.AspNetCore.Mvc;
using AdmissionSystem.Api.Common;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Middleware;
using AdmissionSystem.Api.Services;

namespace AdmissionSystem.Api.Controllers;

[ApiController]
[Route("holds")]
[Route("api/holds")]
public class HoldsController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public HoldsController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    /// <summary>
    /// GET /holds/{holdId} - Get hold status (Public/Student).
    /// </summary>
    [HttpGet("{holdId}")]
    [ProducesResponseType(typeof(HoldStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHoldById(string holdId)
    {
        var result = await _admissionService.GetHoldByIdAsync(holdId);
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Hold not found."));
    }

    /// <summary>
    /// POST /holds/{holdId}/confirm - Confirm a held seat.
    /// Requires X-Student-Id header (17 digits).
    /// </summary>
    [HttpPost("{holdId}/confirm")]
    [RequireStudentId]
    [ProducesResponseType(typeof(ConfirmHoldResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ConfirmHold(string holdId)
    {
        var studentId = HttpContext.GetStudentId();
        if (string.IsNullOrEmpty(studentId))
        {
            return BadRequest(new ErrorResponse("Invalid or missing X-Student-Id header. Must be a 17-digit numeric birth registration number."));
        }

        var result = await _admissionService.ConfirmHoldAsync(holdId, studentId);
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Failed to confirm hold."));
    }

    /// <summary>
    /// DELETE /holds/{holdId} - Cancel a held seat.
    /// Requires X-Student-Id header (17 digits).
    /// </summary>
    [HttpDelete("{holdId}")]
    [RequireStudentId]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelHold(string holdId)
    {
        var studentId = HttpContext.GetStudentId();
        if (string.IsNullOrEmpty(studentId))
        {
            return BadRequest(new ErrorResponse("Invalid or missing X-Student-Id header. Must be a 17-digit numeric birth registration number."));
        }

        var result = await _admissionService.CancelHoldAsync(holdId, studentId);
        if (result.IsSuccess)
        {
            return NoContent();
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Failed to cancel hold."));
    }
}
