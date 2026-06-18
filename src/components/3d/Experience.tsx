import { Environment, Float, Sparkles } from '@react-three/drei'
import { Centerpiece } from './Centerpiece'
import { Particles } from './Particles'
import { CameraRig } from './CameraRig'

/** Root of the 3D scene. Lives inside <ScrollControls>. */
export function Experience({ reduced }: { reduced: boolean }) {
  return (
    <>
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 8, 22]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 6, 4]} intensity={1.1} color="#bfffe2" />
      <pointLight position={[-6, -2, -4]} intensity={40} color="#8b5cf6" />
      <pointLight position={[6, 3, 6]} intensity={25} color="#22d3ee" />

      <CameraRig reduced={reduced} />

      <Float
        speed={reduced ? 0 : 1.4}
        rotationIntensity={reduced ? 0 : 0.4}
        floatIntensity={reduced ? 0 : 0.6}
      >
        <Centerpiece reduced={reduced} />
      </Float>

      <Particles reduced={reduced} />
      <Sparkles count={60} scale={12} size={2} speed={reduced ? 0 : 0.3} color="#34f5a3" />

      <Environment preset="night" />
    </>
  )
}
