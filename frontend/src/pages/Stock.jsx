import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex gap-3 items-center text-sm">
      <span>✅ {message}</span>
      <button onClick={onClose} className="bg-white/10 px-2.5 py-1 rounded-full">✕</button>
    </div>
  )
}

export default function Stock() {
  const [products, setProducts] = useState([])
  const [tab, setTab] = useState('batch')
  const [toast, setToast] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    unit: 'tablet',
    min_reorder_level: 10,
    category: 'drug',
    department: 'pharmacy'
  })
  const [batchForm, setBatchForm] = useState({
    product_id: '',
    batch_number: '',
    supplier: '',
    quantity_received: '',
    quantity_available: '',
    purchase_price: '',
    selling_price: '',
    expiry_date: '',
    date_received: new Date().toISOString().split('T')[0]
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadProducts = async () => {
    const res = await axios.get('http://localhost:5000/api/products');
    setProducts(res.data.data || res.data);
  }
  useEffect(() => { loadProducts() }, [])

  // Live profit preview - human touch
  const profitPreview = useMemo(() => {
    const buy = Number(batchForm.purchase_price) || 0
    const sell = Number(batchForm.selling_price) || 0
    const qty = Number(batchForm.quantity_available || batchForm.quantity_received) || 0
    return {
      perUnit: sell - buy,
      total: (sell - buy) * qty,
      margin: buy ? ((sell - buy) / buy * 100).toFixed(1) : 0
    }
  }, [batchForm])

  const handleProductSave = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/products', {
      ...productForm,
      min_reorder_level: Number(productForm.min_reorder_level)
    });
    showToast(`${productForm.name} saved as ${productForm.category}`);
    setProductForm({ name: '', brand: '', unit: 'tablet', min_reorder_level: 10, category: 'drug', department: 'pharmacy' });
    loadProducts();
    setTab('batch');
  }

  const handleBatchSave = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/stock/received', {
      ...batchForm,
      product_id: Number(batchForm.product_id),
      quantity_received: Number(batchForm.quantity_received),
      quantity_available: Number(batchForm.quantity_available || batchForm.quantity_received),
      purchase_price: Number(batchForm.purchase_price),
      selling_price: Number(batchForm.selling_price)
    });
    showToast('Batch saved - profit UGX ' + profitPreview.total.toLocaleString());
    setBatchForm({ product_id: '', batch_number: '', supplier: '', quantity_received: '', quantity_available: '', purchase_price: '', selling_price: '', expiry_date: '', date_received: new Date().toISOString().split('T')[0] })
  }

  return (
    <div className="space-y-6">
      <Toast message={toast} onClose={() => setToast('')} />

      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Stock Manager</h1>
        <p className="text-sm text-slate-500 mt-1">Add new items for pharmacy, lab, or store - all in one place</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button onClick={() => setTab('product')} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'product' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>+ New Item Type</button>
        <button onClick={() => setTab('batch')} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'batch' ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}`}>+ New Stock Batch</button>
      </div>

      {tab === 'product' ? (
        <form onSubmit={handleProductSave} className="bg-white p-7 rounded-[20px] border border-slate-100 shadow-sm max-w-2xl">
          <h2 className="font-semibold text-slate-800 mb-1">What are we tracking?</h2>
          <p className="text-xs text-slate-400 mb-5">You can track drugs, lab reagents, gloves etc - MedInvent handles all</p>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Category</label>
                <select className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm bg-white" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                  <option value="drug"> Drug / Medicine</option>
                  <option value="lab"> Lab Reagent / Chemical/test kit</option>
                  <option value="consumable"> Consumable (Gloves, Syringes)</option>
                  <option value="equipment">🔬 Equipment</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Department</label>
                <select className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm bg-white" value={productForm.department} onChange={e => setProductForm({ ...productForm, department: e.target.value })}>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="lab">Laboratory</option>
                  <option value="ward">Ward / Theatre</option>
                  <option value="store">Main Store</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Item Name *</label>
              <input required className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm" placeholder={productForm.category === 'lab' ? 'e.g. HIV Test Kit, Giemsa Stain' : 'e.g. Amoxicillin 500mg'} value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Brand / Supplier Brand</label>
                <input className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="e.g. Laborex" value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Unit</label>
                <select className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm bg-white" value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })}>
                  <option value="tablet">tablet</option><option value="capsule">capsule</option><option value="syrup">syrup</option><option value="vial">vial</option><option value="ampoule">ampoule</option>
                  <option value="bottle">bottle</option><option value="kit">kit</option><option value="box">box</option><option value="pack">pack</option><option value="piece">piece</option><option value="test">test</option><option value="liter">liter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Min Reorder Level</label>
              <input type="number" className="w-full mt-1.5 border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="e.g. 10" value={productForm.min_reorder_level} onChange={e => setProductForm({ ...productForm, min_reorder_level: e.target.value })} />
            </div>

            <button className="mt-2 bg-slate-900 text-white p-3 rounded-xl font-medium text-sm hover:bg-black">Save Item Type</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBatchSave} className="bg-white p-7 rounded-[20px] border border-slate-100 shadow-sm max-w-3xl">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">New Batch Intake</h2>
              <p className="text-xs text-slate-400 mt-1">FEFO + Price tracking for profit</p>
            </div>
            {profitPreview.total > 0 && (
              <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs">
                <div className="font-bold">Profit: UGX {profitPreview.total.toLocaleString()}</div>
                <div className="text-[11px]">{profitPreview.perUnit.toLocaleString()}/unit • {profitPreview.margin}% margin</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select required className="border border-slate-200 p-2.5 rounded-xl text-sm col-span-2 bg-white" value={batchForm.product_id} onChange={e => setBatchForm({ ...batchForm, product_id: e.target.value })}>
              <option value="">Select Item - {products.length} available</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.category === 'lab' ? '' : ''} {p.name} - {p.brand} ({p.unit})</option>)}
            </select>

            <input required className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Batch / Lot Number" value={batchForm.batch_number} onChange={e => setBatchForm({ ...batchForm, batch_number: e.target.value })} />
            <input className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Supplier e.g. Joint Medical Stores" value={batchForm.supplier} onChange={e => setBatchForm({ ...batchForm, supplier: e.target.value })} />

            <input required type="number" className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Qty Received" value={batchForm.quantity_received} onChange={e => setBatchForm({ ...batchForm, quantity_received: e.target.value })} />
            <input type="number" className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Qty Available (defaults to received)" value={batchForm.quantity_available} onChange={e => setBatchForm({ ...batchForm, quantity_available: e.target.value })} />

            <input required type="number" step="0.01" className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Buying Price (UGX)" value={batchForm.purchase_price} onChange={e => setBatchForm({ ...batchForm, purchase_price: e.target.value })} />
            <input required type="number" step="0.01" className="border border-slate-200 p-2.5 rounded-xl text-sm" placeholder="Selling Price (UGX)" value={batchForm.selling_price} onChange={e => setBatchForm({ ...batchForm, selling_price: e.target.value })} />

            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Expiry Date *</label>
              <input required type="date" className="border border-slate-200 p-2.5 rounded-xl text-sm w-full mt-1" value={batchForm.expiry_date} onChange={e => setBatchForm({ ...batchForm, expiry_date: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Date Received</label>
              <input type="date" className="border border-slate-200 p-2.5 rounded-xl text-sm w-full mt-1" value={batchForm.date_received} onChange={e => setBatchForm({ ...batchForm, date_received: e.target.value })} />
            </div>

            <button className="col-span-2 bg-slate-900 text-white p-3 rounded-xl font-medium text-sm hover:bg-black mt-2">Save Batch + Update Stock Value</button>
          </div>
        </form>
      )}
    </div>
  )
}