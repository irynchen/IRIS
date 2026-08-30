import WeightChart from '../components/health/WeightChart'
import BPChart from '../components/health/BPChart'
import KneeChart from '../components/health/KneeChart'
import MoodChart from '../components/health/MoodChart'
import Card from '../components/ui/Card'

export default function HealthAppCharts() {
  return (
    <div className="p-5 max-w-2xl mx-auto space-y-5">
      <Card>
        <h2 className="text-lg font-semibold mb-3">⚖️ Gewicht</h2>
        <WeightChart />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-3">💊 Blutdruck</h2>
        <BPChart />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-3">🦵 Knie & Schritte</h2>
        <KneeChart />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-3">✨ Stimmung & Schlaf</h2>
        <MoodChart />
      </Card>
    </div>
  )
}
