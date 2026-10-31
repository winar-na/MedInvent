import { NavLink } from 'react-router-dom'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#0f172a] text-white flex flex-col fixed h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-slate-900 text-[13px]">ME</div>
          <div>
            <h1 className="font-bold text-lg leading-none">MedInvent</h1>
            <p className="text-[11px] text-white/50">Hospital Stock system</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2">
          <NavLink to="/" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Dashboard</NavLink>
          <NavLink to="/stock" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Stock Manager</NavLink>
          <NavLink to="/expiry" className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isActive?'bg-white text-black font-semibold':'text-white/60 hover:bg-white/10'}`}> Expiry Radar</NavLink>
          <div className="pt-6 mt-6 border-t border-white/10">
            <p className="text-[11px] text-white/30 px-4 mb-2">INVENTORY TYPES</p>
            <div className="px-4 py-2 text-xs text-white/40"> Drugs • Lab •  Consumables</div>
          </div>
        </nav>

        <div className="p-4 text-[11px] text-white/30">© 2026 MedInvent v1.0.0</div>
      </aside>

      {/* Main */}
      <main className="ml-[260px] flex-1 flex justify-center">
        <div className="w-full max-w-[1100px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}