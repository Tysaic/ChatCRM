from django.urls import path
from .views import (
    UserView, LoginApiView, 
    SignupApiView, ProfileView
)

urlpatterns = [
    path('users', UserView.as_view(), name = 'userList'),
    path('login', LoginApiView.as_view(), name="login"),
    path('signup', SignupApiView.as_view(), name="signup"),
    path('profile', ProfileView.as_view(), name="profile"),
]