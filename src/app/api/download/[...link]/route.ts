import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { link: string[] } }
) {
  try {
    // Reconstruct the URL from the catch-all segments.
    // The 'link' parameter is an array of path segments.
    // For a URL like /api/download/https:/example.com/foo, params.link would be ['https:', 'example.com', 'foo']
    // So we need to join them back. The first part (https:) loses its slashes.
    let directLink: string;
    if (params.link[0].startsWith('http')) {
        // If it looks like a URL, re-add the // after the protocol.
        directLink = params.link[0] + '//' + params.link.slice(1).join('/');
    } else {
        directLink = params.link.join('/');
    }
    
    // The search parameters from the original request need to be appended.
    const search = request.nextUrl.search;
    if (search) {
        directLink += search;
    }


    if (!directLink || !directLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'A valid, absolute URL is required.' },
        { status: 400 }
      );
    }
    
    // Fetch the file from the direct link
    const fileResponse = await fetch(directLink, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': request.headers.get('Referer') || new URL(directLink).origin
      }
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${fileResponse.statusText}` },
        { status: fileResponse.status }
      );
    }
    
    // Create a streaming response
    const { readable, writable } = new TransformStream();
    fileResponse.body?.pipeTo(writable);

    // Get the filename from the URL or content-disposition header
    const contentDisposition = fileResponse.headers.get('content-disposition');
    let filename = 'download';
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
        }
    } else {
        try {
            const url = new URL(directLink);
            const urlPath = url.pathname;
            // Check for filename in query params first
            const fileQueryParam = url.searchParams.get('file') || url.searchParams.get('filename')
            if(fileQueryParam){
                filename = fileQueryParam;
            } else {
                const lastSegment = urlPath.substring(urlPath.lastIndexOf('/') + 1);
                if (lastSegment) {
                    filename = lastSegment;
                }
            }
        } catch (e) {
            // ignore invalid url error
        }
    }

    const headers = new Headers();
    headers.set('Content-Type', fileResponse.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    if(fileResponse.headers.has('Content-Length')) {
        headers.set('Content-Length', fileResponse.headers.get('Content-Length')!);
    }
    
    return new NextResponse(readable, {
      status: 200,
      headers: headers,
    });

  } catch (err: any) {
    console.error('Download proxy error:', err);
    return NextResponse.json({ error: err.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
