import './globals.css'

export const metadata = {
  title: '/vr/ - Video Retarder',
  description: 'Convert MP4 ⇄ WebM under 4MB',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/yotsuba.css" />
        <meta name="theme-color" content="#FFFFEE" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
