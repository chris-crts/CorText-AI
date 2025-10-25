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

def fetch_medicine_profile(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    drug_name = request.POST.get("drug_name")
    if not drug_name:
        return JsonResponse({"error": "Missing drug_name"}, status=400)

    extractor = Medicine_Extractor()
    profile = extractor.get_medicine_profile(drug_name)

    if not profile:
        return JsonResponse({"error": "No profile found"}, status=404)

    return JsonResponse({
        "message": f"✅ Profile fetched for {drug_name}",
        "profile": profile
    })

def save_medicine_profile(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    drug_name = data.get("name")
    if not drug_name:
        return JsonResponse({"error": "Missing medicine name"}, status=400)

    med = Medicine.objects.create(
        name=drug_name,
        brand_name=data.get("brand_name", []),
        generic_name=data.get("generic_name", []),
        active_ingredient=data.get("active_ingredient", []),
        indications=" ".join(data.get("indications", [])),
        warnings=" ".join(data.get("warnings", [])),
        dosage=" ".join(data.get("dosage", [])),
        source="openFDA"
    )

    return JsonResponse({
        "message": f"✅ {drug_name} saved successfully",
        "medicine_id": med.id
    })
