using AdmissionSystem.Api.Common;
using AdmissionSystem.Api.DTOs;

namespace AdmissionSystem.Api.Services;

public interface IAdmissionService
{
    Task<ServiceResult<ClassResponse>> CreateClassAsync(CreateClassRequest request);
    Task<ServiceResult<List<ClassResponse>>> GetAllClassesAsync();
    Task<ServiceResult<ClassResponse>> GetClassByIdAsync(string classId);
    Task<ServiceResult<HoldResponse>> CreateSeatHoldAsync(string classId, string studentId);
    Task<ServiceResult<HoldStatusResponse>> GetHoldByIdAsync(string holdId);
    Task<ServiceResult<ConfirmHoldResponse>> ConfirmHoldAsync(string holdId, string studentId);
    Task<ServiceResult> CancelHoldAsync(string holdId, string studentId);
    Task<ServiceResult<List<StudentHoldSummaryResponse>>> GetStudentHoldsAsync(string studentId);
}
