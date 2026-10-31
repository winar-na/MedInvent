import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import Expiry from './pages/Expiry'

export default function App(){
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/expiry" element={<Expiry />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}