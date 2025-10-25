from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField(default=18)
    gender = models.CharField(max_length=50)
    address = models.TextField(blank=True, null=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=200)
    
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    is_admin = models.BooleanField(default=False)
    is_admin_magic = models.BooleanField(default=False)
    
    def __str__(self):
        return self.email

class ManualAdmin(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    is_admin = models.BooleanField(default=True)

    def __str__(self):
        return self.username

class Medicine(models.Model):
    name = models.CharField(max_length=255)
    brand_name = models.JSONField(default=list)
    generic_name = models.JSONField(default=list)
    active_ingredient = models.JSONField(default=list)
    indications = models.TextField(blank=True)
    warnings = models.TextField(blank=True)
    dosage = models.TextField(blank=True)
    source = models.CharField(max_length=255, default="openFDA")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name