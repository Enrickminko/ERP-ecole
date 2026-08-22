FROM nginx:alpine

# Copie de la configuration personnalisée Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copie des fichiers frontend HTML/CSS/JS dans le dossier Nginx
COPY ./frontend /usr/share/nginx/html

EXPOSE 80