#!/usr/bin/env bash
# kis-bot에서 매일 실행: abcd NAS 파이프라인 트리거 → 생성된 data.json을 웹으로 동기화.
#
# 설정값은 같은 폴더의 nas.env 에서 읽음(공개 repo에 접속정보 노출 방지, gitignore됨).
#   NAS_HOST, NAS_PORT, NAS_USER, NAS_DIR, NAS_KEY, APP_DIR, DATA_FILE
#
# 동작:
#   1) NAS에서 파이프라인 컨테이너 1회 실행(수집·점수·ML·빌드)
#   2) NAS의 web/data.json 을 라이브 마운트 경로(DATA_FILE)로 안전하게 복사(JSON 검증 후 교체)
#   nginx는 data.json 을 바인드마운트로 서빙 → 재빌드 없이 즉시 반영, 웹은 5분마다 폴링.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$DIR/nas.env"

LOG="${APP_DIR}/sync.log"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }

ssh_nas() {
  ssh -i "$NAS_KEY" -p "$NAS_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
      "${NAS_USER}@${NAS_HOST}" "$@"
}

log "=== NAS 파이프라인 시작 ==="
ssh_nas "cd '$NAS_DIR' && sudo /usr/local/bin/docker compose --profile pipeline run --rm pipeline" \
  >>"$LOG" 2>&1 || { log "파이프라인 실행 실패 — 동기화 중단(기존 data.json 유지)"; exit 1; }

log "data.json 동기화"
: "${DATA_FILE:=/home/hbin/mr-shared/data.json}"   # 웹 컨테이너가 마운트하는 라이브 경로(git 외부)
TMP="${DATA_FILE}.tmp"
ssh_nas "cat '$NAS_DIR/web/data.json'" > "$TMP"

if python3 -c "import json,sys; json.load(open('$TMP'))" 2>/dev/null \
   && [ "$(stat -c%s "$TMP")" -gt 100000 ]; then
  mv "$TMP" "$DATA_FILE"
  log "동기화 완료 ($(stat -c%s "$DATA_FILE") bytes)"
else
  rm -f "$TMP"
  log "data.json 유효성 검증 실패 — 기존 파일 유지"
  exit 1
fi
