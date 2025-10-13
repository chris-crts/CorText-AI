from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, logout, authenticate

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from django.contrib.auth.hashers import check_password
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

        User = get_user_model()

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        user = authenticate(request, username=user_obj.username, password=password)
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
            return JsonResponse({'message': 'Admin fully authenticated'})
        else:
            return JsonResponse({'error': 'Invalid admin credentials'}, status=403)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "authenticated": True,
            "is_admin": getattr(request.user, 'is_admin', False),
            "email": request.user.email
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




