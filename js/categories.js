// Gedeelde categorieën en functies
const CATEGORIES = {
  'Convenant': 'Convenant',
  'Adviesstuk': 'Adviesstuk',
  'Adviescollege': 'Adviescollege',
  'Overige': 'Overige',
  '': 'Onbekend'
};

// Gedeelde statusopties
const STATUS_OPTIONS = {
  'concept': 'Concept',
  'in_afwachting': 'In afwachting',
  'gepubliceerd': 'Gepubliceerd',
  'gearchiveerd': 'Gearchiveerd'
};

// Functie om categorie-opties te renderen
function renderCategoryOptions(containerId, selectedCategory = '') {
  return renderOptions(containerId, 'category', CATEGORIES, selectedCategory);
}

// Functie om status-opties te renderen
function renderStatusOptions(containerId, selectedStatus = 'concept') {
  return renderOptions(containerId, 'status', STATUS_OPTIONS, selectedStatus);
}

// Algemene functie om opties te renderen
function renderOptions(containerId, name, options, selectedValue) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Object.entries(options)
    .map(([value, label]) => `
      <label>
        <input 
          type="radio" 
          name="${name}" 
          value="${value}" 
          ${value === selectedValue ? 'checked' : ''}>
        <span>${label}</span>
      </label>
    `)
    .join('\n');
  
  return container;
}

// Functie om de geselecteerde waarde op te halen
function getSelectedValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

// Functie om de categorie te valideren
function validateCategory(category) {
  return Object.keys(CATEGORIES).includes(category) ? category : '';
}

// Functie om de status te valideren
function validateStatus(status) {
  return Object.keys(STATUS_OPTIONS).includes(status) ? status : 'concept';
}

// Functie om de weergavetekst van een status op te halen
function getStatusDisplayText(status) {
  return STATUS_OPTIONS[status] || 'Onbekend';
}

// Functie om een status element bij te werken met de juiste klasse en tekst
function updateStatusElement(element, status) {
  if (!element) return;
  
  const validStatus = validateStatus(status);
  const displayText = getStatusDisplayText(validStatus);
  
  // Verwijder alle bestaande status-klassen
  element.className = 'status';
  
  // Voeg de juiste klasse toe
  element.classList.add(validStatus.toLowerCase().replace('_', '-'));
  
  // Update de tekst
  element.textContent = displayText;
  
  return element;
}
