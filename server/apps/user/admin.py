from django.contrib import admin
from .models import User, OnlineUser
# Register your models here.

admin.site.register(User)
admin.site.register(OnlineUser)