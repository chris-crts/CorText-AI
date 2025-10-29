from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Patient

@require_http_methods(["GET"])
def get_all_patients(request):
    """
    Get all patients with full details and their medicine recommendations.
    
    GET /api/patients/all/
    """
    try:
        # Efficiently fetch patients and their related recommendations
        patients = Patient.objects.prefetch_related('recommendations').all()

        patients_data = []
        for patient in patients:
            patient_dict = patient.to_dict()
            # Attach all recommendations for this patient
            patient_dict['recommendations'] = [
                rec.to_dict() for rec in patient.recommendations.all()
            ]
            patients_data.append(patient_dict)

        return JsonResponse({
            "success": True,
            "data": {
                "patients": patients_data,
                "total": len(patients_data)
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
