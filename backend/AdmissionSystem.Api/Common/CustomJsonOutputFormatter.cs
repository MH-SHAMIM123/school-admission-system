using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace AdmissionSystem.Api.Common;

public class CustomJsonOutputFormatter : TextOutputFormatter
{
    private readonly JsonSerializerOptions _options;

    public CustomJsonOutputFormatter(JsonSerializerOptions options)
    {
        _options = options;
        SupportedMediaTypes.Add("application/json");
        SupportedMediaTypes.Add("text/json");
        SupportedEncodings.Add(Encoding.UTF8);
    }

    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context, Encoding selectedEncoding)
    {
        var response = context.HttpContext.Response;
        await JsonSerializer.SerializeAsync(response.Body, context.Object, context.ObjectType ?? context.Object?.GetType() ?? typeof(object), _options);
    }
}
