import json
import logging

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password, make_password
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CustomUser, ManualAdmin
from .serializers import CustomUserSerializer

from CorText.models import Medicine
from CorText.utils.semantic_extractor import Medicine_Extractor

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    #print("Session key:", request.session.session_key)
    #print("User:", request.user)
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=403)
    serializer = CustomUserSerializer(request.user)
    return Response(serializer.data)

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
