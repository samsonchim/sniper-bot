import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scrollStore'

/** Instanced starfield / "mempool dust" that parallaxes with scroll. */
export function Particles({ count = 700, reduced }: { count?: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const data = useMemo(() => {
    const arr: { pos: THREE.Vector3; speed: number; scale: number }[] = []
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 22 - 4,
        ),
        speed: 0.05 + Math.random() * 0.25,
        scale: 0.01 + Math.random() * 0.035,
      })
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const o = reduced ? 0 : scrollState.offset
    for (let i = 0; i < count; i++) {
      const d = data[i]
      const drift = reduced ? 0 : Math.sin(t * d.speed + i) * 0.3
      dummy.position.set(
        d.pos.x + drift,
        d.pos.y + Math.cos(t * d.speed + i) * 0.3 - o * 6 * d.speed,
        d.pos.z,
      )
      dummy.scale.setScalar(d.scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (!reduced) mesh.current.rotation.y = t * 0.01
    void delta
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#7dffc4" transparent opacity={0.5} />
    </instancedMesh>
  )
}
