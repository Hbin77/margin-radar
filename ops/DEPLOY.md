# MR 배포 운영 문서

## 아키텍처

```
                          GitHub (Hbin77/margin-radar, public)
                                   │ push to main
                                   ▼
                    [kis-bot] mr-gha-runner (self-hosted, docker)
                                   │ git reset + docker compose up
                                   ▼
            [kis-bot] mr-web (nginx :8910, 127.0.0.1)
                                   ▲
            [kis-bot] mr-cloudflared (tunnel "mr")
                                   │
                       Cloudflare → https://mr.hbinserver.cloud

  [abcd NAS] mr-pipeline (docker, 빅데이터 242MB 마운트)
       /volume1/phb007298/margin-radar
       매일: 수집 → score_v2 → ML → build_web_data → web/data.json
                                   │ (kis-bot cron이 pull)
                                   ▼
            [kis-bot] /home/hbin/mr-shared/data.json  (nginx 바인드마운트, git 외부)
```

- **웹 서빙**: kis-bot. 빅데이터 없음(저장공간 절약). nginx 컨테이너가 정적 SPA + data.json 서빙.
- **데이터/연산**: abcd NAS(= DB/스토리지 서버). 빅데이터 보관 + ML 파이프라인 실행.
- **도메인**: mr.hbinserver.cloud → kis-bot 전용 Cloudflare 터널 `mr`(기존 터널 무손상).
- **CI/CD**: GitHub Actions self-hosted 러너(docker 컨테이너). main 머지 시 웹 자동 재배포.

## kis-bot 구성요소 (sudo 불가 → 전부 docker, --restart unless-stopped)

| 컨테이너 | 역할 | 비고 |
|---|---|---|
| `mr-web` | nginx 정적 서빙 | `127.0.0.1:8910:80`, `/home/hbin/mr-shared/data.json` 마운트(git 외부) |
| `mr-cloudflared` | Cloudflare 터널 `mr` | `--network host --user 0:0`, `~/.cloudflared/mr-config.yml` |
| `mr-gha-runner` | GitHub Actions 러너 | docker.sock + `/home/hbin/apps/margin-radar` 마운트 |

배포 디렉토리: `/home/hbin/apps/margin-radar` (origin/main 클론)

### 수동 재배포
```bash
cd ~/apps/margin-radar && git pull && docker compose build web && docker compose up -d web
```

### 터널 재생성(참고)
```bash
cloudflared tunnel create mr
cloudflared tunnel route dns --overwrite-dns <mr-tunnel-id> mr.hbinserver.cloud
# config: ~/.cloudflared/mr-config.yml (ingress mr.hbinserver.cloud → localhost:8910)
docker run -d --name mr-cloudflared --restart unless-stopped --user 0:0 --network host \
  -v /home/hbin/.cloudflared:/etc/cloudflared:ro \
  cloudflare/cloudflared:latest tunnel --config /etc/cloudflared/mr-config.yml run
```

## abcd NAS 파이프라인

경로: `/volume1/phb007298/margin-radar` (git 클론 + 빅데이터 `data/products.csv` untracked + `.env`)

```bash
cd /volume1/phb007298/margin-radar
git pull
sudo /usr/local/bin/docker compose --profile pipeline build pipeline   # 의존성 변경 시
sudo /usr/local/bin/docker compose --profile pipeline run --rm pipeline # 1회 갱신
```

## 일일 자동 갱신 (kis-bot cron이 NAS 구동)

`ops/sync_from_nas.sh` 가 kis-bot에서 매일 실행:
1. NAS 파이프라인 컨테이너 1회 실행
2. NAS `web/data.json` → kis-bot 웹 디렉토리(JSON 검증 후 교체)

설정: `ops/nas.env`(gitignore, `nas.env.example` 참고). kis-bot→abcd 전용 SSH 키 필요.

crontab 예시(kis-bot):
```
30 7 * * * /home/hbin/apps/margin-radar/ops/sync_from_nas.sh >> /home/hbin/apps/margin-radar/sync.log 2>&1
```

## 보안 메모
- `.env`(API 키), `ops/nas.env`(NAS 접속정보)는 git 비추적. 공개 repo엔 결과물(web/data.json)만.
- 라이선스: 열람 전용(LICENSE). 무단 복제·이용 금지.
