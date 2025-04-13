import VideoConverter from '@/app/components/VideoConverter'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import Banner from '@/app/components/Banner'
import Footer from '@/app/components/Footer'


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        < Banner/>
        < VideoConverter/>
        < Analytics/>
        < SpeedInsights/>
        < Footer/>
      </div>
    </main>
  );
}