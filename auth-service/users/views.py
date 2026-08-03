from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .serializers import RegisterSerializer
from .rabbitmq_publisher import publish_user_created_event

class RegisterView(APIView):
    serializer_class = RegisterSerializer 
    
    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description="Utilisateur créé avec succès !"),
            400: OpenApiResponse(description="Erreurs de validation")
        }
    ) 
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():

            user = serializer.save()
            
            publish_user_created_event({
                'username': getattr(user, 'username', request.data.get('username')),
                'email': getattr(user, 'email', request.data.get('email'))
            })
            
            return Response({"message": "Utilisateur crée avec succès !"}, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)