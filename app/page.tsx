import VideoConverter from '@/app/components/VideoConverter';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Video Format Converter</h1>
        <p className="text-center mb-8">Convert between MP4 and WebM formats quickly and easily</p>
        
        <VideoConverter />
      </div>
    </main>
  );
}