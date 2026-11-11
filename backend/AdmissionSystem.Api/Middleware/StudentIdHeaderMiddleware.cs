using System.Text.Json;
using System.Text.RegularExpressions;
using AdmissionSystem.Api.DTOs;

namespace AdmissionSystem.Api.Middleware;

public class StudentIdHeaderMiddleware
{
    public const string HeaderName = "X-Student-Id";
    public const string ItemKey = "StudentId";
    private static readonly Regex Numeric17DigitsRegex = new(@"^\d{17}$", RegexOptions.Compiled);

    private readonly RequestDelegate _next;
    private readonly ILogger<StudentIdHeaderMiddleware> _logger;

    public StudentIdHeaderMiddleware(RequestDelegate _next, ILogger<StudentIdHeaderMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (RequiresStudentId(context))
        {
            if (!context.Request.Headers.TryGetValue(HeaderName, out var headerValues) ||
                string.IsNullOrWhiteSpace(headerValues) ||
                !Numeric17DigitsRegex.IsMatch(headerValues.ToString()))
            {
                _logger.LogWarning("Request to {Path} failed {HeaderName} validation.", context.Request.Path, HeaderName);

                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                context.Response.ContentType = "application/json";

                var errorResponse = new ErrorResponse("Invalid or missing X-Student-Id header. Must be a 17-digit numeric birth registration number.");
                var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await context.Response.WriteAsync(json);
                return;
            }

            context.Items[ItemKey] = headerValues.ToString();
        }

        await _next(context);
    }

    private static bool RequiresStudentId(HttpContext context)
    {
        // 1. Check if endpoint is decorated with [RequireStudentId]
        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<RequireStudentIdAttribute>() != null)
        {
            return true;
        }

        // 2. Fallback to path and method matching based on assignment specification
        var path = context.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
        var method = context.Request.Method;

        // Normalize prefix if /api is present
        var normalizedPath = path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
            ? path.Substring(4)
            : path;

        // POST /classes/{id}/holds
        if (HttpMethods.IsPost(method) && Regex.IsMatch(normalizedPath, @"^/classes/[^/]+/holds$", RegexOptions.IgnoreCase))
        {
            return true;
        }

        // GET /me/holds
        if (HttpMethods.IsGet(method) && normalizedPath.Equals("/me/holds", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // POST /holds/{id}/confirm
        if (HttpMethods.IsPost(method) && Regex.IsMatch(normalizedPath, @"^/holds/[^/]+/confirm$", RegexOptions.IgnoreCase))
        {
            return true;
        }

        // DELETE /holds/{id}
        if (HttpMethods.IsDelete(method) && Regex.IsMatch(normalizedPath, @"^/holds/[^/]+$", RegexOptions.IgnoreCase))
        {
            return true;
        }

        return false;
    }
}

public static class StudentIdMiddlewareExtensions
{
    public static IApplicationBuilder UseStudentIdValidation(this IApplicationBuilder app)
    {
        return app.UseMiddleware<StudentIdHeaderMiddleware>();
    }

    public static string? GetStudentId(this HttpContext context)
    {
        if (context.Items.TryGetValue(StudentIdHeaderMiddleware.ItemKey, out var val) && val is string s)
        {
            return s;
        }

        if (context.Request.Headers.TryGetValue(StudentIdHeaderMiddleware.HeaderName, out var headerVal))
        {
            return headerVal.ToString();
        }

        return null;
    }
}
