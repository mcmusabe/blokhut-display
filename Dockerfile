FROM nginx:alpine

# Kopieer website bestanden naar nginx
COPY index.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY nginx.conf /etc/nginx/nginx.conf

# Expose poort 80
EXPOSE 80

# Nginx draait automatisch
CMD ["nginx", "-g", "daemon off;"]
