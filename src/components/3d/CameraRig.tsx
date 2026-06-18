import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scrollStore'

const damp = THREE.MathUtils.damp

/**
 * Scroll-linked camera. Dollies in/out and orbits slightly around the
 * centerpiece while reacting subtly to the pointer for a parallax feel.
 */
export function CameraRig({ reduced }: { reduced: boolean }) {
  useFrame((state, delta) => {
    const o = reduced ? 0 : scrollState.offset

    // A gentle path: pull back, swing around, then settle close.
    const angle = o * Math.PI * 1.2
    const radius = THREE.MathUtils.lerp(6, 9, Math.sin(o * Math.PI))
    const targetX = Math.sin(angle) * radius * 0.4 + state.pointer.x * 0.6
    const targetZ = Math.cos(angle) * radius
    const targetY = THREE.MathUtils.lerp(0.5, -1.2, o) + state.pointer.y * 0.4

    state.camera.position.x = damp(state.camera.position.x, targetX, 3, delta)
    state.camera.position.y = damp(state.camera.position.y, targetY, 3, delta)
    state.camera.position.z = damp(state.camera.position.z, targetZ, 3, delta)
    state.camera.lookAt(0, 0, 0)
  })

  return null
}
