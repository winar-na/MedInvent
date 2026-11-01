import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Expiry() {
  const [stock, setStock] = useState([])
  const [blood, setBlood] = useState([])
  const [tab, setTab] = useState('stock')
  const [filter, setFilter] = useState('ALL')
  const [form, setForm] = useState({ component:'Whole Blood', blood_group:'O+', unit_number:'', collected_date:'', expiry_date:'' })

  const fetchData = () => {
    axios.get(`${API_URL}/expiry/alerts`)
      .then(res => {
        setStock(res.data.stock || res.data.data || [])
        setBlood(res.data.blood || [])
      })
  }
  useEffect(() => { fetchData() }, [])

  const getCardStyle = (days, health) => {
    if (health === 'EXPIRED' || days < 0) return { bg: 'bg-red-200', badge: 'bg-red-600 text-white' };
    if (health === 'CRITICAL' || days <= 2) return { bg: 'bg-red-500 text-white', badge: 'bg-white text-red-700 border' };
    if (days <= 10) return { bg: 'bg-orange-200', badge: 'bg-orange-600 text-white' };
    return { bg: 'bg-green-50', badge: 'bg-green-600 text-white' };
  };

  const filterData = (data) => {
    if (filter === 'ALL') return data;
    if (filter === 'EXPIRED') return data.filter(d => d.health_status==='EXPIRED' || d.days_remaining < 0);
    if (filter === 'CRITICAL') return data.filter(d => d.days_remaining >=0 && d.days_remaining <=2);
    if (filter === 'URGENT') return data.filter(d => d.days_remaining >2 && d.days_remaining <=10);
    return data;
  };

  const addBlood = async (e) => {
    e.preventDefault();
    if(!/^[0-9]{9}$/.test(form.unit_number)) return alert('9 digits required');
    await axios.post(`${API_URL}/blood`, form);
    setForm({ component:'Whole Blood', blood_group:'O+', unit_number:'', collected_date:'', expiry_date:'' })
    fetchData();
  }

  const currentList = tab==='stock' ? stock : blood;
  const expiredCount = currentList.filter(d => d.health_status==='EXPIRED' || d.days_remaining < 0).length;
  const criticalCount = currentList.filter(d => d.days_remaining >=0 && d.days_remaining <=2).length;
  const urgentCount = currentList.filter(d => d.days_remaining >2 && d.days_remaining <=10).length;

  const displayData = filterData(currentList);

  return (
    <div className="bg-gray-50 min-h-screen w-full">
      <h1 className="text-xl md:text-2xl font-bold mb-3 text-red-600">Expiry Alerts - &lt;10 Days</h1>
      
      {/* FILTERS - wrap on mobile */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={()=>setFilter('ALL')} className={`px-3 py-1.5 rounded text-xs border ${filter==='ALL'?'bg-gray-800 text-white':'bg-white'}`}>All ({currentList.length})</button>
        <button onClick={()=>setFilter('EXPIRED')} className={`px-3 py-1.5 rounded text-xs border ${filter==='EXPIRED'?'bg-red-600 text-white':'bg-red-200'}`}>Red Expired ({expiredCount})</button>
        <button onClick={()=>setFilter('CRITICAL')} className={`px-3 py-1.5 rounded text-xs border ${filter==='CRITICAL'?'bg-red-600 text-white':'bg-red-500 text-white'}`}>Dark Red ≤2d ({criticalCount})</button>
        <button onClick={()=>setFilter('URGENT')} className={`px-3 py-1.5 rounded text-xs border ${filter==='URGENT'?'bg-orange-600 text-white':'bg-orange-200'}`}>Orange &lt;10d ({urgentCount})</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={()=>{setTab('stock'); setFilter('ALL')}} className={`px-4 py-2 rounded font-bold text-sm ${tab==='stock'?'bg-blue-600 text-white':'bg-white shadow border'}`}>Stock ({stock.length})</button>
        <button onClick={()=>{setTab('blood'); setFilter('ALL')}} className={`px-4 py-2 rounded font-bold text-sm ${tab==='blood'?'bg-red-600 text-white':'bg-white shadow border'}`}>Blood ({blood.length})</button>
      </div>

      {tab==='blood' && (
        <form onSubmit={addBlood} className="bg-white p-3 md:p-4 rounded-xl shadow mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <select value={form.component} onChange={e=>setForm({...form, component:e.target.value})} className="border p-2.5 rounded text-sm w-full"><option>Whole Blood</option><option>RBC</option><option>Plasma</option><option>Platelets</option><option>Cryo</option></select>
          <select value={form.blood_group} onChange={e=>setForm({...form, blood_group:e.target.value})} className="border p-2.5 rounded text-sm w-full"><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select>
          <input placeholder="9 digit unit" value={form.unit_number} onChange={e=>setForm({...form, unit_number:e.target.value.replace(/\D/g,'').slice(0,9)})} className="border p-2.5 rounded text-sm w-full" required />
          <input type="date" value={form.collected_date} onChange={e=>setForm({...form, collected_date:e.target.value})} className="border p-2.5 rounded text-sm w-full" required />
          <input type="date" value={form.expiry_date} onChange={e=>setForm({...form, expiry_date:e.target.value})} className="border p-2.5 rounded text-sm w-full" required />
          <button className="bg-red-600 text-white rounded py-2.5 text-sm font-bold">Add Blood</button>
        </form>
      )}

      <div className="grid gap-3">
        {displayData.length===0 && <div className="bg-white p-6 rounded-xl shadow text-center text-sm">No data for {filter} in {tab}</div>}
        {displayData.map(b=> {
          const s = getCardStyle(b.days_remaining, b.health_status);
          return (
            <div key={b.batch_id || b.id} className={`p-3 md:p-4 rounded-xl shadow border-l-8 border-red-600 ${s.bg} w-full min-w-0`}>
              {/* Mobile: stack vertical, Desktop: row */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm md:text-base truncate">
                    {b.product_name || `${b.component} ${b.blood_group}`} 
                    <span className="font-normal text-xs md:text-sm"> - {b.batch_number || `Unit ${b.unit_number}`} - Qty {b.quantity_available || b.quantity}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${s.badge}`}>{b.health_status} ({b.days_remaining}d)</span>
                  </div>
                </div>
                <div className="text-xs md:text-sm font-bold shrink-0">
                  Expires: {new Date(b.expiry_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
