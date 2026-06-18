import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { Experience } from './components/3d/Experience'
import { Navbar } from './components/ui/Navbar'
import { Sections } from './components/ui/Sections'
import { WalletModal } from './components/ui/WalletModal'
import { useReducedMotion } from './hooks/useReducedMotion'
import './scrollStore'

export default function App() {
  const reduced = useReducedMotion()
  const [walletOpen, setWalletOpen] = useState(false)

  return (
    <>
      {/* Fixed 3D background layer */}
      <div className="fixed inset-0 -z-10">
        <Canvas
          camera={{ position: [0, 0.5, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <Experience reduced={reduced} />
          </Suspense>
        </Canvas>
        {/* Vignette to keep text legible over the scene */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,6,10,0.75)_100%)]" />
      </div>

      {/* UI layers */}
      <Navbar onConnect={() => setWalletOpen(true)} />
      <Sections onConnect={() => setWalletOpen(true)} />
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />

      <Loader />
    </>
  )
}
