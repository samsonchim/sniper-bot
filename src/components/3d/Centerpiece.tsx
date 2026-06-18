import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Icosahedron, Torus } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scrollStore'

const lerp = THREE.MathUtils.lerp
const damp = THREE.MathUtils.damp

/**
 * The morphing centerpiece. A distorted icosahedron wrapped in two orbiting
 * "scope" rings. Distortion, color and rotation are driven by scroll progress
 * across four narrative acts.
 */
export function Centerpiece({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const core = useRef<THREE.Mesh>(null!)
  const mat = useRef<any>(null!)
  const ringA = useRef<THREE.Mesh>(null!)
  const ringB = useRef<THREE.Mesh>(null!)

  // accent colors per act
  const cool = new THREE.Color('#34f5a3')
  const violet = new THREE.Color('#8b5cf6')
  const cyan = new THREE.Color('#22d3ee')
  const tmp = new THREE.Color()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const o = reduced ? 0 : scrollState.offset // 0 → 1

    // Continuous idle spin + scroll-accelerated rotation
    const spin = reduced ? 0 : t * 0.15 + o * Math.PI * 2.5
    group.current.rotation.y = damp(group.current.rotation.y, spin, 3, delta)
    group.current.rotation.x = damp(
      group.current.rotation.x,
      Math.sin(o * Math.PI) * 0.5,
      3,
      delta,
    )

    // Breathing scale that tightens then blooms across the scroll
    const targetScale = lerp(1, 1.25, Math.sin(o * Math.PI))
    const s = damp(group.current.scale.x, targetScale, 4, delta)
    group.current.scale.setScalar(s)

    // Distortion intensifies toward the middle acts, calms at the end
    if (mat.current) {
      mat.current.distort = damp(
        mat.current.distort,
        reduced ? 0.15 : 0.18 + Math.sin(o * Math.PI) * 0.42,
        3,
        delta,
      )
      mat.current.speed = lerp(1.2, 3.5, o)

      // Color shift: green → cyan → violet
      if (o < 0.5) tmp.copy(cool).lerp(cyan, o * 2)
      else tmp.copy(cyan).lerp(violet, (o - 0.5) * 2)
      mat.current.color.lerp(tmp, 0.06)
      mat.current.emissive.lerp(tmp, 0.06)
    }

    // Scope rings counter-rotate
    if (!reduced) {
      ringA.current.rotation.z = t * 0.4
      ringA.current.rotation.x = Math.PI / 2.4 + o * 0.6
      ringB.current.rotation.z = -t * 0.25
      ringB.current.rotation.y = t * 0.2 - o * 0.8
    }
  })

  return (
    <group ref={group}>
      <Icosahedron ref={core} args={[1.35, 12]}>
        <MeshDistortMaterial
          ref={mat}
          color="#34f5a3"
          emissive="#34f5a3"
          emissiveIntensity={0.35}
          roughness={0.15}
          metalness={0.85}
          distort={0.3}
          speed={1.5}
        />
      </Icosahedron>

      {/* Wireframe shell for depth */}
      <Icosahedron args={[1.55, 2]}>
        <meshBasicMaterial wireframe color="#34f5a3" transparent opacity={0.08} />
      </Icosahedron>

      {/* Scope rings */}
      <Torus ref={ringA} args={[2.3, 0.012, 16, 128]} rotation={[Math.PI / 2.4, 0, 0]}>
        <meshBasicMaterial color="#34f5a3" transparent opacity={0.5} />
      </Torus>
      <Torus ref={ringB} args={[2.75, 0.008, 16, 128]}>
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
      </Torus>
    </group>
  )
}
