FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80

CMD sed -i -e "s|__MONITOR_API_URL__|${MONITOR_API_URL}|g" -e "s|__USER_SERVICE_URL__|${USER_SERVICE_URL}|g" -e "s|__ORDER_SERVICE_URL__|${ORDER_SERVICE_URL}|g" /usr/share/nginx/html/app.js && \
    sed -i -e "s|__MONITOR_API_URL__|${MONITOR_API_URL}|g" -e "s|__USER_SERVICE_URL__|${USER_SERVICE_URL}|g" -e "s|__ORDER_SERVICE_URL__|${ORDER_SERVICE_URL}|g" /usr/share/nginx/html/store.js && \
    nginx -g "daemon off;"
