using Microsoft.AspNetCore.Mvc;
using AdmissionSystem.Api.Common;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Middleware;
using AdmissionSystem.Api.Services;

namespace AdmissionSystem.Api.Controllers;

[ApiController]
[Route("classes")]
[Route("api/classes")]
public class ClassesController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public ClassesController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    /// <summary>
    /// POST /classes - Admin creates a new class.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ClassResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? "Invalid request payload.";
            return BadRequest(new ErrorResponse(firstError));
        }

        var result = await _admissionService.CreateClassAsync(request);
        if (result.IsSuccess)
        {
            return CreatedAtAction(nameof(GetClassById), new { classId = result.Data!.Id }, result.Data);
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Failed to create class."));
    }

    /// <summary>
    /// GET /classes - Public list of all classes with live seat counts.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ClassResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllClasses()
    {
        var result = await _admissionService.GetAllClassesAsync();
        return Ok(result.Data);
    }

    /// <summary>
    /// GET /classes/{classId} - Public details of a single class.
    /// </summary>
    [HttpGet("{classId}")]
    [ProducesResponseType(typeof(ClassResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClassById(string classId)
    {
        var result = await _admissionService.GetClassByIdAsync(classId);
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Class not found."));
    }

    /// <summary>
    /// POST /classes/{classId}/holds - Student holds a seat in a class.
    /// Requires X-Student-Id header (17 digits).
    /// </summary>
    [HttpPost("{classId}/holds")]
    [RequireStudentId]
    [ProducesResponseType(typeof(HoldResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateHold(string classId)
    {
        var studentId = HttpContext.GetStudentId();
        if (string.IsNullOrEmpty(studentId))
        {
            return BadRequest(new ErrorResponse("Invalid or missing X-Student-Id header. Must be a 17-digit numeric birth registration number."));
        }

        var result = await _admissionService.CreateSeatHoldAsync(classId, studentId);
        if (result.IsSuccess)
        {
            return StatusCode(StatusCodes.Status201Created, result.Data);
        }

        return StatusCode(result.StatusCode, new ErrorResponse(result.ErrorMessage ?? "Failed to hold seat."));
    }
}
