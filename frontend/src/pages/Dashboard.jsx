import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Dashboard(){
  const [batches, setBatches] = useState([])
  const [expiry, setExpiry] = useState({ stock: [], blood: [], total: 0 })

  useEffect(()=>{
    axios.get(`${API_URL}/stock/current`)
      .then(r=> setBatches(r.data.data || []))

    axios.get(`${API_URL}/expiry/alerts`)
      .then(r=> setExpiry({ stock: r.data.stock || [], blood: r.data.blood || [], total: r.data.total || 0 }))
      .catch(()=>{})
  },[])

  const finance = useMemo(()=>{
    let stockValue = 0, potentialProfit = 0, capitalTied = 0
    batches.forEach(b=>{
      stockValue += Number(b.quantity_available) * Number(b.selling_price)
      capitalTied += Number(b.quantity_available) * Number(b.purchase_price)
      potentialProfit += Number(b.quantity_available) * (Number(b.selling_price) - Number(b.purchase_price))
    })
    return { stockValue, capitalTied, potentialProfit }
  },[batches])

  const getCardStyle = (days) => {
    if (days < 0) return 'bg-[#ffcccc] border-l-4 border-red-600';
    if (days <= 2) return 'bg-[#ff4444] text-white border-l-4 border-red-800';
    if (days <= 10) return 'bg-[#ffcc66] border-l-4 border-amber-600';
    return 'bg-white';
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full min-w-0">
      <div className="px-1">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Let your stock day begin</h1>
        <p className="text-xs md:text-sm text-slate-500">What's happening in inventory today</p>
      </div>

      {/* FIXED: 1 col on phone, 3 cols on desktop + prevent overflow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 min-w-0 overflow-hidden">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">Stock Value</p>
          <p className="text-lg md:text-2xl font-bold mt-2 break-words leading-tight">UGX {finance.stockValue.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">If all sold today</p>
        </div>
        <div className="bg-slate-900 text-white p-4 md:p-5 rounded-2xl min-w-0 overflow-hidden">
          <p className="text-[11px] text-white/50 uppercase tracking-widest">Potential Profit</p>
          <p className="text-lg md:text-2xl font-bold mt-2 text-emerald-300 break-words leading-tight">UGX {finance.potentialProfit.toLocaleString()}</p>
          <p className="text-[11px] text-white/50 mt-1">Margin: {finance.capitalTied ? ((finance.potentialProfit/finance.capitalTied)*100).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 min-w-0 overflow-hidden sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">Capital Tied</p>
          <p className="text-lg md:text-2xl font-bold mt-2 break-words leading-tight">UGX {finance.capitalTied.toLocaleString()}</p>
          <p className="text-[11px] text-amber-600 mt-1">{batches.length} active batches</p>
        </div>
      </div>

      {expiry.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-3 md:p-5 w-full min-w-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
            <h3 className="font-bold text-sm md:text-base"> Expiry Radar - &lt;10 Days ({expiry.total})</h3>
            <div className="flex gap-1.5 flex-wrap text-[10px]">
              <span className="bg-[#ffcccc] px-2 py-1 rounded">Red=Expired</span>
              <span className="bg-[#ff4444] text-white px-2 py-1 rounded">Critical ≤2d</span>
              <span className="bg-[#ffcc66] px-2 py-1 rounded">Orange &lt;10d</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 mb-2">Drugs / Lab ({expiry.stock.length})</p>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {expiry.stock.map((s,i)=>(
                  <div key={i} className={`p-2.5 text-xs rounded flex flex-col sm:flex-row sm:justify-between gap-1 min-w-0 ${getCardStyle(s.days_remaining)}`}>
                    <span className="font-medium truncate">{s.product_name} - {s.batch_number}</span>
                    <span className="font-bold shrink-0">{s.health_status} {s.days_remaining}d</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 mb-2"> Blood Bank ({expiry.blood.length})</p>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {expiry.blood.map((b,i)=>(
                  <div key={i} className={`p-2.5 text-xs rounded flex flex-col sm:flex-row sm:justify-between gap-1 min-w-0 ${getCardStyle(b.days_remaining)}`}>
                    <span className="font-medium truncate">{b.component} {b.blood_group} - {b.unit_number}</span>
                    <span className="font-bold shrink-0">{b.health_status} {b.days_remaining}d</span>
                  </div>
                ))}
                {expiry.blood.length===0 && <p className="text-xs text-slate-400">No blood expiring &lt;10d </p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden w-full">
        <div className="p-4 md:p-5 border-b flex justify-between items-center">
          <h3 className="font-semibold text-sm md:text-base">Live Stock</h3>
          <span className="text-xs bg-slate-100 px-3 py-1 rounded-full">{batches.length} items</span>
        </div>
        {/* FIXED: horizontal scroll on phone */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-400 text-xs"><tr><th className="p-3 text-left">Item</th><th className="p-3">Batch</th><th className="p-3">Avail</th><th className="p-3">Buy</th><th className="p-3">Sell</th><th className="p-3">Profit/U</th><th className="p-3">Expiry</th></tr></thead>
            <tbody>
              {batches.map(b=>(
                <tr key={b.batch_id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{b.product_name}</td>
                  <td className="p-3 text-slate-500">{b.batch_number}</td>
                  <td className="p-3 font-bold">{b.quantity_available}</td>
                  <td className="p-3">{Number(b.purchase_price).toLocaleString()}</td>
                  <td className="p-3">{Number(b.selling_price).toLocaleString()}</td>
                  <td className="p-3 text-emerald-600 font-semibold">{(Number(b.selling_price)-Number(b.purchase_price)).toLocaleString()}</td>
                  <td className="p-3 text-xs">{new Date(b.expiry_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
