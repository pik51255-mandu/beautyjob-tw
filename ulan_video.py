"""
UlanCity Background Video Composition
Canva MCP로 생성한 배경 PNG(scene1~N.png)를 읽어 FINAL.mp4로 합성
"""

import os
import sys
import glob
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from PIL import Image
import imageio_ffmpeg

BASE_DIR = Path.home() / "UlanCity"
INPUT_BG_DIR = BASE_DIR / "input" / "background"
OUTPUT_DIR = BASE_DIR / "output"

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# 씬당 재생 시간(초)
SCENE_DURATION = 3
# 출력 해상도 (Canva 기본: 1920x1080)
OUTPUT_W, OUTPUT_H = 1920, 1080
FPS = 30

# Canva presigned URLs — 내보내기 후 교체
CANVA_SCENE_URLS = {
    "scene1.png": "https://export-download.canva.com/tmmTw/DAHNlitmmTw/-1/0/0001-5812402839180194303.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260625%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260625T001701Z&X-Amz-Expires=54792&X-Amz-Signature=57a9e26c5abe496f830011337aad54e0bf8bc5aadc39d4b33182e48e4fbc36a7&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2025%20Jun%202026%2015%3A30%3A13%20GMT",
    "scene2.png": "https://export-download.canva.com/wmG2Y/DAHNlrwmG2Y/-1/0/0001-869702248365134267.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260625%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260625T011629Z&X-Amz-Expires=50961&X-Amz-Signature=788cac564ffd3c848bed16f578eb558264997439b354f20b73d3b34747da7b20&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2025%20Jun%202026%2015%3A25%3A50%20GMT",
    "scene3.png": "https://export-download.canva.com/57XPE/DAHNlo57XPE/-1/0/0001-4933075014483890143.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260625%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260625T114516Z&X-Amz-Expires=13987&X-Amz-Signature=f73fd5d6f91979bf737a476ba5441b2a2fc46d35619f6938241142a4822493a2&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2025%20Jun%202026%2015%3A38%3A23%20GMT",
    "scene4.png": "https://export-download.canva.com/awNBM/DAHNlsawNBM/-1/0/0001-2038386350666961870.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260624%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260624T184899Z&X-Amz-Expires=74779&X-Amz-Signature=2ff01f02e6f64d8459c1624737c3087ba125b58adad9818e2598f9317476dac1&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2025%20Jun%202026%2015%3A35%3A18%20GMT",
}


def download_scenes():
    """CANVA_SCENE_URLS에서 아직 없는 파일만 다운로드"""
    INPUT_BG_DIR.mkdir(parents=True, exist_ok=True)
    # 이 환경의 프록시가 export-download.canva.com을 차단하는 경우
    # NO_PROXY에 추가해서 직접 연결 시도
    os.environ.setdefault("NO_PROXY", "")
    no_proxy = os.environ.get("NO_PROXY", "")
    if "export-download.canva.com" not in no_proxy:
        os.environ["NO_PROXY"] = (no_proxy + ",export-download.canva.com").lstrip(",")

    for fname, url in CANVA_SCENE_URLS.items():
        dest = INPUT_BG_DIR / fname
        if dest.exists():
            print(f"  건너뜀 (이미 존재): {fname}")
            continue
        print(f"  다운로드: {fname} ...", end=" ", flush=True)
        try:
            urllib.request.urlretrieve(url, dest)
            print(f"{dest.stat().st_size // 1024} KB")
        except Exception as e:
            print(f"실패 — {e}")
            print(f"  → 수동으로 다운로드 후 {dest} 에 저장하세요.")


def find_scenes() -> list[Path]:
    """scene*.png 파일을 번호 순서로 반환"""
    files = sorted(INPUT_BG_DIR.glob("scene*.png"), key=lambda p: p.stem)
    if not files:
        raise FileNotFoundError(f"배경 이미지 없음: {INPUT_BG_DIR}/scene*.png")
    return files


def normalize_image(src: Path, dst: Path):
    """이미지를 OUTPUT_W x OUTPUT_H 로 리사이즈 후 PNG 저장"""
    img = Image.open(src).convert("RGB")
    img = img.resize((OUTPUT_W, OUTPUT_H), Image.LANCZOS)
    img.save(dst)


def build_video(scene_paths: list[Path], output_path: Path):
    """ffmpeg로 각 씬을 SCENE_DURATION 초짜리 클립으로 이어 붙여 mp4 생성"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        concat_lines = []

        for i, scene in enumerate(scene_paths):
            norm_path = tmp / f"norm_{i:03d}.png"
            normalize_image(scene, norm_path)

            clip_path = tmp / f"clip_{i:03d}.mp4"
            cmd = [
                FFMPEG, "-y",
                "-loop", "1",
                "-i", str(norm_path),
                "-t", str(SCENE_DURATION),
                "-vf", f"fps={FPS},format=yuv420p",
                "-c:v", "libx264",
                "-preset", "fast",
                str(clip_path),
            ]
            subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)
            concat_lines.append(f"file '{clip_path}'\n")

        concat_file = tmp / "concat.txt"
        concat_file.write_text("".join(concat_lines))

        cmd = [
            FFMPEG, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path),
        ]
        subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)


def main():
    print("=== UlanCity Video Composition ===")
    print(f"배경 디렉토리: {INPUT_BG_DIR}")
    print("[ 1/3 ] Canva 이미지 다운로드 확인...")
    download_scenes()

    scenes = find_scenes()
    print(f"발견된 씬: {[s.name for s in scenes]}")

    output_path = OUTPUT_DIR / "FINAL.mp4"
    print(f"출력: {output_path}")

    build_video(scenes, output_path)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"완료! {output_path}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
