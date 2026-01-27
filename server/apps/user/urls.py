from django.urls import path
from .views import (
    UserView, LoginApiView, 
    SignupApiView, ProfileView, ChangePasswordView
)

urlpatterns = [
    path('users', UserView.as_view(), name = 'userList'),
    path('login', LoginApiView.as_view(), name="login"),
    path('signup', SignupApiView.as_view(), name="signup"),
    path('profile', ProfileView.as_view(), name="profile"),
    path('change-password', ChangePasswordView.as_view(), name="change-password")
]