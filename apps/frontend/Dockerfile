#FROM node:22.14.0-alpine3.21 AS build
FROM node:22.17.0-alpine3.21 AS build

WORKDIR /usr/src/app

COPY . .
COPY apps/frontend/package*.json ./

RUN NODE_OPTIONS="--max-old-space-size=4096" npm ci

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

FROM nginx:1.27.4-alpine3.21-slim as fnl_base_image

COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY --from=build /usr/src/app/apps/frontend/conf/inject.template.js /usr/share/nginx/html/inject.template.js
COPY --from=build /usr/src/app/apps/frontend/conf/nginx.conf /etc/nginx/conf.d/configfile.template
COPY --from=build /usr/src/app/apps/frontend/conf/entrypoint.sh /

ENV PORT 80

ENV HOST 0.0.0.0

RUN sh -c "envsubst '\$PORT'  < /etc/nginx/conf.d/configfile.template > /etc/nginx/conf.d/default.conf"

EXPOSE 80

ENTRYPOINT [ "sh", "/entrypoint.sh" ]
