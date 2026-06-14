import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Results() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Results
          </h1>
          <p className="text-gray-600">Your interview performance summary</p>
        </div>

        <Card className="p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Overall Score</h2>
          <div className="text-5xl font-bold text-indigo-600 mb-4">85%</div>
          <p className="text-gray-600">Great performance! You scored well.</p>
        </Card>

        <Card className="p-8 shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Detailed Feedback</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 font-bold mr-3">✓</span>
              <span>Strong technical knowledge demonstrated</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 font-bold mr-3">✓</span>
              <span>Good communication skills</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 font-bold mr-3">!</span>
              <span>Consider improving problem-solving approach</span>
            </li>
          </ul>
        </Card>

        <div className="flex gap-4">
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full py-6 text-lg">
              Start Over
            </Button>
          </Link>
          <Button className="flex-1 py-6 text-lg">Download Report</Button>
        </div>
      </div>
    </div>
  );
}
