"""
UlanCity Background Video Composition
Canva MCP로 생성한 배경 PNG(scene1~N.png)를 읽어 FINAL.mp4로 합성
"""

import os
import sys
import glob
import subprocess
import tempfile
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

    scenes = find_scenes()
    print(f"발견된 씬: {[s.name for s in scenes]}")

    output_path = OUTPUT_DIR / "FINAL.mp4"
    print(f"출력: {output_path}")

    build_video(scenes, output_path)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"완료! {output_path}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
