const {app, BrowserWindow, dialog} = require( 'electron' );

const fs = require( 'fs' );

let mainWindow = null;

app.on( 'ready', () => {
	mainWindow = new BrowserWindow( {
		show: false,
	} );

	mainWindow.loadFile( './app/index.html' );

	mainWindow.once( 'ready-to-show', () => {
		mainWindow.show();
	} );

	mainWindow.on( 'closed', () => {
		mainWindow = null;
	} )
} );

const getFileFromUser = () => {
	const files = dialog.showOpenDialog( mainWindow, {
		properties: ['openFile'],
		filters: [
			{name: 'Markdown Files', extensions: ['md', 'markdown']},
			{name: 'Text Files', extensions: ['txt']}
		]
	} );

	if ( files ) {
		openFile( files[0] );
	}
};

const openFile = ( file ) => {
	const content = fs.readFileSync( file ).toString();
	// open a 'file-opened' channel and send the file name and content.
	mainWindow.webContents.send( 'file-opened', file, content );
};

// Exports
exports.getFileFromUser = getFileFromUser;