import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      {/* Sidebar */}
      <aside className={`
        w-[260px] bg-[#0f172a] text-white flex flex-col fixed h-screen z-40
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-slate-900 text-[13px]">ME</div>
            <div>
              <h1 className="font-bold text-lg leading-none">MedInvent</h1>
              <p className="text-[11px] text-white/50">Hospital Stock system</p>
            </div>
          </div>
          {/* Close X on mobile - no library */}
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 text-xl">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2">
          <NavLink onClick={() => setOpen(false)} to="/" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Dashboard</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/stock" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Stock Manager</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/expiry" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Expiry Radar</NavLink>
        </nav>

        <div className="p-4 text-[11px] text-white/30">© 2026 MedInvent v1.0.0</div>
      </aside>

      {/* Dark overlay */}
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-30 md:hidden"></div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-[260px] w-full min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-20">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-xl">
            ☰
          </button>
          <span className="font-bold">MedInvent</span>
        </div>

        <div className="w-full max-w-[1100px] mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
