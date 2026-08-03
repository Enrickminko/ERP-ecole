from django.contrib import admin
from django.urls import path, include  
from drf_spectacular.views import SpectacularSwaggerView, SpectacularAPIView 
from users.views import RegisterView
from rest_framework_simplejwt.views import TokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register', RegisterView.as_view(), name='register'),
    path('api/login', TokenObtainPairView.as_view(), name='login'),
    

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    

    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    path('api/v1/auth/', include('users.urls')),
]