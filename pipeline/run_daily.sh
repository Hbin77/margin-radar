#!/bin/bash
# 매일 갱신 래퍼 (cron/launchd에서 호출). 환경변수 로드 + 로그 기록.
cd "$(dirname "$0")" || exit 1
export $(grep -v '^#' ../.env | xargs)
mkdir -p ../logs
PY="$(command -v python3 || echo /opt/homebrew/bin/python3)"
echo "===== $(date '+%Y-%m-%d %H:%M:%S') 일일 갱신 시작 =====" >> ../logs/daily.log
"$PY" daily_update.py >> ../logs/daily.log 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') 종료(코드 $?) =====" >> ../logs/daily.log
