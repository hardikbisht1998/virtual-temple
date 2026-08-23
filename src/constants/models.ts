/* The murti model catalogue.

   A deity can have several forms — a stone Ganesha and a painted one, Shiva
   standing or as Nataraja — so the devotee picks the murti they feel devotion
   toward. Each entry is one .glb; `deity` ties it to an IDOLS id.

   Adding a form: compress the .glb first
     npx gltf-transform optimize in.glb out.glb --compress draco \
       --texture-compress webp --texture-size 2048
   (then check its hash differs from the others), drop it in src/assets,
   import it with ?url, and add one entry below. */

import ganeshaStoneUrl from '../assets/lord_ganesha_3d_model__hindu_god_statue.glb?url';
import ganeshaPaintedUrl from '../assets/ganesh_ji_new.glb?url';
import shivaStandingUrl from '../assets/shiva_-_hindu_god.glb?url';
import shivaMahadevUrl from '../assets/mahadev_bhole_bhale.glb?url';
import shivaNatarajaUrl from '../assets/natraj.glb?url';
import lakshmiUrl from '../assets/maa_lakshmi_standing.glb?url';
import durgaUrl from '../assets/maa_durga_01.glb?url';
import saraswatiUrl from '../assets/maa_saraswati_02.glb?url';
import krishnaBaalUrl from '../assets/baal_krishna_001.glb?url';
import krishnaRadhaUrl from '../assets/radha_krishan.glb?url';
import ramLalaUrl from '../assets/ram-lala.glb?url';
import kaliUrl from '../assets/maa_kali.glb?url';
import jagannathUrl from '../assets/bhagwaan_jaganath_ji_maharaj_01.glb?url';

export interface MurtiModel {
  id: string;      // stable key stored on PlacedIdol.modelId
  deity: string;   // IDOLS id this form belongs to
  label: string;   // shown in the form picker
  url: string;
  /* Some source models are authored facing sideways; this Y-rotation
     (radians) turns them to face the devotee. */
  orientY?: number;
}

export const MURTI_MODELS: MurtiModel[] = [
  { id: 'ganesha-stone',    deity: 'ganesha',   label: 'Stone',         url: ganeshaStoneUrl },
  { id: 'ganesha-painted',  deity: 'ganesha',   label: 'Painted',       url: ganeshaPaintedUrl },

  { id: 'shiva-standing',   deity: 'shiva',     label: 'Standing',      url: shivaStandingUrl, orientY: -Math.PI / 2 },
  { id: 'shiva-mahadev',    deity: 'shiva',     label: 'Mahadev',       url: shivaMahadevUrl },
  { id: 'shiva-nataraja',   deity: 'shiva',     label: 'Nataraja',      url: shivaNatarajaUrl },

  { id: 'lakshmi-lotus',    deity: 'lakshmi',   label: 'On Lotus',      url: lakshmiUrl },
  { id: 'durga-lion',       deity: 'durga',     label: 'On Lion',       url: durgaUrl },
  { id: 'saraswati-veena',  deity: 'saraswati', label: 'With Veena',    url: saraswatiUrl },

  { id: 'krishna-baal',     deity: 'krishna',   label: 'Baal Krishna',  url: krishnaBaalUrl },
  { id: 'krishna-radha',    deity: 'krishna',   label: 'Radha Krishna', url: krishnaRadhaUrl },

  { id: 'ram-lala',         deity: 'ram',       label: 'Ram Lala',      url: ramLalaUrl },
  { id: 'kali-maa',         deity: 'kali',      label: 'Maa Kali',      url: kaliUrl },
  { id: 'jagannath-ji',     deity: 'jagannath', label: 'Jagannath',     url: jagannathUrl },
];

const BY_ID = new Map(MURTI_MODELS.map(m => [m.id, m]));

export function modelById(id: string | undefined): MurtiModel | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function modelsFor(deityId: string): MurtiModel[] {
  return MURTI_MODELS.filter(m => m.deity === deityId);
}

/* The form a deity gets when first invited — its first listed model. */
export function defaultModelId(deityId: string): string | undefined {
  return MURTI_MODELS.find(m => m.deity === deityId)?.id;
}

/* Resolve the model a placed murti should render: its chosen form, or the
   deity's default when it was placed before forms existed. */
export function resolveModel(deityId: string, modelId?: string): MurtiModel | undefined {
  const chosen = modelById(modelId);
  if (chosen && chosen.deity === deityId) return chosen;
  return modelById(defaultModelId(deityId));
}

export function hasModel(deityId: string): boolean {
  return MURTI_MODELS.some(m => m.deity === deityId);
}
