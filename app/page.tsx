import FinancialDashboard from './components/FinancialDashboard'

export default function Home() {
  console.log('Home page rendering')
  return (
    <div className="min-h-screen bg-black text-white">
      <FinancialDashboard />
    </div>
  )
}