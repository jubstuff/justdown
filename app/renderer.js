const marked = require( 'marked' );
const path = require( 'path' );

const {remote, ipcRenderer, shell} = require( 'electron' );
const {Menu} = remote;
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

const getDraggedFile = ( event ) => event.dataTransfer.items[0];
const getDroppedFile = ( event ) => event.dataTransfer.files[0];

const fileTypeIsSupported = ( file ) => {
	return ['text/plain', 'text/markdown'].includes( file.type );
};

const renderFile = ( file, content ) => {
	filePath = file;
	originalContent = content;

	markdownView.value = content;
	renderMarkdownToHtml( content );

	showFileButton.disabled = false;
	openInDefaultButton.disabled = false;

	updateUserInterface( false );
};

const showFile = () => {
	if ( ! filePath ) {
		return alert( 'This file has not been saved to the filesystem.' );
	}
	shell.showItemInFolder( filePath );
};

const openInDefaultApplication = () => {
	if ( ! filePath ) {
		return alert( 'This file has not been saved to the filesystem.' );
	}
	shell.openItem( filePath );
};

showFileButton.addEventListener( 'click', showFile );
openInDefaultButton.addEventListener( 'click', openInDefaultApplication );

markdownView.addEventListener( 'dragover', ( event ) => {
	const file = getDraggedFile( event );

	if ( fileTypeIsSupported( file ) ) {
		markdownView.classList.add( 'drag-over' );
	} else {
		markdownView.classList.add( 'drag-error' );
	}
} );

markdownView.addEventListener( 'dragleave', () => {
	markdownView.classList.remove( 'drag-over' );
	markdownView.classList.remove( 'drag-error' );
} );

markdownView.addEventListener( 'drop', ( event ) => {
	const file = getDroppedFile( event );

	if ( fileTypeIsSupported( file ) ) {
		mainProcess.openFile( currentWindow, file.path );
	} else {
		alert( 'That file type is not supported' );
	}

	markdownView.classList.remove( 'drag-over' );
	markdownView.classList.remove( 'drag-error' );
} );

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
	mainProcess.setDocumentEdited( currentWindow, isEdited );

	saveMarkdownButton.disabled = ! isEdited;
	revertButton.disabled = ! isEdited;
};

ipcRenderer.on( 'save-markdown', () => {
	mainProcess.saveMarkdown( currentWindow, filePath, markdownView.value );
} );

ipcRenderer.on( 'save-html', () => {
	mainProcess.saveHtml( currentWindow, filePath, markdownView.value );
} );

// read from the file-opened channel, opened in the main process
ipcRenderer.on( 'file-opened', ( event, file, content ) => {
	if ( mainProcess.isDocumentEdited( currentWindow ) ) {
		const result = remote.dialog.showMessageBox( currentWindow, {
			type: 'warning',
			title: 'Overwrite current unsaved changes?',
			message: 'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?',
			buttons: [
				'Yes',
				'Cancel'
			],
			defaultId: 0,
			cancelId: 1
		} );

		if ( result === 1 ) {
			return;
		}
	}

	renderFile( file, content );
} );

ipcRenderer.on( 'file-changed', ( event, file, content ) => {
	const result = remote.dialog.showMessageBox( currentWindow, {
		type: 'warning',
		title: 'Overwrite current unsaved changes?',
		message: 'Another application has changed this file. Load changes?',
		buttons: [
			'Yes',
			'Cancel'
		],
		defaultId: 0,
		cancelId: 1
	} );

	renderFile( file, content );
} );

ipcRenderer.on( 'show-file', showFile );
ipcRenderer.on( 'open-in-default', openInDefaultApplication );

saveHtmlButton.addEventListener( 'click', () => {
	mainProcess.saveHtml( currentWindow, htmlView.innerHTML );
} );

saveMarkdownButton.addEventListener( 'click', () => {
	mainProcess.saveMarkdown( currentWindow, filePath, markdownView.value );
} );

revertButton.addEventListener( 'click', () => {
	markdownView.value = originalContent;
	renderMarkdownToHtml( originalContent );
} );

document.addEventListener( 'dragstart', event => event.preventDefault() );
document.addEventListener( 'dragover', event => event.preventDefault() );
document.addEventListener( 'dragleave', event => event.preventDefault() );
document.addEventListener( 'drop', event => event.preventDefault() );

const markdownContextMenu = Menu.buildFromTemplate( [
	{
		label: 'Open File', click() {
			mainProcess.getFileFromUser();
		}
	},
	{type: 'separator'},
	{label: 'Cut', role: 'cut'},
	{label: 'Copy', role: 'copy'},
	{label: 'Paste', role: 'paste'},
	{label: 'Select All', role: 'selectall'},
] );

markdownView.addEventListener( 'contextmenu', ( event ) => {
	event.preventDefault();
	markdownContextMenu.popup();
} );