from django.db import models
from django.db.models import Count
from django.contrib.auth.models import AbstractUser
from shortuuidfield import ShortUUIDField
from django.utils import timezone
import secrets
import hashlib
    
class UserType(models.Model):

    code = models.CharField(
        max_length=8,
        unique = True,
        primary_key = True,
        help_text = "Unique type code example: (ADMIN, MOD, USER)"
    )
    name = models.CharField(
        max_length = 32,
        help_text = "Readable name for the user type"
    )

    description = models.TextField(
        blank = True,
        null = True,
        help_text = "Description about the user type"
    )

    priority = models.IntegerField(
        default = 0,
        help_text = "Priority level/privileges of the user type"
    )

    is_active = models.BooleanField( default = True )
    created_at = models.DateTimeField( auto_now_add = True )
    updated_at = models.DateTimeField( auto_now = True )

    class Meta:

        db_table = "user_types"
        ordering = ['-priority']
        verbose_name = "User Type"
        verbose_name_plural = "User Types"
    
    def __str__(self):

        return f"{self.code} - {self.name}"
    


class User(AbstractUser):
    userId = ShortUUIDField()
    image = models.ImageField(upload_to="user", null=True, blank=True)

    user_type = models.ForeignKey(
        UserType,
        on_delete = models.PROTECT,
        related_name = "users",
        null=True,
        blank=True,
        default=None
    )

    guess_metadata = models.JSONField(
        null=True, 
        blank=True
    )

    class Meta:
        db_table = "users"
    
    def is_guest(self):
        return self.user_type and self.user_type.code == "GUEST"
    
    def is_admin(self):
        return self.user_type and self.user_type.code == "ADMIN"

    def get_type_code(self):
        return self.user_type.code if self.user_type else None
    
    def get_priority(self):
        return self.user_type.priority if self.user_type else 0

class OnlineUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username


class ApiKey(models.Model):

    class Status(models.TextChoices):

        ACTIVE = 'ACTIVE', 'active'
        INACTIVE = 'INACTIVE', 'inactive'
        REVOKED = 'REVOKED', 'revoked'
        EXPIRED = 'EXPIRED', 'expired'
    
    id = models.AutoField(primary_key = True)

    name = models.CharField(
        max_length = 24,
        help_text = "Name for the API key"
    )

    key_hash = models.CharField(
        max_length = 64,
        unique = True,
        db_index = True,
    )

    key_prefix = models.CharField(
        max_length = 8,
        help_text = "Prefix for the API key, used for identification"
    )

    status = models.CharField(
        max_length = 8,
        choices = Status.choices,
        default = Status.ACTIVE
    )

    created_by = models.ForeignKey(
        User,
        on_delete = models.SET_NULL,
        null=True,
        related_name = "owner_api_keys"
    )

    default_user_type = models.ForeignKey(
        UserType,
        on_delete = models.PROTECT,
        related_name = "api_keys",
        null=True,
        blank=True
    )

    scopes = models.JSONField(
        default = list,
        help_text = "List of scopes/permissions associated with the API key"
    )

    metadata = models.JSONField(
        null=True,
        blank=True
    )

    rate_limit = models.IntegerField(
        default = 10000,
        help_text = "Number of request for hour (0 = unlimited)"
    )

    usage_count = models.IntegerField(default = 0)
    last_used_at = models.DateTimeField(null=True, blank=True)


    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text = "Expiration date for the API key."
    )

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        db_table = "api_keys"
        ordering = ['-created_at']
        verbose_name = "Api Key"
        verbose_name_plural = "Api Keys"
    
    def __str__(self):
        return f"{self.name} - {self.key_prefix}"
    
    @classmethod
    def generate_key(cls):

        key_plain = secrets.token_urlsafe(32)
        key_hash = cls.hash_key(key_plain)
        key_prefix = key_hash[:8]

        return (key_plain, key_hash, key_prefix)
    
    @classmethod
    def hash_key(cls, key_plain):

        return hashlib.sha256(
            key_plain.encode('utf-8')
        ).hexdigest()
    
    @classmethod
    def create_key(cls, name, created_by=None, default_user_type=None,
    scopes = None, rate_limit=10000, expires_at=None, metadata=None):

        key_plain, key_hash, key_prefix = cls.generate_key()

        api_key = cls.objects.create(
            name = name,
            key_hash = key_hash,
            key_prefix = key_prefix,
            created_by = created_by,
            default_user_type = default_user_type,
            scopes = scopes or ["guest:created", "guest:read"],
            rate_limit = rate_limit,
            expires_at = expires_at,
            metadata = metadata
        )

        return (api_key, key_plain)
    
    @classmethod
    def validate_key(cls, key_plain):

        if not key_plain:
            return None
        
        key_hash = cls.hash_key(key_plain)

        try:
            api_key = cls.objects.get(key_hash = key_hash)

            if api_key.status != cls.Status.ACTIVE:
                return None
            
            if api_key.expires_at and api_key.expires_at < timezone.now():
                api_key.status = cls.Status.EXPIRED
                api_key.save(update_fields = ['status'])
                return None
            
            api_key.usage_count += 1
            api_key.last_used_at = timezone.now()
            api_key.save(update_fields = ['usage_count', 'last_used_at'])

            return api_key

        except cls.DoesNotExist:
            return None
    
    def has_scope(self, scope):

        return scope in self.scopes or '*' in self.scopes
    
    def revoke(self):

        self.status = self.Status.REVOKED
        self.save(update_fields = ['status'])
    
