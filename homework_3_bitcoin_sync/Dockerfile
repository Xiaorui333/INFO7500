
FROM python:3.9-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libtool \
    autotools-dev \
    automake \
    pkg-config \
    libssl-dev \
    libevent-dev \
    bsdmainutils \
    wget \
    git \
    curl \
    libboost-system-dev \
    libboost-filesystem-dev \
    libboost-chrono-dev \
    libboost-test-dev \
    libboost-thread-dev

WORKDIR /usr/src
RUN git clone https://github.com/bitcoin/bitcoin.git

WORKDIR /usr/src/bitcoin
RUN git checkout v24.0
RUN ./autogen.sh
RUN ./configure --without-gui --disable-wallet
RUN make -j$(nproc)
RUN make install

RUN mkdir /bitcoin_data
CMD ["bitcoind", "-datadir=/bitcoin_data", "-server=1", \
     "-rpcuser=xiaorui_liu", "-rpcpassword=Frida1195433053#"]
