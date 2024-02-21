FROM alpine:latest

RUN apk add --update nodejs npm libpq-dev gdal gdal-tools gdal-driver-PG
RUN npm install --global yarn
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . /usr/src/app
COPY .env.example .env

RUN yarn install && yarn compile

ENV PORT=80
ENV GDAL=local
ENV CRON=@daily

# VOLUME /usr/src/app/shapefiles

EXPOSE 80

CMD yarn scripts:queimadas --cron $CRON & yarn start
