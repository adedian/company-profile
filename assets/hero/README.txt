SOLAR PV TOUR - VIDEO FOOTAGE (optional)
========================================

The home page opens with a cinematic "Solar PV Tour". Out of the box it is a photo tour made of real HME project
photographs (slow camera moves + cross-fades). You can upgrade it to real video without touching any code:

1. Put your files in THIS folder (assets/hero/) using exactly these names:

     solar-pv-tour.mp4          desktop, 16:9, H.264, 1080p, 12-20 s seamless loop, NO audio track, under ~6 MB
     solar-pv-tour-mobile.mp4   optional, portrait or square crop, 720p, under ~3 MB
     solar-pv-tour.webm         optional, VP9 version of the desktop file (smaller; used by browsers that support it)

2. Reload the page. The video loads AFTER the page has painted, fades in over the photo tour, and the photo tour
   (first photo = poster) stays as the fallback when:
     - the file is missing or fails to load,
     - the browser blocks autoplay,
     - the visitor uses "Reduce motion" or Data Saver, or is on a 2G/3G connection.

3. To rename files or change paths, edit includes/data/hero-tour.php  ->  'video'.
   To change the photos / captions / camera moves, edit the same file  ->  'scenes'.

Compress example (ffmpeg, if you install it):
   ffmpeg -i source.mp4 -an -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 26 -preset slow -movflags +faststart solar-pv-tour.mp4
   ffmpeg -i source.mp4 -an -vf "scale=-2:720,crop=720:720" -c:v libx264 -crf 28 -preset slow -movflags +faststart solar-pv-tour-mobile.mp4

FOOTAGE SOURCES (in order of preference)
   1. Your own drone / site footage of HME projects.
   2. Video you have the right to use for the project.
   3. Licensed stock (e.g. Pexels, Pixabay): download it, check the licence, and host the file here.
      Do NOT hotlink third-party URLs, and do NOT present stock footage as an HME project.
