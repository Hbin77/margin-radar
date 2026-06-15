#!/bin/bash
# 매일 07:10 자동 갱신 cron 등록 (중복 방지). 실행: bash setup_cron.sh
SCRIPT="$(cd "$(dirname "$0")" && pwd)/run_daily.sh"
chmod +x "$SCRIPT"
LINE="10 7 * * * $SCRIPT"
# 기존 동일 항목 제거 후 추가
( crontab -l 2>/dev/null | grep -v "run_daily.sh" ; echo "$LINE" ) | crontab -
echo "등록 완료. 현재 crontab:"
crontab -l | grep run_daily.sh
echo
echo "※ macOS는 cron이 '전체 디스크 접근' 권한 필요할 수 있음(시스템설정>개인정보보호>전체디스크접근에 /usr/sbin/cron 추가)."
echo "※ 노트북이 켜져 있어야 실행됨. 서버/상시가동 환경 권장."
echo "해제: crontab -e 에서 run_daily.sh 줄 삭제"
