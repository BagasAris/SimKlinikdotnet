namespace SimKlinik.Models;

public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = "Sukses";
    public T? Data { get; set; }
    public int? Total { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Sukses", int? total = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            Total = total
        };
    }

    public static ApiResponse<T> Fail(string message)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Data = default
        };
    }
}
