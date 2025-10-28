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
    
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator


class Patient(models.Model):
    """Patient information model"""
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    SMOKING_CHOICES = [
        ('never', 'Never Smoked'),
        ('former', 'Former Smoker'),
        ('current', 'Current Smoker'),
    ]
    
    ROUTE_CHOICES = [
        ('oral', 'Oral'),
        ('iv', 'Intravenous'),
        ('im', 'Intramuscular'),
        ('topical', 'Topical'),
        ('inhaled', 'Inhaled'),
        ('other', 'Other'),
    ]
    
    # Identity & Demographics
    patient_id = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    age = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(150)])
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    
    # Clinical Information
    chief_complaint = models.TextField()
    diagnosis = models.TextField()
    symptoms = models.JSONField(default=list)  # List of symptoms
    medical_history = models.JSONField(default=list)  # List of conditions
    family_history = models.JSONField(default=list, blank=True)  # List of family conditions
    
    # Medications
    current_medications = models.JSONField(default=list)  # List of current meds
    recent_medications = models.JSONField(default=list, blank=True)  # Recently discontinued
    
    # Allergies & Reactions
    drug_allergies = models.JSONField(default=list)  # Critical for safety
    adverse_reactions = models.JSONField(default=list, blank=True)
    
    # Vital Signs
    blood_pressure = models.CharField(max_length=20, blank=True)
    
    # Lab Results
    renal_function = models.JSONField(default=dict, blank=True)  # creatinine, GFR
    liver_function = models.JSONField(default=dict, blank=True)  # ALT, AST
    recent_labs = models.JSONField(default=dict, blank=True)  # CBC, glucose, etc.
    
    # Reproductive Health
    pregnancy_status = models.CharField(max_length=100, blank=True)
    
    # Lifestyle Factors
    smoking_status = models.CharField(max_length=20, choices=SMOKING_CHOICES, default='never')
    alcohol_use = models.CharField(max_length=50, blank=True)
    dietary_restrictions = models.JSONField(default=list, blank=True)
    
    # Preferences & Constraints
    financial_constraints = models.CharField(max_length=200, blank=True)
    preferred_route = models.CharField(max_length=20, choices=ROUTE_CHOICES, default='oral')
    
    # Vector Embedding
    embedding = models.JSONField(default=list)  # 768-dimensional vector
    vector_dim = models.IntegerField(default=768)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.patient_id} - {self.name}"
    
    def to_dict(self):
        """Convert model to dictionary for processing"""
        return {
            "id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "gender": self.get_gender_display(),
            "weight_kg": self.weight_kg,
            "height_cm": self.height_cm,
            "chief_complaint": self.chief_complaint,
            "diagnosis": self.diagnosis,
            "symptoms": self.symptoms,
            "medical_history": self.medical_history,
            "family_history": self.family_history,
            "current_medications": self.current_medications,
            "recent_medications": self.recent_medications,
            "drug_allergies": self.drug_allergies,
            "adverse_reactions": self.adverse_reactions,
            "blood_pressure": self.blood_pressure,
            "renal_function": self.renal_function,
            "liver_function": self.liver_function,
            "pregnancy_status": self.pregnancy_status,
            "recent_labs": self.recent_labs,
            "smoking_status": self.smoking_status,
            "alcohol_use": self.alcohol_use,
            "dietary_restrictions": self.dietary_restrictions,
            "financial_constraints": self.financial_constraints,
            "preferred_route": self.preferred_route,
            "embedding": self.embedding,
            "vector_dim": self.vector_dim,
            "timestamp": self.created_at.isoformat()
        }


class MedicineRecommendation(models.Model):
    """Store medicine recommendations for patients"""
    CONFIDENCE_CHOICES = [
        ('high', 'High Confidence'),
        ('medium', 'Medium Confidence'),
        ('low', 'Low Confidence'),
        ('not_recommended', 'Not Recommended'),
    ]
    
    # Relationships
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='recommendations')
    
    # Medicine Information
    medicine_id = models.CharField(max_length=50)
    medicine_name = models.CharField(max_length=200)
    
    # Recommendation Metrics
    similarity_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Cosine similarity score between patient and medicine embeddings"
    )
    confidence_level = models.CharField(max_length=20, choices=CONFIDENCE_CHOICES)
    is_safe = models.BooleanField(default=True, help_text="Passed contraindication checks")
    
    # Safety Information
    warnings = models.JSONField(default=list, help_text="List of warnings or contraindications")
    
    # Medicine Details (denormalized for quick access)
    medicine_details = models.JSONField(default=dict)
    
    # Clinical Review
    clinician_approved = models.BooleanField(null=True, blank=True)
    clinician_notes = models.TextField(blank=True)
    reviewed_by = models.CharField(max_length=200, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Dispensing Status
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('dispensed', 'Dispensed'),
        ('rejected', 'Rejected'),
        ('alternative_chosen', 'Alternative Chosen'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medicine_recommendations'
        ordering = ['-similarity_score', '-created_at']
        indexes = [
            models.Index(fields=['patient', 'similarity_score']),
            models.Index(fields=['medicine_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
        unique_together = [['patient', 'medicine_id', 'created_at']]
    
    def __str__(self):
        return f"{self.patient.name} - {self.medicine_name} ({self.similarity_score:.3f})"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "patient_id": self.patient.patient_id,
            "patient_name": self.patient.name,
            "medicine_id": self.medicine_id,
            "medicine_name": self.medicine_name,
            "similarity_score": self.similarity_score,
            "confidence_level": self.get_confidence_level_display(),
            "is_safe": self.is_safe,
            "warnings": self.warnings,
            "medicine_details": self.medicine_details,
            "clinician_approved": self.clinician_approved,
            "clinician_notes": self.clinician_notes,
            "reviewed_by": self.reviewed_by,
            "status": self.get_status_display(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class RecommendationFeedback(models.Model):
    """Track feedback on recommendations for model improvement"""
    FEEDBACK_CHOICES = [
        ('accepted', 'Accepted and Effective'),
        ('accepted_modified', 'Accepted with Modifications'),
        ('rejected_unsafe', 'Rejected - Safety Concerns'),
        ('rejected_ineffective', 'Rejected - Not Effective'),
        ('rejected_other', 'Rejected - Other Reason'),
    ]
    
    recommendation = models.OneToOneField(
        MedicineRecommendation,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    
    feedback_type = models.CharField(max_length=30, choices=FEEDBACK_CHOICES)
    feedback_notes = models.TextField(blank=True)
    
    # Outcome tracking
    patient_outcome = models.TextField(blank=True, help_text="Did the medicine help?")
    side_effects = models.TextField(blank=True)
    
    # Who provided feedback
    submitted_by = models.CharField(max_length=200)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'recommendation_feedback'
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"Feedback for {self.recommendation.medicine_name} - {self.feedback_type}"


class RecommendationSession(models.Model):
    """Track recommendation generation sessions"""
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='sessions')
    
    # Session parameters
    top_k = models.IntegerField(default=10)
    similarity_threshold = models.FloatField(default=0.75)
    
    # Results
    total_candidates = models.IntegerField(help_text="Total medicines evaluated")
    safe_recommendations = models.IntegerField(help_text="Number of safe recommendations")
    avg_similarity = models.FloatField(help_text="Average similarity score")
    
    # Performance metrics
    processing_time_seconds = models.FloatField()
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'recommendation_sessions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Session {self.session_id} - {self.patient.name}"