# shadergradient (bundle siap pakai)

`shadergradient.bundle.js` berisi @shadergradient/react 2.4.20 (MIT, ruucm & stone-skipper) yang sudah dibundel bersama React 19.3.1, @react-three/fiber 9.8.2, three 0.185.1, three-stdlib 2.36.1 dan camera-controls 3.1.2. Satu file, tanpa React di halaman, jalan offline.

## Pakai

```html
<div id="bg" style="position:relative;width:100%;height:100vh"></div>
<script src="vendor/shadergradient/shadergradient.bundle.js"></script>
<script>
  const sg = ShaderGradient.mount(document.getElementById('bg'), {
    type: 'plane', animate: 'on', uSpeed: 0.4, uStrength: 4, uDensity: 1.3,
    color1: '#ff5005', color2: '#dbba95', color3: '#d0bce1',
    cDistance: 3.6, cPolarAngle: 90, cAzimuthAngle: 180, grain: 'on'
  }, { pixelDensity: 1.5, fov: 45 });
  // sg.update({ color1: '#00b4ff' });  sg.unmount();
</script>
```

- Argumen kedua = props `<ShaderGradient>`, argumen ketiga = props `<ShaderGradientCanvas>`.
- Elemen target harus punya ukuran dan `position` selain `static`, karena kanvas diisi `position:absolute; inset:0`.
- Preset bawaan ada di `ShaderGradient.presets` (contoh `ShaderGradient.presets.halo.props`).
- Default `lightType: '3d'` (tanpa file tambahan). `lightType: 'env'` memakai `hdr/city|dawn|lobby.hdr` di sebelah file ini. Di bundle satu file (`build-single.py`) folder `hdr/` tidak ikut, jadi pakai `'3d'`.
- Bundle ini membawa three.js sendiri, terpisah dari `vendor/three.min.js`.

## Build ulang

```bash
npm i --save-exact @shadergradient/react@2.4.20 @react-three/fiber@9.8.2 react@19.3.1 react-dom@19.3.1 three@0.185.1 three-stdlib@2.36.1 camera-controls@3.1.2 esbuild@0.28.2
npx esbuild src/entry.jsx --bundle --minify --format=iife --target=es2020 --jsx=automatic --define:process.env.NODE_ENV='"production"' --legal-comments=eof --outfile=shadergradient.bundle.js
```

Lisensi tiap paket tercantum di akhir `shadergradient.bundle.js`.
