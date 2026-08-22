import shivaModelUrl from '../assets/shiva_-_hindu_god.glb?url';
import ganeshaModelUrl from '../assets/lord_ganesha_3d_model__hindu_god_statue.glb?url';

export const DEITY_MODELS: Record<string, string> = {
  shiva: shivaModelUrl,
  ganesha: ganeshaModelUrl,
};

/* Some source models are authored facing sideways. Y-rotation (radians)
   applied to the loaded model so every murti faces the devotee. */
export const DEITY_MODEL_ORIENT: Record<string, number> = {
  shiva: -Math.PI / 2,
};
