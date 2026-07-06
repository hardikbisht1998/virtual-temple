import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { loadLayout, FLOOR_RADII } from '../layout3d';
import { MandirScene } from './MandirScene';
import type { PlacedIdol } from '../types';

/* Fixed front view of the user's 3D mandir, embedded in the Temple tab.
   No orbiting or dragging — tapping a murti offers it a garland. */
export default function MandirViewport({ placedIdols, onGarland }: {
  placedIdols: PlacedIdol[];
  onGarland: (instanceId: string) => void;
}) {
  // Fresh read per mount: the layout only changes on the 3D Mandir page,
  // and switching tabs remounts this component.
  const [layout] = useState(loadLayout);
  const radius = FLOOR_RADII[layout.floor.size];

  return (
    <Canvas
      camera={{ position: [0, 4.2, radius * 1.45], fov: 42 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.8, 0)}
    >
      <MandirScene
        layout={layout}
        placedIdols={placedIdols}
        onItemDown={(id, e) => {
          e.stopPropagation();
          if (!id.startsWith('decor:')) onGarland(id);
        }}
      />
    </Canvas>
  );
}
