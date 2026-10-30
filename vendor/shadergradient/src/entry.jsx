/* Vanilla wrapper around @shadergradient/react: no React needed on the page.
   const sg = ShaderGradient.mount(el, { color1: '#ff5005', ... }, { pixelDensity: 1.5 });
   sg.update({ color1: '#00ff88' }); sg.unmount(); */
import { createRoot } from 'react-dom/client';
import { ShaderGradientCanvas, ShaderGradient, presets } from '@shadergradient/react';

const here = (document.currentScript && document.currentScript.src) || location.href;
const HDR = new URL('hdr/', here).href;   /* hdr/ next to this file, so env lighting works offline */

function mount(el, gradient = {}, canvas = {}) {
  if (!el) throw new Error('ShaderGradient.mount: element not found');
  const root = createRoot(el);
  let g = { control: 'props', lightType: '3d', ...gradient }, c = { envBasePath: HDR, pixelDensity: 1, fov: 45, ...canvas };
  const render = () => root.render(
    <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} {...c}>
      <ShaderGradient {...g} />
    </ShaderGradientCanvas>
  );
  render();
  return {
    update(next = {}, nextCanvas) { g = { ...g, ...next }; if (nextCanvas) c = { ...c, ...nextCanvas }; render(); },
    unmount() { root.unmount(); }
  };
}

window.ShaderGradient = { mount, presets, version: '2.4.20' };
