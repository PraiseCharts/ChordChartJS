import { normalize } from 'path';
import { ChordProParser, PdfFormatter, Configuration } from '../../../src';
import { getKeys, getCapos } from '../../../src/helpers';

import { chordproExamples } from './chordpro-examples';
import { configExamples } from './config-examples';
import { exampleSongSymbol, exampleSongSolfege } from '../../fixtures/song';

// Initialize CodeMirror instances
const editor = CodeMirror(document.getElementById('editor'), {
  mode: 'javascript',
  lineNumbers: true,
  value: '', // Empty initially
});
editor.setSize('100%', '46vh');

const configEditor = CodeMirror(document.getElementById('configEditor'), {
  mode: 'javascript',
  lineNumbers: true,
  value: '', // Empty initially
});
configEditor.setSize('100%', '46vh');

// Populate the dropdowns
const chordproSelect = document.getElementById('chordproSelect');
const configSelect = document.getElementById('configSelect');
const keySelect = document.getElementById('keySelect');
const capoSelect = document.getElementById('capoSelect');

// Add song objects to the examples
const allExamples = [
  ...chordproExamples,
  {
    name: '[TEST] Example Song Symbol',
    content: '',
    songObject: exampleSongSymbol
  },
  {
    name: '[TEST] Example Song Solfege',
    content: '',
    songObject: exampleSongSolfege
  }
];

function populateSelect(selectElement, options) {
  selectElement.innerHTML = '';
  options.forEach((option, index) => {
    const opt = document.createElement('option');
    opt.value = index; // Use index to reference the array
    opt.text = option.name;
    selectElement.add(opt);
  });
}

populateSelect(chordproSelect, allExamples);
populateSelect(configSelect, configExamples);

// Function to render PDF in an <iframe>
const renderPDFInBrowser = async (pdfBlob) => {
  const pdfContainer = document.getElementById('pdfViewer');
  pdfContainer.innerHTML = ''; // Clear previous content
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  const blobUrl = URL.createObjectURL(pdfBlob);
  iframe.src = blobUrl;
  pdfContainer.appendChild(iframe);
};

function initializeKeyAndCapoSelectors(songKey) {
  // Initialize key selector
  const keys = getKeys(songKey);
  keySelect.innerHTML = '';
  keys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    keySelect.appendChild(option);
  });
  keySelect.value = songKey;

  // Initialize capo selector
  const capoPositions = getCapos(songKey);
  capoSelect.innerHTML = '';

  // Add 'None' option first
  const noneOption = document.createElement('option');
  noneOption.value = 'none';
  noneOption.textContent = 'None';
  capoSelect.appendChild(noneOption);

  // Add capo positions with their resulting keys
  Object.entries(capoPositions).forEach(([position, resultingKey]) => {
    const option = document.createElement('option');
    option.value = position;
    option.textContent = `${position} (${resultingKey})`;
    capoSelect.appendChild(option);
  });
}

const updatePDF = async (key, capo) => {
  const selectedExampleIndex = parseInt(chordproSelect.value);
  const selectedExample = allExamples[selectedExampleIndex];
  const configText = configEditor.getValue();

  if (!configText.trim()) {
    return;
  }

  let configJson;
  try {
    configJson = JSON.parse(configText);
  } catch (e) {
    console.error('Invalid JSON in config editor:', e);
    return;
  }

  try {
    let song;

    // Check if this example is a pre-defined Song object
    if (selectedExample.songObject) {
      song = selectedExample.songObject;
      // Show the ChordPro representation in the editor (read-only)
      try {
        // This displays a basic representation of the song for reference
        const songTags = [];

        if (song.title) songTags.push(`{title: ${song.title}}`);
        if (song.key) songTags.push(`{key: ${song.key}}`);

        // Extract sections and content
        let displayContent = '';
        song.sections.forEach(section => {
          displayContent += `{start_of_${section.type}: ${section.name || ''}}\n`;
          section.lines.forEach(line => {
            const lineContent = line.items.map(item => {
              if (item.chords) return `[${item.chords}]${item.lyrics || ''}`;
              return item.lyrics || '';
            }).join('');
            displayContent += lineContent + '\n';
          });
          displayContent += `{end_of_${section.type}}\n\n`;
        });

        editor.setValue(songTags.join('\n') + '\n\n' + displayContent);
        editor.setOption('readOnly', true);
      } catch (e) {
        editor.setValue(`// Using pre-defined Song object: ${selectedExample.name}\n// Editor is read-only`);
        editor.setOption('readOnly', true);
      }
    } else {
      // Parse ChordPro content from editor
      const chordProText = editor.getValue();
      if (!chordProText.trim()) {
        return;
      }
      song = new ChordProParser().parse(chordProText, { softLineBreaks: true });
      editor.setOption('readOnly', false);
    }

    // If this is the first load or selectors haven't been initialized
    if (!keySelect.options.length && song.key) {
      initializeKeyAndCapoSelectors(song.key);
    }

    // Use either the provided key/capo or the current selector values
    const initialKey = key || (keySelect.value || song.key);
    const capoPosition = capo || capoSelect.value;

    // Set the key first if it exists
    if (initialKey && song.key) {
      song = song.changeKey(initialKey);
    }

    // Apply capo if it's not 'none'
    if (capoPosition !== 'none') {
      song = song.setCapo(parseInt(capoPosition));
    }

    const formatter = new PdfFormatter();
    const configuration = {
      key: initialKey,
      normalizeChords: true,
      useUnicodeModifiers: false,
    };
    formatter.format(song, configuration, configJson);
    const pdfBlob = await formatter.generatePDF();
    renderPDFInBrowser(pdfBlob);
  } catch (e) {
    console.log('⚠️ Error generating PDF:', e);
  }
};

// Function to load example (ChordPro text or Song object)
function loadExample(index) {
  const example = allExamples[index];

  // Update the editor content
  if (example.songObject) {
    // For Song objects, set a placeholder message
    editor.setValue(`// Using pre-defined Song object: ${example.name}\n// Editor is read-only`);
    editor.setOption('readOnly', true);
  } else {
    // For ChordPro text examples
    editor.setValue(example.content);
    editor.setOption('readOnly', false);
  }

  updatePDF();
}

// Function to load config example
function loadConfigExample(index) {
  const example = configExamples[index];
  const configString = JSON.stringify(example.content, null, 4);
  configEditor.setValue(configString);
  updatePDF();
}

// Event Listeners
keySelect.addEventListener('change', (e) => {
  const newKey = e.target.value;
  // Reinitialize both selectors for the new key
  initializeKeyAndCapoSelectors(newKey);
  updatePDF(newKey, capoSelect.value);
});

capoSelect.addEventListener('change', (e) => {
  updatePDF(keySelect.value, e.target.value);
});


chordproSelect.addEventListener('change', () => {
  loadExample(chordproSelect.value);
});

configSelect.addEventListener('change', () => {
  loadConfigExample(configSelect.value);
});

editor.on('change', () => {
  if (!editor.getOption('readOnly')) {
    updatePDF();
  }
});

configEditor.on('change', () => {
  updatePDF();
});

// Initialize the application
function initialize() {
  // Set default selections
  chordproSelect.value = 0;
  configSelect.value = 0;

  // Initial loading of examples
  loadExample(chordproSelect.value);
  loadConfigExample(configSelect.value);
}

document.addEventListener('DOMContentLoaded', initialize);
