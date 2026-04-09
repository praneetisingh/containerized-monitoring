FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80

CMD sed -i -e "s|__MONITOR_API_URL__|${MONITOR_API_URL}|g" -e "s|__DEMO_APP_URL__|${DEMO_APP_URL}|g" /usr/share/nginx/html/app.js && nginx -g "daemon off;"
