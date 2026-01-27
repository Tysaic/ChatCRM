from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveUpdateAPIView
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import User
from .serializers import (
    UserSerializer, LoginSerializer, SignupSerializer, 
    ProfileSerializer, ChangePasswordSerializer
)

class UserView(ListAPIView):

    queryset = User.objects.all().order_by('first_name')
    serializer_class = UserSerializer
    pagination_class = LimitOffsetPagination
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        excludeUserArr = []

        try:
            excludeUsers = self.request.query_params.get('exclude')
            if excludeUsers:
                usersIds = excludeUsers.split(',')
                for userId in usersIds:
                    excludeUserArr.append(int(userId))
        except:
            return []
        
        return super().get_queryset().exclude(id__in=excludeUserArr)
    

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