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
		getFileFromUser();
	} );

	mainWindow.on( 'closed', () => {
		mainWindow = null;
	} )
} );

const getFileFromUser = () => {
	const files = dialog.showOpenDialog( {
		properties: ['openFile'],
		filters: [
			{name: 'Text Files', extensions: ['txt']},
			{name: 'Markdown Files', extensions: ['md', 'markdown']}
		]
	} );

	if ( ! files ) {
		return;
	}

	const file = files[0];
	const content = fs.readFileSync( file ).toString();

	console.log( content );
};