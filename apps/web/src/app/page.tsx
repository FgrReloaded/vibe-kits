"use client";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-4 text-xl font-semibold">Available Tools</h2>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-lg border p-4">
							<h3 className="mb-2 font-medium">Screenshot API</h3>
							<p className="mb-3 text-sm text-muted-foreground">
								High-performance screenshot service with caching, rate limiting, and multiple formats.
							</p>
							<div className="space-y-2 text-sm">
								<div><span className="font-medium">Formats:</span> PNG, JPEG, WebP</div>
								<div><span className="font-medium">Features:</span> Redis caching, element selection, image optimization</div>
								<div><span className="font-medium">Endpoint:</span> <code className="rounded bg-muted px-1">POST/GET /screenshot</code></div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
