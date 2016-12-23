FROM alpine:3.4

RUN apk add --no-cache \
      git \
      smartmontools \
      eudev \
      coreutils \
      bash \
      tmux \
      hdparm \
      nodejs
RUN apk add --no-cache ddrescue --repository http://nl.alpinelinux.org/alpine/edge/testing

WORKDIR /root/imager
COPY package.json ./
RUN npm install

COPY .git .git
COPY ./[^/]*.* ./
COPY config config/
COPY imager imager/
COPY lib lib/
COPY models models/

CMD npm start
