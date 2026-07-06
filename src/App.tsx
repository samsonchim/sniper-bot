import { useState } from 'react'
import { Navbar } from './components/ui/Navbar'
import { Sections } from './components/ui/Sections'
import { WalletModal } from './components/ui/WalletModal'
import './scrollStore'

export default function App() {
  const [walletOpen, setWalletOpen] = useState(false)

  return (
    <>
      {/* Fixed static background layer */}
      <div className="fixed inset-0 -z-10 bg-[#05060a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(60,80,140,0.25),transparent_60%)]" />
        {/* Vignette to keep text legible */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,6,10,0.75)_100%)]" />
      </div>

      {/* UI layers */}
      <Navbar onConnect={() => setWalletOpen(true)} />
      <Sections onConnect={() => setWalletOpen(true)} />
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  )
}
