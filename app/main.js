const {app, BrowserWindow, dialog, Menu} = require( 'electron' );
const applicationMenu = require('./application-menu');
const fs = require( 'fs' );

let mainWindow = null;
const windows = new Set();
const openFiles = new Map();
const editedStore = new Map();

const setDocumentEdited = ( targetWindow, isEdited ) => {
	editedStore.set( targetWindow, isEdited );

	if ( process.platform === 'darwin' ) {
		// isDocumentEdited and setDocumentEdited are supported only on macOS.
		// https://electronjs.org/docs/api/browser-window#winsetdocumenteditededited-macos
		targetWindow.setDocumentEdited( isEdited );
	}

};

const isDocumentEdited = ( targetWindow ) => {
	if ( editedStore.has( targetWindow ) ) {
		return editedStore.get( targetWindow );
	}

	return false;
};

const stopWatchingFile = ( targetWindow ) => {
	if ( openFiles.has( targetWindow ) ) {
		openFiles.get( targetWindow ).close();
		openFiles.delete( targetWindow );
	}
};

const startWatchingFile = ( targetWindow, file ) => {
	stopWatchingFile( targetWindow );

	const watcher = fs.watch( file, ( event ) => {
		if ( event === 'change' ) {
			const content = fs.readFileSync( file );
			targetWindow.webContents.send( 'file-changed', file, content );
		}
	} );

	openFiles.set( targetWindow, watcher );
};


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
		stopWatchingFile( newWindow );
		newWindow = null;
	} );

	newWindow.on( 'close', ( event ) => {

		if ( isDocumentEdited( newWindow ) ) {
			event.preventDefault();

			const result = dialog.showMessageBox( newWindow, {
				type: 'warning',
				title: 'Quit with unsaved changes?',
				message: 'Your changes will be lost if you do not save.',
				buttons: [
					'Quit anyway',
					'Cancel'
				],
				defaultId: 0,
				cancelId: 1
			} );

			if ( result === 0 ) {
				newWindow.destroy();
			}
		}
	} );

	windows.add( newWindow );
	return newWindow;
};

app.on( 'ready', () => {
	Menu.setApplicationMenu(applicationMenu);
	createWindow();
} );

const saveHtml = ( targetWindow, content ) => {
	const file = dialog.showSaveDialog( targetWindow, {
		title: 'Save HTML',
		defaultPath: app.getPath( 'documents' ),
		filters: [
			{name: 'HTML Files', extensions: ['html', 'htm']}
		]
	} );

	if ( ! file ) {
		return;
	}

	fs.writeFileSync( file, content );
};

const saveMarkdown = ( targetWindow, file, content ) => {
	if ( ! file ) {
		file = dialog.showSaveDialog( targetWindow, {
			title: 'Save Markdown',
			defaultPath: app.getPath( 'documents' ),
			filters: [
				{name: 'Markdown files', extensions: ['md', 'markdown']}
			]
		} );
	}

	if ( ! file ) {
		return;
	}

	fs.writeFileSync( file, content );
	openFile( targetWindow, file );
};

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
	app.addRecentDocument( file );
	targetWindow.setRepresentedFilename( file );
	// open a 'file-opened' channel and send the file name and content.
	targetWindow.webContents.send( 'file-opened', file, content );
	startWatchingFile( targetWindow, file );
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

app.on( 'will-finish-launching', () => {
	app.on( 'open-file', ( event, file ) => {
		const win = createWindow();
		win.once( 'ready-to-show', () => {
			openFile( win, file );
		} )
	} );
} );

// Exports
exports.getFileFromUser = getFileFromUser;
exports.createWindow = createWindow;
exports.openFile = openFile;
exports.saveHtml = saveHtml;
exports.saveMarkdown = saveMarkdown;
exports.isDocumentEdited = isDocumentEdited;
exports.setDocumentEdited = setDocumentEdited;