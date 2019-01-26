const {app, BrowserWindow, dialog} = require( 'electron' );

const fs = require( 'fs' );

let mainWindow = null;
const windows = new Set();

const createWindow = () => {
	let x, y;

	const currentWindow = BrowserWindow.getFocusedWindow();

	if ( currentWindow ) {
		const [currentWindowX, currentWindowY] = currentWindow.getPosition();
		x = currentWindowX + 10;
		y = currentWindowY + 10;
	}

	let newWindow = new BrowserWindow( {x, y, show: false} );

	newWindow.loadFile( './app/index.html' );

	newWindow.once( 'ready-to-show', () => {
		newWindow.show();
	} );

	newWindow.on( 'closed', () => {
		windows.delete( newWindow );
		newWindow = null;
	} );

	windows.add( newWindow );
	return newWindow;
};

app.on( 'ready', () => {
	createWindow();
} );

const getFileFromUser = ( targetWindow ) => {
	const files = dialog.showOpenDialog( targetWindow, {
		properties: ['openFile'],
		filters: [
			{name: 'Markdown Files', extensions: ['md', 'markdown']},
			{name: 'Text Files', extensions: ['txt']}
		]
	} );

	if ( files ) {
		openFile( targetWindow, files[0] );
	}
};

const openFile = ( targetWindow, file ) => {
	const content = fs.readFileSync( file ).toString();
	// open a 'file-opened' channel and send the file name and content.
	targetWindow.webContents.send( 'file-opened', file, content );
};

// Manage macOS behavior with all windows closed.
app.on( 'window-all-closed', () => {
	if ( process.platform === 'darwin' ) {
		return false;
	}
	app.quit();
} );

app.on( 'activate', ( event, hasVisibleWindows ) => {
	if ( ! hasVisibleWindows ) {
		createWindow();
	}
} );

// Exports
exports.getFileFromUser = getFileFromUser;
exports.createWindow = createWindow;
exports.openFile = openFile;