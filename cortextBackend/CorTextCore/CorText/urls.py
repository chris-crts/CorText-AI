from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/check-auth/', views.check_auth),
    path('api/check-magicEmail-auth/', views.check_magic_email_auth, name='check_magic_email_auth'),
    path('api/verify-manual-admin/', views.verify_manual_admin, name='verify_manual_admin'),
    
    path('api/signup/', views.signup_view),
    path('api/login/', views.login_view),

    path('api/logout/', views.logout_view),
    path('api/admin-login/', views.admin_login_view),
    
    path('api/profile/', views.get_user_profile),
    
    path('api/edit-manual-admin/', views.edit_manual_admin, name='update_manual_admin'),
    path('api/delete-manual-admin/', views.delete_manual_admin, name='delete_manual_admin'),
    path('api/list-manual-admins/', views.list_manual_admins, name='list_manual_admins'),
    path('api/create-manual-admin/', views.create_manual_admin, name='create_manual_admin'),
    
    path('api/save_all_medicines/', views.save_all_medicines, name='save_all_medicines'), 
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
