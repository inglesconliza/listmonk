#!/bin/sh

set -eu

: "${LISTMONK_db__host:?missing LISTMONK_db__host}"
: "${LISTMONK_db__port:?missing LISTMONK_db__port}"
: "${LISTMONK_db__user:?missing LISTMONK_db__user}"
: "${LISTMONK_db__password:?missing LISTMONK_db__password}"
: "${LISTMONK_db__database:?missing LISTMONK_db__database}"

export LISTMONK_app__address="${LISTMONK_app__address:-0.0.0.0:9000}"
export LISTMONK_db__ssl_mode="${LISTMONK_db__ssl_mode:-require}"
export LISTMONK_db__max_open="${LISTMONK_db__max_open:-25}"
export LISTMONK_db__max_idle="${LISTMONK_db__max_idle:-25}"
export LISTMONK_db__max_lifetime="${LISTMONK_db__max_lifetime:-300s}"
export TZ="${TZ:-Etc/UTC}"

exec /usr/local/bin/docker-entrypoint.sh sh -c './listmonk --install --idempotent --yes --config "" && ./listmonk --upgrade --yes --config "" && ./listmonk --config ""'
