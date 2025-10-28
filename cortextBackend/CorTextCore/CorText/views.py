from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, logout, authenticate

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from django.contrib.auth.hashers import check_password, make_password
from .models import CustomUser, ManualAdmin
import json

@csrf_exempt
def signup_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        email = request.POST.get('email', default=None)
        password = request.POST.get('password', default=None)
        first_name = request.POST.get('first_name', default=None)
        last_name = request.POST.get('last_name', default=None)
        age = request.POST.get('age', default=18)
        gender = request.POST.get('gender', default=None)
        address = request.POST.get('address', default=None)
        profile_image = request.FILES.get('profile_image', default=None)

        if not email or not password:
            return JsonResponse({'error': 'Email and password are required'}, status=400)

        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)

        if len(password) < 8:
            return JsonResponse({'error': 'Password must be at least 8 characters long'}, status=400)
        if not any(char.isupper() for char in password):
            return JsonResponse({'error': 'Password must contain at least one uppercase letter'}, status=400)
        if not any(char.islower() for char in password):
            return JsonResponse({'error': 'Password must contain at least one lowercase letter'}, status=400)
        if not any(char.isdigit() for char in password):
            return JsonResponse({'error': 'Password must contain at least one number'}, status=400)

        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            age=age,
            gender=gender,
            address=address
        )

        if profile_image:
            user.profile_image = profile_image
            user.save()

        return JsonResponse({'message': 'User created successfully'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        user = authenticate(request, username=email, password=password)
        if user is None:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        login(request, user)

        if getattr(user, 'is_admin', False):
            return JsonResponse({'step': 'admin_auth_required'})

        return JsonResponse({
            'message': 'User logged in',
            'email': user.email,
            'is_admin': False
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def verify_manual_admin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                return JsonResponse({'error': 'Missing credentials'}, status=400)

            try:
                admin = ManualAdmin.objects.get(username=username)
                if admin.password == password:
                    return JsonResponse({'authenticated': True})
                else:
                    return JsonResponse({'error': 'Invalid password'}, status=401)
            except ManualAdmin.DoesNotExist:
                return JsonResponse({'error': 'Admin not found'}, status=404)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def admin_login_view(request):
    """
    Admin login using ManualAdmin username + password.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({'error': 'Missing credentials'}, status=400)

        try:
            admin = ManualAdmin.objects.get(username=username)
        except ManualAdmin.DoesNotExist:
            return JsonResponse({'error': 'Admin not found'}, status=404)

        if check_password(password, admin.password):
            return JsonResponse({'message': 'Admin fully authenticated', 'admin_verified': True})
        else:
            return JsonResponse({'error': 'Invalid admin credentials'}, status=403)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def list_manual_admins(request):
    if request.method == 'GET':
        admins = ManualAdmin.objects.values_list('username', flat=True)
        return JsonResponse({'admins': list(admins)})
    return JsonResponse({'error': 'Invalid method'}, status=405)
    
@csrf_exempt
def create_manual_admin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                return JsonResponse({'error': 'Username and password required'}, status=400)

            hashed_password = make_password(password)

            admin, created = ManualAdmin.objects.update_or_create(
                username=username,
                defaults={'password': hashed_password}
            )

            return JsonResponse({'message': 'Credentials updated'})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def edit_manual_admin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            new_password = data.get('password')

            if not username or not new_password:
                return JsonResponse({'error': 'Username and new password required'}, status=400)

            try:
                admin = ManualAdmin.objects.get(username=username)
            except ManualAdmin.DoesNotExist:
                return JsonResponse({'error': 'Admin not found'}, status=404)

            admin.password = make_password(new_password)
            admin.save()

            return JsonResponse({'message': 'Password updated successfully'})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def delete_manual_admin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')

            if not username:
                return JsonResponse({'error': 'Username required'}, status=400)

            try:
                admin = ManualAdmin.objects.get(username=username)
                admin.delete()
                return JsonResponse({'message': 'Admin deleted successfully'})
            except ManualAdmin.DoesNotExist:
                return JsonResponse({'error': 'Admin not found'}, status=404)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "is_authenticated": True,
            "is_admin": getattr(request.user, 'is_admin', False),
            "email": request.user.email
        })
    else:
        return JsonResponse({'authenticated': False}, status=401)

@csrf_exempt
def check_magic_email_auth(request):
    if request.user.is_authenticated:
        is_magic_admin = (
            request.user.email == 'cortextai@admin.com' and
            getattr(request.user, 'is_admin', False)
        )
        return JsonResponse({
            'authenticated': True,
            'is_magic_admin': is_magic_admin,
            'email': request.user.email
        })
    else:
        return JsonResponse({'authenticated': False}, status=401)    

@csrf_exempt
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out'})






#------------------------------------------------------------------------------------------------------------------------------# 
# The following codes are for the dashboard to fetch user details :)------------------------------------------------------------------------------------------------------------------------------#

from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import CustomUserSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    #print("Session key:", request.session.session_key)
    #print("User:", request.user)
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=403)
    serializer = CustomUserSerializer(request.user)
    return Response(serializer.data)



# core/views.py

from django.http import JsonResponse
from CorText.models import Medicine
from CorText.utils.semantic_extractor import Medicine_Extractor
import json

def save_all_medicines(request):
    """Save multiple medicines to the database in bulk"""
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    medicines_data = data.get("medicines", [])
    if not medicines_data:
        return JsonResponse({"error": "No medicines provided"}, status=400)

    saved_count = 0
    skipped_count = 0
    errors = []

    for medicine_data in medicines_data:
        try:
            drug_name = medicine_data.get("name")
            if not drug_name:
                errors.append("Medicine missing name field")
                continue

            # Check if medicine already exists
            if Medicine.objects.filter(name=drug_name).exists():
                skipped_count += 1
                continue

            # Create new medicine
            Medicine.objects.create(
                name=drug_name,
                brand_name=medicine_data.get("brand_name", []),
                generic_name=medicine_data.get("generic_name", []),
                active_ingredient=medicine_data.get("active_ingredient", []),
                indications=" ".join(medicine_data.get("indications", [])),
                warnings=" ".join(medicine_data.get("warnings", [])),
                dosage=" ".join(medicine_data.get("dosage", [])),
                source="openFDA"
            )
            saved_count += 1

        except Exception as e:
            errors.append(f"Error saving {drug_name}: {str(e)}")

    return JsonResponse({
        "message": f"✅ Bulk save completed",
        "saved": saved_count,
        "skipped": skipped_count,
        "total": len(medicines_data),
        "errors": errors if errors else None
    })

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from CorText.utils.semantic_extractor import Medicine_Extractor
import json
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def add_medicine(request):
    """
    API endpoint to add a single medicine to the vector database.
    
    POST /api/medicines/add/
    
    Request Body:
    {
        "name": "Aspirin",
        "brand_name": ["Bayer Aspirin", "Ecotrin"],
        "generic_name": ["aspirin"],
        "active_ingredient": ["aspirin 325mg"],
        "indications": ["pain relief", "fever reduction"],
        "warnings": ["GI bleeding risk"],
        "dosage": ["325mg orally every 4-6 hours"]
    }
    
    Response:
    {
        "success": true,
        "message": "Medicine added successfully",
        "data": {
            "id": "med_123",
            "name": "Aspirin",
            ...
        }
    }
    """
    try:
        # Parse request body
        data = json.loads(request.body)
        
        # Validate required field
        if not data.get("name"):
            return JsonResponse({
                "success": False,
                "error": "Field 'name' is required"
            }, status=400)
        
        # Prepare medicine data
        medicine_data = {
            "name": data.get("name"),
            "brand_name": data.get("brand_name", []),
            "generic_name": data.get("generic_name", []),
            "active_ingredient": data.get("active_ingredient", []),
            "indications": data.get("indications", []),
            "warnings": data.get("warnings", []),
            "dosage": data.get("dosage", []),
        }
        
        # Optional fields
        if data.get("manufacturer"):
            medicine_data["manufacturer"] = data.get("manufacturer")
        if data.get("rxcui"):
            medicine_data["rxcui"] = data.get("rxcui")
        if data.get("normalized_name"):
            medicine_data["normalized_name"] = data.get("normalized_name")
        
        # Initialize extractor and add medicine
        extractor = Medicine_Extractor()
        added_medicine = extractor.add_single_medicine(
            medicine_data=medicine_data,
            ann_path="medicines.ann",
            json_path="medicines_metadata.json",
            auto_generate_id=True
        )
        
        # Remove vector from response (too large)
        response_data = {k: v for k, v in added_medicine.items() if k != "vector"}
        
        return JsonResponse({
            "success": True,
            "message": f"Medicine '{added_medicine['name']}' added successfully",
            "data": response_data
        }, status=201)
        
    except FileNotFoundError as e:
        return JsonResponse({
            "success": False,
            "error": "Vector database not found. Please run 'python manage.py embed_medicines' first."
        }, status=404)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "Invalid JSON in request body"
        }, status=400)
        
    except Exception as e:
        logger.error(f"Error adding medicine: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def batch_add_medicines(request):
    """
    API endpoint to add multiple medicines in batch.
    
    POST /api/medicines/batch-add/
    
    Request Body:
    {
        "medicines": [
            {
                "name": "Aspirin",
                "brand_name": ["Bayer"],
                ...
            },
            {
                "name": "Ibuprofen",
                "brand_name": ["Advil"],
                ...
            }
        ]
    }
    """
    try:
        data = json.loads(request.body)
        medicines_list = data.get("medicines", [])
        
        if not medicines_list:
            return JsonResponse({
                "success": False,
                "error": "No medicines provided"
            }, status=400)
        
        extractor = Medicine_Extractor()
        added_medicines = extractor.batch_add_medicines(
            medicines_list=medicines_list,
            ann_path="medicines.ann",
            json_path="medicines_metadata.json"
        )
        
        return JsonResponse({
            "success": True,
            "message": f"Successfully added {len(added_medicines)} medicines",
            "data": {
                "count": len(added_medicines),
                "medicines": [
                    {k: v for k, v in m.items() if k != "vector"}
                    for m in added_medicines
                ]
            }
        }, status=201)
        
    except Exception as e:
        logger.error(f"Error batch adding medicines: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_database_stats(request):
    """
    Get statistics about the vector database.
    
    GET /api/medicines/stats/
    """
    try:
        with open("medicines_metadata.json", "r") as f:
            json_data = json.load(f)
        
        metadata = json_data.get("metadata", {})
        
        return JsonResponse({
            "success": True,
            "data": {
                "total_medicines": metadata.get("total_medicines", 0),
                "vector_dimension": metadata.get("vector_dimension", 768),
                "normalized_count": metadata.get("normalized_count", 0),
                "enriched_count": metadata.get("enriched_count", 0),
                "model": metadata.get("model", "dmis-lab/biobert-base-cased-v1.1")
            }
        })
        
    except FileNotFoundError:
        return JsonResponse({
            "success": False,
            "error": "Database not found"
        }, status=404)
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


@require_http_methods(["GET"])
def list_medicines(request):
    """
    List all medicines in the database (paginated).
    
    GET /api/medicines/list/?page=1&per_page=20
    """
    try:
        with open("medicines_metadata.json", "r") as f:
            json_data = json.load(f)
        
        medicines = json_data.get("medicines", [])
        
        # Pagination
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 20))
        start = (page - 1) * per_page
        end = start + per_page
        
        paginated_medicines = medicines[start:end]
        
        # Remove vectors from response
        response_medicines = [
            {k: v for k, v in m.items() if k != "vector"}
            for m in paginated_medicines
        ]
        
        return JsonResponse({
            "success": True,
            "data": {
                "medicines": response_medicines,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": len(medicines),
                    "total_pages": (len(medicines) + per_page - 1) // per_page
                }
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
        
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