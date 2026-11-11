namespace AdmissionSystem.Api.Common;

public class ServiceResult<T>
{
    public bool IsSuccess { get; }
    public int StatusCode { get; }
    public T? Data { get; }
    public string? ErrorMessage { get; }

    private ServiceResult(bool isSuccess, int statusCode, T? data, string? errorMessage)
    {
        IsSuccess = isSuccess;
        StatusCode = statusCode;
        Data = data;
        ErrorMessage = errorMessage;
    }

    public static ServiceResult<T> Success(T data, int statusCode = 200) =>
        new(true, statusCode, data, null);

    public static ServiceResult<T> Failure(string errorMessage, int statusCode = 400) =>
        new(false, statusCode, default, errorMessage);

    public static ServiceResult<T> NotFound(string message = "Resource not found.") =>
        Failure(message, 404);

    public static ServiceResult<T> Conflict(string message) =>
        Failure(message, 409);

    public static ServiceResult<T> Forbidden(string message = "Forbidden.") =>
        Failure(message, 403);

    public static ServiceResult<T> BadRequest(string message) =>
        Failure(message, 400);
}

public class ServiceResult
{
    public bool IsSuccess { get; }
    public int StatusCode { get; }
    public string? ErrorMessage { get; }

    private ServiceResult(bool isSuccess, int statusCode, string? errorMessage)
    {
        IsSuccess = isSuccess;
        StatusCode = statusCode;
        ErrorMessage = errorMessage;
    }

    public static ServiceResult Success(int statusCode = 204) =>
        new(true, statusCode, null);

    public static ServiceResult Failure(string errorMessage, int statusCode = 400) =>
        new(false, statusCode, errorMessage);

    public static ServiceResult NotFound(string message = "Resource not found.") =>
        Failure(message, 404);

    public static ServiceResult Conflict(string message) =>
        Failure(message, 409);

    public static ServiceResult Forbidden(string message = "Forbidden.") =>
        Failure(message, 403);

    public static ServiceResult BadRequest(string message) =>
        Failure(message, 400);
}
