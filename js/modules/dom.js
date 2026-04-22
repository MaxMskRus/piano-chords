const DOM_IDS = [
  'actClose','actDown','actMode0','actMode1','actMode2','actUp','appToast','chordActDown','chordActMode0','chordActMode1','chordActMode2','chordActUp','chordFilterBar','chordModal','chordViewColor','chordViewGrid','chordViewModal','chordViewNormal','chordViewPiano','chordsList','clearAll','faqClose','faqModal','fullClose','fullGrid','fullModal','fullMode0','fullMode1','fullMode2','fullScreen','fullSmartInv','fullTransDown','fullTransUp','midiMode','midiStatus','mode0','mode1','mode2','openFaqTop','openImport','openSongs','printPdf','printTitle','saveSong','search','selectedChords','selectedGrid','smartInv','songName','songTextAdd','songTextAddSaved','songTextClose','songTextContent','songTextDown','songTextFind','songTextFull','songTextFullClose','songTextFullModal','songTextFullView','songTextInput','songTextModal','songTextMode0','songTextMode1','songTextMode2','songTextSave','songTextSmart','songTextSoftMode','songTextTitle','songTextUp','songTextView','songTextViewColor','songTextViewNormal','songTextViewPiano','songsClose','songsList','songsModal','toggleAllGroups','toggleColor','togglePiano','transDown','transUp'
  ,'langToggle'
];

function el(id) {
  return document.getElementById(id);
}

function resetDomCache() {
  return true;
}

function verifyRequiredDomIds() {
  const missing = DOM_IDS.filter((id) => !document.getElementById(id));
  if (missing.length) {
    throw new Error(`Missing DOM ids: ${missing.join(', ')}`);
  }
  return true;
}

export { DOM_IDS, el, resetDomCache, verifyRequiredDomIds };
