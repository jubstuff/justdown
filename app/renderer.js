const marked = require( 'marked' );
const path = require( 'path' );

const {remote, ipcRenderer} = require( 'electron' );
// require the main process
const mainProcess = remote.require( './main.js' );

const markdownView = document.querySelector( '#markdown' );
const htmlView = document.querySelector( '#html' );
const newFileButton = document.querySelector( '#new-file' );
const openFileButton = document.querySelector( '#open-file' );
const saveMarkdownButton = document.querySelector( '#save-markdown' );
const revertButton = document.querySelector( '#revert' );
const saveHtmlButton = document.querySelector( '#save-html' );
const showFileButton = document.querySelector( '#show-file' );
const openInDefaultButton = document.querySelector( '#open-in-default' );

const currentWindow = remote.getCurrentWindow();

let filePath = null;
let originalContent = '';

const renderMarkdownToHtml = ( markdown ) => {
	htmlView.innerHTML = marked( markdown, {sanitize: true} );
};

markdownView.addEventListener( 'keyup', ( event ) => {
	const currentContent = event.target.value;
	renderMarkdownToHtml( currentContent );
	updateUserInterface( currentContent !== originalContent );
} );

openFileButton.addEventListener( 'click', ( event ) => {
	// We can call this, because we have `export`ed the getFileFromUser function in the main process.
	mainProcess.getFileFromUser( currentWindow );
} );

newFileButton.addEventListener( 'click', ( event ) => {
	mainProcess.createWindow();
} );

const updateUserInterface = ( isEdited ) => {
	let title = 'Justdown';
	if ( filePath ) {
		title = `${path.basename( filePath )} - ${title}`;
	}

	if ( isEdited ) {
		title = `${title} *`;
	}

	currentWindow.setTitle( title );
	currentWindow.setDocumentEdited( isEdited )
};

// read from the file-opened channel, opened in the main process
ipcRenderer.on( 'file-opened', ( event, file, content ) => {
	filePath = file;
	originalContent = content;

	markdownView.value = content;
	renderMarkdownToHtml( content );

	updateUserInterface();
} );