from django.contrib.auth import authenticate
from django.db.models import Count, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import (AdminUserSerializer, ChangePasswordSerializer,
                          RegisterSerializer, UserSerializer, tokens_for)


def auth_payload(user):
    return {**tokens_for(user), "user": UserSerializer(user).data}


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response({"detail": "Incorrect email or password."},
                            status=status.HTTP_401_UNAUTHORIZED)
        return Response(auth_payload(user))


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password updated."})


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = User.objects.annotate(order_count=Count("orders"))
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(full_name__icontains=search)
                           | Q(phone__icontains=search))
        return qs

    def destroy(self, request, *args, **kwargs):
        if self.get_object() == request.user:
            return Response({"detail": "You cannot delete your own account."},
                            status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)
