"""Export the captured demo as one silent 1080p MP4 and seven timed clips."""
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / 'output' / 'videos'
ffmpeg = root / 'tmp' / 'recording-tools' / 'python' / 'imageio_ffmpeg' / 'binaries' / 'ffmpeg-win-x86_64-v7.1.exe'
manifest = json.loads((out / 'recording-manifest.json').read_text(encoding='utf-8'))
raw = Path(manifest['rawPath'])

def run(args):
    result = subprocess.run([str(ffmpeg), '-hide_banner', '-y', *map(str, args)],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-7000:])
    return result.stderr

probe = subprocess.run([str(ffmpeg), '-hide_banner', '-i', str(raw)],
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True).stderr
duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', probe)
if not duration:
    raise RuntimeError(f'Cannot read capture duration: {probe}')
raw_seconds = int(duration[1])*3600 + int(duration[2])*60 + float(duration[3])
# Browser recording starts before page load; align the requested 140-second
# performance with the end of the recording, excluding its startup frames.
offset = max(0, raw_seconds - manifest['elapsedSeconds'])
manifest['rawDurationSeconds'] = raw_seconds
manifest['exportOffsetSeconds'] = offset
print(f'Capture: {raw_seconds:.2f}s; trim startup: {offset:.2f}s', flush=True)
full = out / 'meridian-full-demo-2m20s.mp4'
run(['-ss', f'{offset:.3f}', '-i', raw, '-t', '140', '-an',
     '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast',
     '-crf', '18', '-force_key_frames', '0,15,30,55,85,100,125',
     '-movflags', '+faststart', full])
print(f'Exported {full.name}', flush=True)

for scene in manifest['scenes']:
    target = out / scene['file']
    run(['-ss', scene['start'], '-i', full, '-t', scene['duration'],
         '-map', '0:v:0', '-c', 'copy', '-an', '-movflags', '+faststart', target])
    print(f"Exported {target.name}: {scene['duration']} seconds", flush=True)

sample_times = [0, 18, 35, 45, 69, 92, 106, 121, 132, 139]
for second in sample_times:
    run(['-ss', second, '-i', full, '-frames:v', 1,
         out / 'checks' / f'video-frame-{second:03d}s.png'])

rows = ['# Meridian recording package', '',
        'All files are silent H.264 MP4 video, 1920 x 1080, 25 fps.',
        'The footage records the working local prototype; no voiceover or captions are baked in.',
        '', 'Full video: meridian-full-demo-2m20s.mp4 (140 seconds).', '',
        '| Start | Duration | Scene | File |', '|---|---|---|---|']
for s in manifest['scenes']:
    rows.append(f"| {s['start']//60}:{s['start']%60:02d} | {s['duration']}s | {s['label']} | {s['file']} |")
rows += ['', 'The recording follows the revised broad project introduction, Arjun customer story,',
         'Rohan network comparison, and saved investigation/support-review flow.',
         'Model values and portfolio counts reflect the app at recording time.',
         'Synthetic customers and scenario evidence are visible in the footage.',
         '', 'Browser runtime errors during capture: ' + str(len(manifest['errors'])) + '.',
         'The local prototype was not uploaded or submitted.']
(out/'README.md').write_text('\n'.join(rows)+'\n', encoding='utf-8')
(out/'recording-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('EXPORT COMPLETE', flush=True)
