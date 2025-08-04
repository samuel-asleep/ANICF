import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Code, Download, FileSearch, Film, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const exampleAnimeId = 'bfa8d26d-3bc8-7634-4a6c-441f7362a4cf';
  const exampleEpisodeId = 'bfa8d26d-3bc8-7634-4a6c-441f7362a4cf/7d3e344b0afab7fdbcc54a6680a6d5e489af45482337eb17cb2fa15f1d48165d';
  const exampleDownloadUrl = 'https://kwik.cx/f/T83vHGeEaPjG';
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <main className="container mx-auto max-w-5xl px-4 py-8 sm:py-12 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl flex items-center justify-center gap-4">
            <Film className="w-10 h-10 text-primary" />
            <span>AnimePahe API</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            A powerful and unofficial API to fetch anime information, sources, and more from AnimePahe. Use the endpoints below to get started.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <FileSearch className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Search Anime</CardTitle>
              <CardDescription>
                Search for anime by title.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock text="/api/animepahe/search/{query}" />
              <ExampleLink href="/api/animepahe/search/overlord" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Info className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Get Anime Info</CardTitle>
              <CardDescription>
                Retrieve detailed information for a specific anime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock text="/api/animepahe/info/{animeId}" />
              <ExampleLink href={`/api/animepahe/info/${exampleAnimeId}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Download className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Get Episode Sources</CardTitle>
              <CardDescription>
                Fetch video sources for a specific episode.
              </-card_description>
            </CardHeader>
            <CardContent>
              <CodeBlock text="/api/animepahe/sources/{episodeId}" />
              <ExampleLink href={`/api/animepahe/sources/${exampleEpisodeId}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <Download className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Download File Proxy</CardTitle>
                <CardDescription>
                    Download any file via the server to mask your IP.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CodeBlock text="/api/download/{file_url}" />
                <ExampleLink href={`/api/download/${encodeURIComponent(exampleDownloadUrl)}`} />
            </CardContent>
          </Card>
        </div>
        
        <footer className="text-center mt-16 text-muted-foreground">
          <p>This is an unofficial API. Not affiliated with AnimePahe.</p>
        </footer>
      </main>
    </div>
  );
}

const CodeBlock = ({ text }: { text: string }) => (
    <div className="font-mono bg-muted p-3 rounded-md text-sm break-words mb-3">
        <code className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary/80"/>
            {text}
        </code>
    </div>
)

const ExampleLink = ({ href }: { href: string }) => (
    <div className="text-sm">
        <b>Example:</b>{' '}
        <a href={href} className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">
            {href}
        </a>
    </div>
)
