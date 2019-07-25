FROM golang:alpine as builder
WORKDIR /go/src/github.com/setecrs/imager
COPY . .
RUN CGO_ENABLED=0 go build -o /go/bin/imager .
WORKDIR /go/src/github.com/setecrs/imager/notify
RUN CGO_ENABLED=0 go build -o /go/bin/notify .

FROM alpine:edge as npmbuilder
RUN apk add --no-cache \
      nodejs \
      nodejs-npm

WORKDIR /root/app
COPY app/package.json .
RUN npm install
COPY app/ .
RUN npm run build

FROM alpine:edge
ENV GRAPHQL_URL http://wekan-hooks-noauth
ENV UDEV_LISTEN localhost:8080
ENV PORT 80
EXPOSE 80

COPY --from=builder /go/bin/imager /root/imager
COPY --from=builder /go/bin/notify /root/notify
COPY --from=npmbuilder /root/app/build /root/app/build

RUN apk add --no-cache \
      git \
      smartmontools \
      eudev \
      coreutils \
      bash \
      tmux \
      hdparm \
      ddrescue

WORKDIR /root/
RUN ./install.sh

CMD imager
