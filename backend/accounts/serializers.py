from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User

PROFILE_FIELDS = ["full_name", "phone", "address", "city", "pincode"]


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile. Email and admin flag are read-only."""

    class Meta:
        model = User
        fields = ["id", "email", *PROFILE_FIELDS, "is_staff", "date_joined"]
        read_only_fields = ["id", "email", "is_staff", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "phone"]
        extra_kwargs = {"full_name": {"required": True, "allow_blank": False},
                        "phone": {"required": True, "allow_blank": False}}

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-side user management: can set password, admin flag and active flag."""

    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "password", *PROFILE_FIELDS, "is_staff", "is_active",
                  "date_joined", "order_count"]
        read_only_fields = ["id", "date_joined"]

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})
        if attrs.get("password"):
            validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        is_staff = validated_data.get("is_staff", False)
        validated_data["is_superuser"] = is_staff
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", "")
        if "is_staff" in validated_data:
            instance.is_superuser = validated_data["is_staff"]
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
