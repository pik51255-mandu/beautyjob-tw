# 발행된 미리보기 (Artifact 원본)

claude.ai Artifact로 발행한 페이지의 **원본 파일**. 세션 컨테이너는 사라지지만 이 폴더는 남는다.

| 파일 | 챕터 | 언어 | 발행 URL |
|---|---|---|---|
| `ch01-preview-ko.artifact.html` | #1 머리카락 구조 전해부 | ko 검수판 | https://claude.ai/code/artifact/92067881-aecb-43c3-97ad-7e28b9e20adf |
| `ch01-preview-zh.artifact.html` | #1 頭髮結構全解析 | 번체 발행판 | https://claude.ai/code/artifact/c015a794-5788-4b30-ad2b-88606513df07 |
| `ch02-preview-ko.artifact.html` | #2 머리카락의 네 가지 결합 | ko 검수판 | https://claude.ai/code/artifact/87bd1c25-075e-4ba7-b94a-d3f0e78c04ea |

## 폴더 옆의 스탠드얼론 판과 뭐가 다른가

내용은 같고 **바깥 껍데기만** 다르다.

- `chapter-0N-preview-*.html` (챕터 폴더 안) — `<html><head><body>`가 있는 완전한 문서. 폰이나 브라우저에서 파일을 직접 열 때 쓴다.
- `*.artifact.html` (이 폴더) — Artifact는 발행 시점에 스켈레톤을 씌우므로 래퍼를 뺀 본문만 담는다. 그대로 발행에 넣는다.

## 갱신 방법

본문이나 비주얼을 고치면 두 판을 함께 다시 뽑는다.

```bash
# 챕터 #1 (언어 인자 필요)
python3 content-factory/ch01/src/build_preview.py ko content-factory/artifacts/ch01-preview-ko.artifact.html
python3 content-factory/ch01/src/build_preview.py zh content-factory/artifacts/ch01-preview-zh.artifact.html

# 챕터 #2
python3 content-factory/review-ko/ch02/src/build_preview.py content-factory/artifacts/ch02-preview-ko.artifact.html
```

다시 발행할 때는 **위 표의 URL을 지정**해야 같은 링크가 유지된다. URL 없이 발행하면 별개의 아티팩트가 새로 생긴다.

## 챕터 패키지 작업 순서

1. 본문·비주얼 작업 → 커밋
2. **main 머지** (새 세션은 main을 클론하므로 이걸 해야 남는다)
3. **Artifact 발행** → 링크 전달
4. 이 폴더의 원본과 위 표 갱신
