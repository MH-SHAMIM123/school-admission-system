using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace AdmissionSystem.Api.Middleware;

public class RequireStudentIdOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var hasAttribute = context.MethodInfo.GetCustomAttributes(true).OfType<RequireStudentIdAttribute>().Any() ||
                           context.MethodInfo.DeclaringType?.GetCustomAttributes(true).OfType<RequireStudentIdAttribute>().Any() == true;

        if (hasAttribute)
        {
            operation.Parameters ??= new List<OpenApiParameter>();
            if (!operation.Parameters.Any(p => p.Name.Equals(StudentIdHeaderMiddleware.HeaderName, StringComparison.OrdinalIgnoreCase)))
            {
                operation.Parameters.Add(new OpenApiParameter
                {
                    Name = StudentIdHeaderMiddleware.HeaderName,
                    In = ParameterLocation.Header,
                    Required = true,
                    Description = "17-digit numeric birth registration number",
                    Schema = new OpenApiSchema { Type = "string" }
                });
            }
        }
    }
}
