import { useState } from 'react'
import { Navbar } from './components/ui/Navbar'
import { Sections } from './components/ui/Sections'
import { WalletModal } from './components/ui/WalletModal'
import './scrollStore'

export default function App() {
  const [walletOpen, setWalletOpen] = useState(false)

  return (
    <>
      {/* Fixed, living background layer: drifting aurora + technical grid */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05060a]">
        <div className="absolute -left-[12%] -top-[12%] h-[60vw] w-[60vw] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(52,245,163,0.22),transparent_62%)] blur-3xl" />
        <div className="absolute -right-[16%] top-[6%] h-[52vw] w-[52vw] animate-aurora-slow rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.20),transparent_62%)] blur-3xl" />
        <div className="absolute -bottom-[22%] left-[18%] h-[48vw] w-[48vw] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16),transparent_62%)] blur-3xl" />
        {/* Fine grid, masked to fade toward the edges */}
        <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        {/* Vignette to keep text legible */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(5,6,10,0.86)_100%)]" />
      </div>

      {/* UI layers */}
      <Navbar onConnect={() => setWalletOpen(true)} />
      <Sections onConnect={() => setWalletOpen(true)} />
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  )
}
