from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from CorText.utils.semantic_extractor import PatientInfo_Extractor
from .models import Patient, MedicineRecommendation, RecommendationSession
import json
import logging
import time
import uuid

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def add_patient(request):
    """
    Add a new patient and embed their information.
    
    POST /api/patients/add/
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["name", "age", "gender", "chief_complaint", "diagnosis"]
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    "success": False,
                    "error": f"Field '{field}' is required"
                }, status=400)
        
        # Generate patient_id if not provided
        if not data.get("patient_id"):
            # Get last patient count
            last_patient = Patient.objects.order_by('-id').first()
            next_num = (last_patient.id + 1) if last_patient else 1
            data["patient_id"] = f"patient_{next_num:03d}"
        
        # Initialize extractor and embed
        extractor = PatientInfo_Extractor()
        embedded_data = extractor.embed_patient(data)
        
        # Create Patient model
        with transaction.atomic():
            patient = Patient.objects.create(
                patient_id=embedded_data["id"] if "id" in embedded_data else embedded_data["patient_id"],
                name=embedded_data["name"],
                age=embedded_data["age"],
                gender=embedded_data["gender"][0].upper() if embedded_data["gender"] else 'O',
                weight_kg=embedded_data.get("weight_kg"),
                height_cm=embedded_data.get("height_cm"),
                chief_complaint=embedded_data["chief_complaint"],
                diagnosis=embedded_data["diagnosis"],
                symptoms=embedded_data.get("symptoms", []),
                medical_history=embedded_data.get("medical_history", []),
                family_history=embedded_data.get("family_history", []),
                current_medications=embedded_data.get("current_medications", []),
                recent_medications=embedded_data.get("recent_medications", []),
                drug_allergies=embedded_data.get("drug_allergies", []),
                adverse_reactions=embedded_data.get("adverse_reactions", []),
                blood_pressure=embedded_data.get("blood_pressure", ""),
                renal_function=embedded_data.get("renal_function", {}),
                liver_function=embedded_data.get("liver_function", {}),
                recent_labs=embedded_data.get("recent_labs", {}),
                pregnancy_status=embedded_data.get("pregnancy_status", ""),
                smoking_status=embedded_data.get("smoking_status", "never"),
                alcohol_use=embedded_data.get("alcohol_use", ""),
                dietary_restrictions=embedded_data.get("dietary_restrictions", []),
                financial_constraints=embedded_data.get("financial_constraints", ""),
                preferred_route=embedded_data.get("preferred_route", "oral"),
                embedding=embedded_data.get("embedding", []),
                vector_dim=embedded_data.get("vector_dim", 768)
            )
            
            # Also save to vector database files
            extractor.save_patient(
                embedded_data,
                ann_path="patients.ann",
                json_path="patients_metadata.json"
            )
        
        return JsonResponse({
            "success": True,
            "message": f"Patient '{patient.name}' added successfully",
            "data": {
                "patient_id": patient.patient_id,
                "name": patient.name,
                "age": patient.age,
                "vector_dim": patient.vector_dim
            }
        }, status=201)
        
    except Exception as e:
        logger.error(f"Error adding patient: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_recommendations(request):
    """
    Generate medicine recommendations for a patient.
    
    POST /api/patients/recommend/
    Body: {
        "patient_id": "patient_001",
        "top_k": 10,
        "similarity_threshold": 0.75
    }
    """
    try:
        data = json.loads(request.body)
        patient_id = data.get("patient_id")
        
        if not patient_id:
            return JsonResponse({
                "success": False,
                "error": "patient_id is required"
            }, status=400)
        
        # Get patient from database
        try:
            patient = Patient.objects.get(patient_id=patient_id)
        except Patient.DoesNotExist:
            return JsonResponse({
                "success": False,
                "error": f"Patient {patient_id} not found"
            }, status=404)
        
        # Parameters
        top_k = data.get("top_k", 10)
        similarity_threshold = data.get("similarity_threshold", 0.75)
        
        # Start timing
        start_time = time.time()
        
        # Generate recommendations
        extractor = PatientInfo_Extractor()
        patient_dict = patient.to_dict()
        
        recommendations = extractor.recommend_medicines(
            patient_data=patient_dict,
            medicine_ann_path="medicines.ann",
            medicine_json_path="medicines_metadata.json",
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        processing_time = time.time() - start_time
        
        # Create session record
        session_id = str(uuid.uuid4())
        safe_count = sum(1 for r in recommendations if r["is_safe"])
        avg_sim = sum(r["similarity_score"] for r in recommendations) / len(recommendations) if recommendations else 0
        
        with transaction.atomic():
            session = RecommendationSession.objects.create(
                session_id=session_id,
                patient=patient,
                top_k=top_k,
                similarity_threshold=similarity_threshold,
                total_candidates=len(recommendations),
                safe_recommendations=safe_count,
                avg_similarity=avg_sim,
                processing_time_seconds=processing_time
            )
            
            # Save recommendations to database
            saved_recommendations = []
            for rec in recommendations:
                confidence_map = {
                    "HIGH": "high",
                    "MEDIUM": "medium",
                    "LOW": "low",
                    "NOT RECOMMENDED": "not_recommended"
                }
                
                med_rec = MedicineRecommendation.objects.create(
                    patient=patient,
                    medicine_id=rec["medicine_id"],
                    medicine_name=rec["medicine_name"],
                    similarity_score=rec["similarity_score"],
                    confidence_level=confidence_map.get(rec["confidence_level"], "low"),
                    is_safe=rec["is_safe"],
                    warnings=rec["warnings"],
                    medicine_details=rec["medicine_details"],
                    status='pending'
                )
                saved_recommendations.append(med_rec.to_dict())
        
        return JsonResponse({
            "success": True,
            "message": f"Generated {len(recommendations)} recommendations",
            "data": {
                "session_id": session_id,
                "patient": {
                    "id": patient.patient_id,
                    "name": patient.name,
                    "age": patient.age,
                    "diagnosis": patient.diagnosis
                },
                "recommendations": saved_recommendations,
                "statistics": {
                    "total_evaluated": len(recommendations),
                    "safe_recommendations": safe_count,
                    "average_similarity": round(avg_sim, 3),
                    "processing_time_seconds": round(processing_time, 2),
                    "threshold_used": similarity_threshold
                }
            }
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_patient_recommendations(request, patient_id):
    """
    Get all recommendations for a patient.
    
    GET /api/patients/{patient_id}/recommendations/
    """
    try:
        patient = Patient.objects.get(patient_id=patient_id)
        recommendations = MedicineRecommendation.objects.filter(patient=patient)
        
        return JsonResponse({
            "success": True,
            "data": {
                "patient": {
                    "id": patient.patient_id,
                    "name": patient.name,
                    "diagnosis": patient.diagnosis
                },
                "recommendations": [rec.to_dict() for rec in recommendations]
            }
        })
        
    except Patient.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": f"Patient {patient_id} not found"
        }, status=404)
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def approve_recommendation(request, recommendation_id):
    """
    Clinician approval/rejection of recommendation.
    
    POST /api/recommendations/{recommendation_id}/approve/
    Body: {
        "approved": true,
        "notes": "Approved for dispensing",
        "reviewed_by": "Dr. Smith"
    }
    """
    try:
        data = json.loads(request.body)
        
        recommendation = MedicineRecommendation.objects.get(id=recommendation_id)
        recommendation.clinician_approved = data.get("approved", True)
        recommendation.clinician_notes = data.get("notes", "")
        recommendation.reviewed_by = data.get("reviewed_by", "")
        recommendation.status = 'approved' if data.get("approved") else 'rejected'
        recommendation.save()
        
        return JsonResponse({
            "success": True,
            "message": "Recommendation updated",
            "data": recommendation.to_dict()
        })
        
    except MedicineRecommendation.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Recommendation not found"
        }, status=404)
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_patient_stats(request):
    """
    Get statistics about patients in the database.
    
    GET /api/patients/stats/
    """
    try:
        total_patients = Patient.objects.count()
        total_recommendations = MedicineRecommendation.objects.count()
        safe_recommendations = MedicineRecommendation.objects.filter(is_safe=True).count()
        approved_recommendations = MedicineRecommendation.objects.filter(clinician_approved=True).count()
        
        return JsonResponse({
            "success": True,
            "data": {
                "total_patients": total_patients,
                "total_recommendations": total_recommendations,
                "safe_recommendations": safe_recommendations,
                "approved_recommendations": approved_recommendations,
                "safety_rate": round(safe_recommendations / total_recommendations * 100, 1) if total_recommendations > 0 else 0,
                "approval_rate": round(approved_recommendations / total_recommendations * 100, 1) if total_recommendations > 0 else 0
            }
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@require_http_methods(["GET"])
def list_patients(request):
    """
    List all patients (paginated).
    
    GET /api/patients/list/?page=1&per_page=20
    """
    try:
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 20))
        
        start = (page - 1) * per_page
        end = start + per_page
        
        patients = Patient.objects.all()[start:end]
        total = Patient.objects.count()
        
        return JsonResponse({
            "success": True,
            "data": {
                "patients": [
                    {
                        "patient_id": p.patient_id,
                        "name": p.name,
                        "age": p.age,
                        "gender": p.get_gender_display(),
                        "diagnosis": p.diagnosis,
                        "created_at": p.created_at.isoformat()
                    }
                    for p in patients
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page
                }
            }
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)