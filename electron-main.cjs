const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const distDirectory = path.join(__dirname, 'dist');
const contentTypes = {
	'.css': 'text/css',
	'.gif': 'image/gif',
	'.html': 'text/html',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.mp3': 'audio/mpeg',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.wasm': 'application/wasm',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

function startStaticServer() {
	return new Promise((resolve, reject) => {
		const server = http.createServer((request, response) => {
			let requestPath;
			try {
				requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
			} catch {
				response.writeHead(400);
				response.end('Bad request');
				return;
			}

			const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
			const filePath = path.resolve(distDirectory, relativePath);
			if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${path.sep}`)) {
				response.writeHead(403);
				response.end('Forbidden');
				return;
			}

			fs.stat(filePath, (error, stats) => {
				if (error || !stats.isFile()) {
					response.writeHead(404);
					response.end('Not found');
					return;
				}

				response.writeHead(200, {
					'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
				});
				fs.createReadStream(filePath).pipe(response);
			});
		});

		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => resolve(server));
	});
}

async function createWindow() {
	const server = await startStaticServer();
	const { port } = server.address();
	const window = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1024,
		minHeight: 640,
		backgroundColor: '#000000',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	window.loadURL(`http://127.0.0.1:${port}/index.html`);
	window.on('closed', () => server.close());
}

app.whenReady().then(async () => {
	await createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});