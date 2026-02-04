from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveUpdateAPIView
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from rest_framework import serializers as drf_serializers
from .models import User, ApiKey
from .serializers import (
    UserSerializer, LoginSerializer, SignupSerializer, 
    ProfileSerializer, ChangePasswordSerializer, GuestAuthSerializer
)
from django.db.models import Q

class UserView(ListAPIView):

    serializer_class = UserSerializer
    pagination_class = LimitOffsetPagination

    def get_queryset(self):

        queryset = User.objects.all().order_by('first_name')       
        search = self.request.query_params.get('search', '').strip()

        if search:
            queryset = queryset.filter(
                Q(username__icontains = search) |
                Q(first_name__icontains = search) |
                Q(last_name__icontains = search) |
                Q(email__icontains = search )
            )
        return queryset


class LoginApiView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

class SignupApiView(CreateAPIView):

    permission_classes = [AllowAny]
    queryset = User.objects.all()
    serializer_class = SignupSerializer

class ProfileView(RetrieveUpdateAPIView):
    """
    GET: Getting profile user 
    PUT/PATCH: Updating authenticated profile user
    """

    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return User.objects.get(id = self.request.user.id)

class ChangePasswordView(APIView):

    def post(self, request):

        serializer = ChangePasswordSerializer(
            data=request.data,
            context = {'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Password were updated successfully!"
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
    
class GuestAuthView(APIView):

    permission_classes = [AllowAny]
    @extend_schema(
        parameters = [
            OpenApiParameter(
                name = 'X-API-Key',
                type=str,
                location = OpenApiParameter.HEADER,
                required=True,
                description = 'API Key for guest access'
            ),
        ],
        request = GuestAuthSerializer,
        responses = {
            200: inline_serializer(
                name = "GuestAuthResponse",
                fields = {
                    'access': drf_serializers.CharField(),
                    'refresh': drf_serializers.CharField(),
                    'userId': drf_serializers.CharField(),
                    'user_type': drf_serializers.CharField(),
                    'is_new_user': drf_serializers.BooleanField(),
                    'user': drf_serializers.DictField(),
                }
            ),
            401: inline_serializer(
                name="GuestAuthUnauthorized",
                fields = {
                    'detail': drf_serializers.CharField()
                }
            ),
            400: inline_serializer(
                name="GuestAuthError",
                fields = {
                    'detail': drf_serializers.CharField()
                }
            )
        },
        description = "Auth to Guest. API KEY valid is required"
    )

    def post(self, request):

        api_key_plain = request.headers.get('X-API-KEY')

        if not api_key_plain:
            return Response(
                {"detail": "X-API-KEY header is required."},
                status = status.HTTP_400_BAD_REQUEST
            )
        
        api_key = ApiKey.validate_key(api_key_plain)

        if not api_key:
            return Response(
                {"detail": "X-API-KEY header is not valid."},
                status = status.HTTP_401_UNAUTHORIZED
            )
        
        if not api_key.has_scope('guest:created'):
            return Response(
                {"detail": "X-API-KEY does not have 'guest:created' scope."},
                status = status.HTTP_403_FORBIDDEN
            )
        
        serializer = GuestAuthSerializer(data=request.data, api_key=api_key)

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status = status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = serializer.authenticate()

            action = "created" if result["is_new_user"] else "authenticated"
            print(f"[GUEST] User {result['userId']} {action} via API key: {api_key.name}")

            return Response(result, status = status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"detail": f"Auth Error: {str(e)}"},
                status = status.HTTP_500_INTERNAL_SERVER_ERROR
            )