<?php
// Generates responsive WebP variants (480/800/1200 px wide) for the large images in assets/images/wp and rewrites includes/data/images.php.
// Usage: php tools/make-variants.php   (run from the project root)
$root=dirname(__DIR__); $dir="$root/assets/images/wp"; $man=[];
foreach(glob("$dir/*.webp") as $f){
  $key=basename($f,'.webp'); if(preg_match('/-(480|800|1200)$/',$key)) continue;
  [$w,$h]=getimagesize($f); $vars=[];
  foreach([480,800,1200] as $vw){
    if($w<=$vw*1.15) continue;
    $out="$dir/$key-$vw.webp"; $vh=(int)round($h*$vw/$w);
    if(!is_file($out)){
      $im=imagecreatefromwebp($f); imagepalettetotruecolor($im);
      $n=imagecreatetruecolor($vw,$vh); imagealphablending($n,false); imagesavealpha($n,true);
      imagefill($n,0,0,imagecolorallocatealpha($n,0,0,0,127));
      imagecopyresampled($n,$im,0,0,0,0,$vw,$vh,$w,$h); imagewebp($n,$out,78);
    }
    $vars[]=$vw;
  }
  $man[$key]=[$w,$h,$vars];
}
ksort($man);
file_put_contents("$root/includes/data/images.php","<?php\n// key => [width, height, [variant widths]]; files: assets/images/wp/<key>.webp and <key>-<w>.webp (converted from the production media library)\nreturn ".var_export($man,true).";\n");
echo count($man)," images processed\n";
